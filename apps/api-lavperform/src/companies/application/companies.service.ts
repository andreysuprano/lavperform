import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, Inject } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { HttpService } from '@nestjs/axios';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AsaasService } from 'src/integrations/asaas/api/asaas.service';
import { PutCardDto } from 'src/integrations/asaas/dto/put-card.dto';
import { OpeningHoursDto } from './dto/opening-hours.dto';
import { CompanyStatus } from '@prisma/client';
import { ICompanyRepository } from '../domain/company.repository.interface';
import { IDigitalMenuIntegrationRepository } from '../../partners/domain/digital-menu-integration.repository.interface';
import { AiAgentService } from '../../ai-agent/application/ai-agent.service';
import { RfvEngineService } from '../../rfv-engine/application/rfv-engine.service';
import { RenitencyService } from '../../renitency/application/renitency.service';
import { ImportOrderHistoryDto } from './dto/import-order-history.dto';
import { ImportHistoryResult } from 'src/integrations/import-history-strategy.interface';
import { ImportHistoryStrategyFactory } from 'src/integrations/import-history-strategy.factory';

@Injectable()
export class CompaniesService {
  private readonly logger: Logger;

  constructor(
    @Inject('ICompanyRepository')
    private readonly companyRepository: ICompanyRepository,
    @Inject('IDigitalMenuIntegrationRepository')
    private readonly digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    private readonly httpService: HttpService,
    private readonly aiAgentService: AiAgentService,
    private readonly rfvEngineService: RfvEngineService,
    private readonly renitencyService: RenitencyService,
    private readonly importHistoryStrategyFactory: ImportHistoryStrategyFactory,
  ) {
    this.logger = new Logger(CompaniesService.name);
  }

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      const existingCompany = await this.companyRepository.findByCnpj(createCompanyDto.cnpj);

      if (existingCompany) {
        throw new BadRequestException('Já existe uma empresa cadastrada com este CNPJ');
      }

      const { zipCode, street, number, complement, neighborhood, city, state, businessPartnerId, ...companyData } = createCompanyDto;

      const createdCompany = await this.companyRepository.createWithAddress(
        { ...companyData, businessPartnerId: businessPartnerId || null },
        { zipCode, street, number, complement, neighborhood, city, state }
      );

      // Provisiona a empresa no over-agent-api para gerenciamento de agentes de IA
      try {
        await this.aiAgentService.provisionCompany(createdCompany.id);
        this.logger.log(`Empresa ${createdCompany.id} provisionada no over-agent-api`);
      } catch (agentError) {
        this.logger.warn(`Não foi possível provisionar empresa no over-agent-api: ${agentError?.message || agentError}`);
      }

      // Cria configuração RFV padrão para a nova empresa
      try {
        await this.rfvEngineService.createDefaultConfiguration(createdCompany.id);
        this.logger.log(`Configuração RFV padrão criada para empresa: ${createdCompany.id}`);
      } catch (rfvError) {
        this.logger.warn(`Não foi possível criar configuração RFV padrão: ${rfvError?.message || rfvError}`);
      }

      try {
        await this.renitencyService.createDefaultConfiguration(createdCompany.id);
        this.logger.log(`Configuração de renitência padrão criada para empresa: ${createdCompany.id}`);
      } catch (renitencyError) {
        this.logger.warn(`Não foi possível criar configuração de renitência padrão: ${renitencyError?.message || renitencyError}`);
      }

