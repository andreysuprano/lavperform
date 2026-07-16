import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { VmLavService } from '../api/vmlav.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { VmLavSale } from '../api/vmlav.types';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { IDigitalMenuIntegrationRepository } from '../../../partners/domain/digital-menu-integration.repository.interface';
import { CustomersService } from '../../../customers/application/customers.service';
import { Customer } from '../../../customers/domain/customer.entity';
import { OrderService } from '../../../orders/application/order.service';
import { formatPhoneNumber } from '../../../common/utils/formatters';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';
import {
  buildUtcDateOnlyRange,
  resolveImportDateRange,
} from '../../import-date-range.util';
import { DigitalMenuIntegration } from '../../../partners/domain/digital-menu-integration.entity';
import { VmLavSaleMapping } from '../mappings/vmlav-sale-mapping';
import {
  VmLavCustomerMapping,
  cpfPhonePlaceholder,
  digitsOnly,
  normalizeVmLavPhone,
  resolveVmLavCustomerPhone,
  VMLAV_CPF_PHONE_PREFIX,
} from '../mappings/vmlav-customer-mapping';
import { ImportHistoricalSalesDto } from './dto/import-historical-sales.dto';

@Injectable()
export class VmLavSalesService {
  private readonly logger = new Logger(VmLavSalesService.name);

