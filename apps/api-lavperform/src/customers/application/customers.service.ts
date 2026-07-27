import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { formatPhoneNumber } from '../../common/utils/formatters';
import {
  ALL_RFV_CLASSIFICATIONS,
  getIconBySegmentation,
  LEAD_ICON,
  LEAD_LABEL,
  LEAD_SEGMENTATION,
} from '../../common/utils/rfvClassification';
import { ICustomerRepository } from '../domain/customer.repository.interface';
import { IDigitalMenuIntegrationRepository } from 'src/partners/domain/digital-menu-integration.repository.interface';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @Inject('ICustomerRepository')
    private readonly customerRepository: ICustomerRepository,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    @InjectQueue(QUEUE_NAMES.CUSTOMERS_IMPORT) private readonly customersQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WHATSAPP_VALIDATION) private readonly whatsappValidationQueue: Queue,
  ) { }

  async create(companyId: string, createCustomerDto: CreateCustomerDto) {
    try {
      const incomingPhone = createCustomerDto.phone;
      let formattedPhone: string | undefined;

      if (incomingPhone !== undefined && incomingPhone !== null && String(incomingPhone).trim() !== '') {
        formattedPhone =
          typeof incomingPhone === 'string' && incomingPhone.startsWith('cpf:')
            ? incomingPhone
            : formatPhoneNumber(incomingPhone);
      }

      const { address, ...customerData } = createCustomerDto;

      const data: any = {
        ...customerData,
        phone: formattedPhone,
        companyId,
      };

      if (customerData.birthDate) {
        data.birthDate = new Date(customerData.birthDate);
      }

      if (customerData.firstOrderDate) {
        data.firstOrderDate = new Date(customerData.firstOrderDate);
      }

      const customer = address
        ? await this.customerRepository.createWithAddress(data, address)
        : await this.customerRepository.create(data);

      const isPlaceholderPhone =
        typeof customer.phone === 'string' && customer.phone.startsWith('cpf:');

      if (customer.phone && !isPlaceholderPhone) {
        try {
          await this.whatsappValidationQueue.add('validate', {
            customerId: customer.id,
            companyId,
            phone: customer.phone,
          });
        } catch (queueError: any) {
          this.logger.error(
            `Erro ao enfileirar validação de WhatsApp para customerId=${customer.id}: ${
              queueError?.message || queueError
            }`,
          );
        }
      }

      return customer;
    } catch (error: any) {
      if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
        throw new BadRequestException('Já existe um cliente cadastrado com este telefone nesta empresa');
      }
      throw new BadRequestException('Erro ao criar cliente: ' + error.message);
    }
  }

  async findAll(companyId: string, paginationDto: PaginationDto) {
    const result = await this.customerRepository.findAll({
      ...paginationDto,
      companyId,
    } as any);

    const items = 'items' in result ? result.items : result;
    const total = 'total' in result ? result.total : (items as any[]).length;

    const { page = 1, limit = 10 } = paginationDto;

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const customer = await this.customerRepository.findById(id);

    if (!customer || customer.companyId !== companyId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    return customer;
  }

  async findByPhone(companyId: string, phone: string) {
    return await this.customerRepository.findByPhone(companyId, phone);
  }

  async findByCpf(companyId: string, cpf: string) {
    return await this.customerRepository.findByCpf(companyId, cpf);
  }

  async update(companyId: string, id: string, updateCustomerDto: UpdateCustomerDto) {
    if (updateCustomerDto.phone) {
      updateCustomerDto.phone = formatPhoneNumber(updateCustomerDto.phone);
    }

    const customer = await this.customerRepository.findById(id);

    if (!customer || customer.companyId !== companyId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (updateCustomerDto.phone && updateCustomerDto.phone !== customer.phone) {
      const existingCustomer = await this.customerRepository.findByPhone(companyId, updateCustomerDto.phone);

      if (existingCustomer && existingCustomer.id !== id) {
        throw new BadRequestException('Já existe outro cliente cadastrado com este telefone nesta empresa');
      }
    }

    const { address, ...customerData } = updateCustomerDto;
    const data: any = { ...customerData };

    if (customerData.birthDate) {
      data.birthDate = new Date(customerData.birthDate);
    }
    if (customerData.firstOrderDate) {
      data.firstOrderDate = new Date(customerData.firstOrderDate);
    }

    if (address) {
      return await this.customerRepository.updateWithAddress(id, data, address);
    } else {
      return await this.customerRepository.update(id, data);
    }
  }

  async remove(companyId: string, id: string) {
    const customer = await this.customerRepository.findById(id);

    if (!customer || customer.companyId !== companyId) {
      throw new NotFoundException('Cliente não encontrado');
    }

    if (customer.addressId) {
      return await this.customerRepository.deleteWithAddress(id, customer.addressId);
    } else {
      await this.customerRepository.delete(id);
      return customer;
    }
  }

  async importCustomers(companyId: string, customersData: CreateCustomerDto[] | { customers: CreateCustomerDto[] }) {
    if (!customersData) {
      throw new BadRequestException('Nenhum dado de cliente fornecido para importação.');
    }

    const customers = Array.isArray(customersData)
      ? customersData
      : (customersData as any)?.customers || [];

    const jobs = customers.map((customer) => ({
      companyId,
      customer,
    }));

    await this.customersQueue.addBulk(
      jobs.map((job) => ({
        name: 'import',
        data: job,
      })),
    );

    return {
      message: 'Importação iniciada com sucesso',
      totalCustomers: customers.length,
    };
  }

  async getTopBuyers(
    companyId: string,
    options: {
      limit?: number;
      sortBy?: 'totalSpent' | 'orderCount';
      startDate?: string;
      endDate?: string;
    } = {},
  ) {
    const limit = options.limit ?? 10;
    const sortBy = options.sortBy ?? 'totalSpent';
    const startDate = options.startDate ? new Date(options.startDate) : undefined;
    const endDate = options.endDate ? new Date(options.endDate) : undefined;

    const items = await this.customerRepository.getTopBuyers(companyId, {
      limit,
      sortBy,
      startDate,
      endDate,
    });

    return { items };
  }

  async totalCustomersBySegmentation(companyId: string) {
    const [rawCounts, leadCount] = await Promise.all([
      this.customerRepository.totalCustomersBySegmentation(companyId),
      this.customerRepository.countLeadsByCompany(companyId),
    ]);

    const rfvSegments = ALL_RFV_CLASSIFICATIONS.map((segmentation) => {
      const found = rawCounts.find((c: any) => c.rfvClassification === segmentation);
      const count = found ? found._count._all : 0;
      const icon = getIconBySegmentation(segmentation) || '';
      return {
        segmentation,
        count,
        icon,
        label: segmentation.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()),
      };
    });

    return [
      ...rfvSegments,
      {
        segmentation: LEAD_SEGMENTATION,
        count: leadCount,
        icon: LEAD_ICON,
        label: LEAD_LABEL,
      },
    ];
  }

  async getCustomerBehavior(customerId: string) {
    const lifeTimeValue = await this.customerRepository.getLifeTimeValueByCustomer(customerId);
    const totalOrders = await this.customerRepository.getTotalOrdersByCustomer(customerId);
    const averageTicket = lifeTimeValue / totalOrders;  
    const lastOrders = await this.customerRepository.getLastOrdersByCustomer(customerId);

    const lastOrdersWithDescriptions = await Promise.all(
      lastOrders.map(async order => {
        if (order.digitalMenuIntegrationId && order.digitalMenuIntegrationId !== '') {
          const digitalMenuIntegration = await this.digitalMenuIntegrationRepository.findById(order.digitalMenuIntegrationId);
          console.log("digitalMenuIntegration", digitalMenuIntegration);
          return {
            ...order,
            description: order.items.map(item => `${item.quantity}x ${item.name}`).join(', '),
            orderOrigin: {
              name: digitalMenuIntegration?.partner?.name,
              logoUrl: digitalMenuIntegration?.partner?.logoUrl,
            }
          };
        }
        return {
          ...order,
          description: order.items.map(item => `${item.quantity}x ${item.name}`).join(', '),
        };
      })
    );

    return {
      lifeTimeValue,
      totalOrders,
      averageTicket,
      lastOrders: lastOrdersWithDescriptions,
    };
  }

  async getLastMessagesSentToCustomer(customerId: string, paginationDto: PaginationDto) {
    const result = await this.customerRepository.getLastMessagesSentToCustomer(customerId, paginationDto);
    return result;
  }

  async enqueueWhatsappValidationForCompany(companyId: string) {
    const batchSize = 500;
    let skip = 0;
    let totalEnqueued = 0;

    while (true) {
      const customers = await this.customerRepository.findWhatsappValidationCandidates(
        companyId,
        skip,
        batchSize,
      );

      if (!customers.length) {
        break;
      }

      await this.whatsappValidationQueue.addBulk(
        customers.map((customer) => ({
          name: 'validate',
          data: {
            customerId: customer.id,
            companyId: customer.companyId,
            phone: customer.phone,
          },
        })),
      );

      totalEnqueued += customers.length;
      skip += batchSize;
    }

    return {
      message: 'Validação de WhatsApp enfileirada com sucesso',
      companyId,
      totalEnqueued,
    };
  }
}