      return createdCompany;
    } catch (error) {
      require('fs').appendFileSync('debug_log.txt', 'Error in create company: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)) + '\n');
      throw error;
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { items, total } = await this.companyRepository.findAllWithFilters(paginationDto);
    const { page = 1, limit = 100 } = paginationDto;

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);

    const { address, ...updateData } = updateCompanyDto;

    return this.companyRepository.update(id, {
      ...updateData,
      address: address
    });
  }

  async updateCompanyState(id: string, state: CompanyStatus) {
    return this.companyRepository.updateState(id, state);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.companyRepository.softDelete(id);
  }

  async updateAvatar(id: string, updateAvatarDto: UpdateAvatarDto) {
    const company = await this.findOne(id);
    return this.companyRepository.updateAvatar(id, updateAvatarDto.avatar);
  }

  async getCompanyIntegration(companyId: string) {
    try {
      return await this.digitalMenuIntegrationRepository.findByCompanyId(companyId);
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async importCompanyOrdersHistory(
    companyId: string,
    importDto: ImportOrderHistoryDto = {},
  ): Promise<ImportHistoryResult> {
    const integration = await this.getCompanyIntegration(companyId);

    if (!integration) {
      throw new NotFoundException('Integração não configurada');
    }

    if (!integration.apiKey) {
      throw new NotFoundException('Integração não configurada: API Key ausente');
    }

    const partnerSlug = integration.partner?.partnerSlug;

    if (!partnerSlug) {
      throw new NotFoundException('Integração não configurada: parceiro sem identificador');
    }

    const strategy = this.importHistoryStrategyFactory.resolve(partnerSlug);

    if (!strategy) {
      throw new NotFoundException(
        `Integração não configurada: parceiro "${partnerSlug}" não possui estratégia de importação`,
      );
    }

    this.logger.log(
      `Iniciando importação de histórico via estratégia "${partnerSlug}" para empresa ${companyId}`,
    );

    return strategy.execute(companyId, integration, importDto);
  }

  async findSubscription(id: string) {
    const company = await this.companyRepository.findWithSubscriptions(id);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    if (!company.companySubscriptions || company.companySubscriptions.length === 0) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    const companySubscription = company.companySubscriptions[0];

    // Para planos gratuitos sem subscriptionId
    if (!companySubscription.subscriptionId) {
      return {
        internal: companySubscription,
        asaas: null,
      };
    }

    const asaasService = new AsaasService(this.httpService);
    const subscription = await asaasService.getSubscriptionDetails(companySubscription.subscriptionId);

    return {
      internal: companySubscription,
      asaas: subscription,
    };
  }

  async findSubscriptionPayments(id: string) {
    const company = await this.companyRepository.findWithSubscriptions(id);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!company.companySubscriptions || company.companySubscriptions.length === 0) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    const companySubscription = company.companySubscriptions[0];

    // Para planos gratuitos sem subscriptionId
    if (!companySubscription.subscriptionId) {
      return {
        data: [],
        totalCount: 0,
        hasMore: false,
      };
    }

    const asaasService = new AsaasService(this.httpService);
    const payments = await asaasService.getSubscriptionPayments(companySubscription.subscriptionId);

    return payments;
  }

  async findPaymentMethodInfo(companyId: string, paymentId: string) {
    const company = await this.companyRepository.findWithSubscriptions(companyId);

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!company.companySubscriptions?.length) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    const plan = company.companySubscriptions[0].plan;

    if (!plan?.allowBoleto && !plan?.allowPix) {
      throw new ForbiddenException(
        'Este plano não permite pagamento por boleto ou Pix',
      );
    }

    const asaasService = new AsaasService(this.httpService);
    const barcode = plan.allowBoleto
      ? await asaasService.getPaymentBarCode(paymentId)
      : null;
    const pixQrCode = plan.allowPix
      ? await asaasService.getPaymentPixQrCode(paymentId)
      : null;

    return {
      barcode,
      pixQrCode,
    };
  }

  async putCreditCardSubscription(id: string, cardData: PutCardDto) {
    try {
      const company = await this.companyRepository.findWithSubscriptions(id);

      if (!company) {
        throw new NotFoundException('Empresa não encontrada');
      }

      if (!company.companySubscriptions || company.companySubscriptions.length === 0) {
        throw new NotFoundException('Assinatura não encontrada');
      }

      const companySubscription = company.companySubscriptions[0];

      // Para planos gratuitos sem subscriptionId
      if (!companySubscription.subscriptionId) {
        throw new BadRequestException('Não é possível adicionar cartão de crédito a um plano gratuito');
      }

      const asaasService = new AsaasService(this.httpService);

      await asaasService.putSubscriptionBillingType(companySubscription.subscriptionId, 'CREDIT_CARD');

      console.log('putCardDto: ', cardData);
      const response = await asaasService.putCreditCardInSubscription(companySubscription.subscriptionId, cardData);

      return response;
    } catch (error) {
      this.logger.error(error);
      return {
        message: 'Erro ao adicionar cartão de crédito à assinatura',
        error: error.message,
      };
    }
  }

  async findOpeningHours(id: string) {
    return this.companyRepository.findOpeningHours(id);
  }

  async createOpeningHours(id: string, createOpeningHoursDto: OpeningHoursDto) {
    await this.companyRepository.saveOpeningHours(id, createOpeningHoursDto.openingHours);
    return {
      message: 'Horários de funcionamento criados com sucesso',
    };
  }

  async updateOpeningHours(id: string, updateOpeningHoursDto: OpeningHoursDto) {
    const existingOpeningHours = await this.companyRepository.findOpeningHours(id);

    if (existingOpeningHours.length === 0) {
      await this.companyRepository.saveOpeningHours(id, updateOpeningHoursDto.openingHours);
    } else {
      await this.companyRepository.updateOpeningHours(id, updateOpeningHoursDto.openingHours);
    }

    return {
      message: 'Horários de funcionamento atualizados com sucesso',
    };
  }

  async listCompanyUsers(id: string) {
    return this.companyRepository.listCompanyUsers(id);
  }
}