  constructor(
    private readonly vmLavService: VmLavService,
    private readonly prisma: PrismaService,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly customersService: CustomersService,
    private readonly orderService: OrderService,
    @InjectQueue(QUEUE_NAMES.VMLAV_SALES_IMPORT)
    private readonly vmLavSalesQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VMLAV_SALE_PROCESS)
    private readonly vmLavSaleProcessQueue: Queue,
  ) {}

  /**
   * Processa as vendas do dia para uma empresa específica
   * Busca as vendas na API e adiciona cada uma na fila para processamento
   * @param companyId - ID da empresa
   * @param date - Data das vendas no formato ISO (YYYY-MM-DD)
   */
  async processDailySales(companyId: string, date: string): Promise<void> {
    try {
      this.logger.log(
        `Iniciando processamento de vendas para empresa ${companyId} - ${date}`,
      );

      // Busca a empresa no banco
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new Error(`Empresa ${companyId} não encontrada`);
      }

      // Busca partner VM Lav pelo slug
      const partner = await this.prisma.partner.findUnique({
        where: { partnerSlug: 'VMLAV' },
      });

      if (!partner) {
        throw new Error('Partner VMLAV não encontrado no sistema');
      }

      // Busca integração VM Lav da empresa
      const integration = await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
        companyId,
        partner.id,
      );

      if (!integration) {
        this.logger.warn(`Integração VM Lav não encontrada para empresa ${companyId}`);
        return;
      }

      if (!integration.apiKey) {
        this.logger.warn(`API Key não configurada para empresa ${companyId}`);
        return;
      }

      if (!company.cnpj) {
        this.logger.warn(`CNPJ não configurado para empresa ${companyId}`);
        return;
      }

      this.logger.log(`Integração encontrada. Buscando vendas na API...`);

      // Busca vendas do dia na API VM Lav
      const sales = await this.vmLavService.getDailySales(
        integration.apiKey,
        company.cnpj,
        date,
      );

      this.logger.log(
        `Encontradas ${sales.length} vendas para processar`,
      );

      // Adiciona cada venda na fila para processamento individual
      for (const sale of sales) {
        await this.vmLavSaleProcessQueue.add(
          QUEUE_NAMES.VMLAV_SALE_PROCESS,
          {
            companyId,
            sale,
            apiKey: integration.apiKey,
            cnpj: company.cnpj,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        );
      }

      this.logger.log(
        `${sales.length} vendas adicionadas à fila de processamento para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar vendas para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Processa uma venda individual e salva os dados do cliente e pedido
   * @param companyId - ID da empresa
   * @param sale - Dados da venda
   * @param apiKey - API Key para buscar dados adicionais (opcional)
   */
  async processSale(companyId: string, sale: VmLavSale, apiKey?: string): Promise<void> {
    try {
      this.logger.log(`Processando venda ${sale.idVenda} - Cliente: ${sale.nomeCliente}`);

      const rawPhone = normalizeVmLavPhone(sale.telefoneCliente);
      const cpfDigits = digitsOnly(sale.cpfCliente);

      if (rawPhone.length === 0 && cpfDigits.length === 0) {
        this.logger.warn(
          `Venda ${sale.idVenda} sem telefone e sem CPF do cliente, ignorando`,
        );
        return;
      }

      let customer: Customer | null = null;

      if (rawPhone.length > 0) {
        const phoneFormatted = formatPhoneNumber(rawPhone);
        customer = await this.customersService.findByPhone(companyId, phoneFormatted);
      }

      if (!customer && cpfDigits.length > 0) {
        customer = await this.customersService.findByCpf(companyId, cpfDigits);
      }

      if (!customer && cpfDigits.length > 0 && rawPhone.length === 0) {
        customer = await this.customersService.findByPhone(
          companyId,
          cpfPhonePlaceholder(cpfDigits),
        );
      }

      if (!customer) {
        this.logger.log(`Cliente não encontrado, buscando dados completos na API...`);

        // Tenta buscar dados detalhados do cliente na API se tiver CPF e API Key
        let customerData: any = null;
        if (sale.cpfCliente && apiKey) {
          const customerDetail = await this.vmLavService.getCustomerByCpf(apiKey, sale.cpfCliente);
          
          if (customerDetail) {
            this.logger.log(`Dados detalhados do cliente encontrados na API: ${customerDetail.nome}`);
            this.logger.log(`  - Data Cadastro (dataCadastro): ${customerDetail.dataCadastro}`);
            this.logger.log(`  - Primeira Compra (primeiraCompra): ${customerDetail.primeiraCompra}`);
            customerData = VmLavCustomerMapping.toCreateCustomerDto(customerDetail);
          } else {
            this.logger.log(`Dados detalhados não encontrados na API, usando dados da venda`);
          }
        }

        // Se não conseguiu buscar dados detalhados, usa os dados da venda
        if (!customerData) {
          this.logger.log(`Usando dados da venda como fallback (sem dataCadastro disponível na venda)`);
          const saleDate = parseUTCDate(sale.data);
          const phone = resolveVmLavCustomerPhone(sale.telefoneCliente, sale.cpfCliente);
          customerData = {
            name: sale.nomeCliente,
            phone,
            email: sale.emailCliente || undefined,
            cpf: cpfDigits.length > 0 ? cpfDigits : undefined,
            birthDate: sale.dtaNascimento || undefined,
            firstOrderDate: saleDate ? toDateOnlyString(saleDate) : undefined,
            createdAt: saleDate,
          };
          this.logger.log(`  - Usando data da venda como createdAt/firstOrderDate: ${sale.data} -> ${saleDate?.toISOString()}`);
        }

        this.logger.log(`Criando novo cliente: ${customerData.name}`);

        // Cria novo cliente
        customer = await this.customersService.create(companyId, customerData);

        this.logger.log(`Cliente criado com sucesso: ${customer.id}`);
      } else {
        this.logger.log(`Cliente já existe: ${customer.id} - ${customer.name}`);

        const shouldUpgradePhone =
          rawPhone.length > 0 &&
          typeof customer.phone === 'string' &&
          customer.phone.startsWith(VMLAV_CPF_PHONE_PREFIX);

        // Atualiza informações do cliente se necessário
        const needsUpdate =
          shouldUpgradePhone ||
          (sale.emailCliente && !customer.email) ||
          (sale.cpfCliente && !customer.cpf) ||
          (sale.dtaNascimento && !customer.birthDate);

        if (needsUpdate) {
          this.logger.log(`Atualizando informações do cliente ${customer.id}`);

          // Se tiver CPF e API Key, busca dados detalhados para atualização mais completa
          let updateData: any = null;
          if (sale.cpfCliente && apiKey && !customer.cpf) {
            const customerDetail = await this.vmLavService.getCustomerByCpf(apiKey, sale.cpfCliente);
            
            if (customerDetail) {
              this.logger.log(`Usando dados detalhados da API para atualização`);
              updateData = VmLavCustomerMapping.toUpdateData(
                customerDetail,
                customer.phone,
              );
            }
          }

          // Se não conseguiu buscar dados detalhados, usa os dados da venda
          if (!updateData) {
            updateData = {
              email: sale.emailCliente || customer.email || undefined,
              cpf: cpfDigits.length > 0 ? cpfDigits : customer.cpf || undefined,
              birthDate: sale.dtaNascimento || undefined,
            };
          }

          if (shouldUpgradePhone) {
            updateData.phone = formatPhoneNumber(rawPhone);
          }

          await this.customersService.update(companyId, customer.id, updateData);

          this.logger.log(`Cliente ${customer.id} atualizado com sucesso`);
        }
      }

      // Verifica se o pedido já existe
      const existingOrder = await this.orderService.findByIntegratorOrderId(
        companyId,
        sale.idVenda,
      );

      if (existingOrder) {
        // Valida também se o displayId do pedido existente corresponde à venda atual
        if (existingOrder.displayId !== sale.idVenda) {
          this.logger.warn(
            `Inconsistência encontrada ao processar venda ${sale.idVenda}: ` +
              `pedido ${existingOrder.id} possui displayId ${existingOrder.displayId}, ` +
              `diferente do esperado (${sale.idVenda}).`,
          );
        } else {
          this.logger.log(`Pedido ${sale.idVenda} já existe com displayId correspondente, ignorando`);
        }
        return;
      }

      // Cria o pedido usando o mapping
      this.logger.log(`Criando pedido para venda ${sale.idVenda}`);

      const orderData = VmLavSaleMapping.toOrder(sale, customer.id, companyId);
      const { integratorOrderId, items, discounts, payments, deliveryAddress, schedule, ...orderCreateData } = orderData;

      const saleDate = parseUTCDate(sale.data);
      this.logger.log(`  - Data da venda: ${sale.data} -> ${saleDate?.toISOString()}`);

      const order = await this.orderService.create({
        ...orderCreateData,
        createdAt: saleDate!,
        updatedAt: saleDate!,
        items,
        discounts,
        payments,
        deliveryAddress,
        schedule,
      });

      this.logger.log(`Pedido ${order.id} criado com sucesso para venda ${sale.idVenda}`);
      this.logger.log(`Venda ${sale.idVenda} processada com sucesso para cliente ${customer.id}`);
    } catch (error) {
      this.logger.error(`Erro ao processar venda ${sale.idVenda}:`, error.message);
      throw error;
    }
  }

  /**
   * Importa vendas históricas retroativas (últimos 3 meses ou período customizado)
   * Útil para onboarding de novos clientes
   * @param companyId - ID da empresa
   * @param importDto - Dados da importação (datas opcionais)
   */
  async importHistoricalSales(
    companyId: string,
    importDto: ImportHistoricalSalesDto,
    existingIntegration?: DigitalMenuIntegration,
  ): Promise<{
    message: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    jobsCreated: number;
  }> {
    try {
      this.logger.log(
        `Iniciando importação histórica de vendas para empresa ${companyId}`,
      );

      let integration = existingIntegration;

      if (!integration) {
        const company = await this.prisma.company.findUnique({
          where: { id: companyId },
        });

        if (!company) {
          throw new NotFoundException(`Empresa ${companyId} não encontrada`);
        }

        const partner = await this.prisma.partner.findUnique({
          where: { partnerSlug: 'VMLAV' },
        });

        if (!partner) {
          throw new NotFoundException('Partner VMLAV não encontrado no sistema');
        }

        integration =
          (await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(
            companyId,
            partner.id,
          )) ?? undefined;

        if (!integration) {
          throw new NotFoundException(
            `Integração VM Lav não encontrada para empresa ${companyId}`,
          );
        }
      }

      if (!integration.apiKey) {
        throw new NotFoundException(
          `API Key não configurada para empresa ${companyId}`,
        );
      }

      const { startDate, endDate } = resolveImportDateRange(importDto);

      this.logger.log(
        `Período de importação: ${toDateOnlyString(startDate)} até ${toDateOnlyString(endDate)}`,
      );

      const dates = buildUtcDateOnlyRange(startDate, endDate);

      this.logger.log(`Total de ${dates.length} dias para importar`);

      // Adiciona cada dia na fila para processamento
      let jobsCreated = 0;
      for (const date of dates) {
        await this.vmLavSalesQueue.add(
          QUEUE_NAMES.VMLAV_SALES_IMPORT,
          {
            companyId,
            date,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          },
        );
        jobsCreated++;
      }

      this.logger.log(
        `Importação histórica iniciada: ${jobsCreated} jobs criados para empresa ${companyId}`,
      );

      return {
        message: 'Importação histórica iniciada com sucesso',
        totalDays: dates.length,
        startDate: toDateOnlyString(startDate),
        endDate: toDateOnlyString(endDate),
        jobsCreated,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar importação histórica para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
