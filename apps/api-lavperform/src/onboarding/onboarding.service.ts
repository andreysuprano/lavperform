import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompaniesService } from '../companies/application/companies.service';
import { OnboardingDto } from '../users/application/dto/onboarding.dto';
import * as bcrypt from 'bcrypt';
import { CreateBusinessPartnerDto, CreateDigitalMenuIntegrationDto, CreatePartnerDto } from './dto/digital-menu-integration';
import { slugfy } from 'src/common/utils/slugfy';
import { AsaasService } from 'src/integrations/asaas/api/asaas.service';
import { IUserRepository } from '../users/domain/user.repository.interface';
import { ICompanyRepository } from '../companies/domain/company.repository.interface';
import { ILinkPageRepository } from '../link-page/domain/link-page.repository.interface';
import { IPlanRepository } from '../plans/domain/plan.repository.interface';
import { ICompanySubscriptionRepository } from '../plans/domain/company-subscription.repository.interface';
import { IPartnerRepository } from '../partners/domain/partner.repository.interface';
import { IBusinessPartnerRepository } from '../partners/domain/business-partner.repository.interface';
import { IDigitalMenuIntegrationRepository } from '../partners/domain/digital-menu-integration.repository.interface';
import { IWeatherAlertRepository } from '../weather-alert/domain/weather-alert.repository.interface';
import { WeatherCondition } from '../weather-alert/domain/weather-alert.entity';
import { isWeatherAlertEnabled } from '../weather-alert/weather-alert.config';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingWithPaymentDto } from './dto/onboarding-with-payment.dto';
import { Plan } from '../plans/domain/plan.entity';
import { resolveSubscriptionBillingType } from '../plans/domain/resolve-subscription-billing-type';
import { PutCardDto } from '../integrations/asaas/dto/put-card.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    @Inject('ICompanyRepository') private companyRepository: ICompanyRepository,
    @Inject('ILinkPageRepository') private linkPageRepository: ILinkPageRepository,
    @Inject('IPlanRepository') private planRepository: IPlanRepository,
    @Inject('ICompanySubscriptionRepository') private companySubscriptionRepository: ICompanySubscriptionRepository,
    @Inject('IPartnerRepository') private partnerRepository: IPartnerRepository,
    @Inject('IBusinessPartnerRepository') private businessPartnerRepository: IBusinessPartnerRepository,
    @Inject('IDigitalMenuIntegrationRepository') private digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository,
    @Inject('IWeatherAlertRepository') private weatherAlertRepository: IWeatherAlertRepository,
    private companiesService: CompaniesService,
    private asaasService: AsaasService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) { }

  async getSubscriptionPlan() {
    const plan = await this.resolveSelfCheckoutPlan();
    return plan;
  }

  async createWithPayment(onboardingDto: OnboardingWithPaymentDto, remoteIp: string) {
    const plan = await this.resolveSelfCheckoutPlan();
    const { creditCard, creditCardHolderInfo, planId: _planId, ...baseOnboardingDto } = onboardingDto;

    const result = await this.create({
      ...baseOnboardingDto,
      planId: plan.id,
    }, {
      billingType: 'CREDIT_CARD',
      creditCard,
      creditCardHolderInfo,
      remoteIp,
    });

    return result;
  }

  private async resolveSelfCheckoutPlan(): Promise<Plan> {
    const plan = await this.planRepository.findSelfCheckoutPlan();

    if (!plan) {
      throw new BadRequestException(
        'Nenhum plano configurado para self checkout. Marque um plano ativo com a flag isSelfCheckout.',
      );
    }

    return plan;
  }

  private isPaymentConfirmed(status?: string): boolean {
    return ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status ?? '');
  }

  private formatAsaasDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async create(
    onboardingDto: OnboardingDto,
    paymentOptions?: {
      billingType: 'UNDEFINED' | 'CREDIT_CARD';
      creditCard?: PutCardDto['creditCard'];
      creditCardHolderInfo?: PutCardDto['creditCardHolderInfo'];
      remoteIp?: string;
    },
  ) {
    const { company, planId, businessPartnerId, ...userData } = onboardingDto;

    // Verifica se já existe um usuário com o email
    const existingUser = await this.userRepository.findByEmail(userData.email);

    if (existingUser) {
      throw new BadRequestException('Já existe um usuário cadastrado com este email');
    }

    // Verifica se já existe uma empresa com o CNPJ
    const existingCompanyCnpj = await this.companyRepository.findByCnpj(company.cnpj);

    if (existingCompanyCnpj) {
      throw new BadRequestException('Já existe uma empresa cadastrada com este CNPJ');
    }

    try {

      var slug = slugfy(company.name);

      const existingCompanySlug = await this.companyRepository.findBySlug(slug);

      if (existingCompanySlug) {
        slug = slug + '-' + company.neighborhood.split(' ')[0].toLowerCase();
      }

      // Cria a empresa
      const createdCompany = await this.companiesService.create({
        ...company,
        slug,
        businessPartnerId: businessPartnerId || undefined,
      });

      let user;
      let linkPage;

      try {
        // Cria o usuário vinculado à empresa
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        user = await this.userRepository.create({
          ...userData,
          password: hashedPassword,
          userCompanies: {
            create: {
              companyId: createdCompany.id,
            },
          },
        } as any);

        // Cria estrutura default de links
        linkPage = await this.linkPageRepository.create({
          companyId: createdCompany.id,
          coverImage: "https://firebasestorage.googleapis.com/v0/b/overfood-foodcrm.firebasestorage.app/o/institucional%2Frestaurant.jpg?alt=media&token=664b1f50-e6df-494a-99c1-7472e31fe094",
        });

        // Vincula o Admin ao company (se ADMIN_USER_ID estiver configurado)
        const adminUserId = this.configService.get<string>('ADMIN_USER_ID');
        if (adminUserId) {
          try {
            await this.prisma.userCompany.create({
              data: {
                userId: adminUserId,
                companyId: createdCompany.id,
              },
            });
            this.logger.log(`Admin vinculado à empresa: ${createdCompany.id}`);
          } catch (error) {
            // Se já existir ou houver erro, apenas loga mas não interrompe o onboarding
            this.logger.warn(`Não foi possível vincular admin à empresa: ${error.message}`);
          }
        }

        // Cria WeatherAlert desabilitado por padrão (somente se a feature estiver habilitada)
        if (isWeatherAlertEnabled(this.configService)) {
          try {
            await this.weatherAlertRepository.create({
              companyId: createdCompany.id,
              condition: WeatherCondition.RAINING,
              daysOfWeek: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'],
              dailyAlerts: 1,
              active: false,
            });
            this.logger.log(`WeatherAlert criado para empresa: ${createdCompany.id}`);
          } catch (error) {
            // Se houver erro, apenas loga mas não interrompe o onboarding
            this.logger.warn(`Não foi possível criar WeatherAlert: ${error.message}`);
          }
        } else {
          this.logger.log('Funcionalidade de weather alert desabilitada via WEATHER_ALERT_ENABLED, pulando criação no onboarding');
        }

        console.log(user.phone.replace(/\D/g, ''));

        const plan = await this.planRepository.findById(planId);

        if (!plan) {
          throw new BadRequestException('Plano não encontrado');
        }

        // Verifica se o plano tem valor maior que 0 para criar cliente e assinatura no ASAAS
        if (Number(plan.price) > 0) {
          // Cria o cliente no ASAAS
          const customer = await this.asaasService.createCustomer({
            name: user.name,
            cpfCnpj: company.cnpj,
            email: user.email,
            // phone: user.phone.replace(/\D/g, ''),
            address: `${createdCompany.address?.street}, ${createdCompany.address?.number} - ${createdCompany.address?.neighborhood} - ${createdCompany.address?.city} - ${createdCompany.address?.state}`,
            province: createdCompany.address?.state || '',
            postalCode: createdCompany.address?.zipCode || '',
            mobilePhone: user.phone.replace(/\D/g, ''),
            addressNumber: createdCompany.address?.number || '',
            complement: createdCompany.address?.complement || '',
            company: createdCompany.name,
          });

          await this.prisma.company.update({
            where: { id: createdCompany.id },
            data: { asaasCustomerId: customer.id },
          });

          const billingType =
            paymentOptions?.billingType ??
            resolveSubscriptionBillingType(plan, {
              hasCreditCard: Boolean(paymentOptions?.creditCard),
            });
          const nextDueDate =
            billingType === 'CREDIT_CARD'
              ? this.formatAsaasDate(new Date())
              : new Date().toISOString();

          const subscriptionPayload: Parameters<AsaasService['createSubscription']>[0] = {
            billingType,
            cycle: plan.cycle,
            value: Number(plan.price),
            customer: customer.id,
            nextDueDate,
            description: plan.description,
            maxPayments: plan.maxPayments,
          };

          if (billingType === 'CREDIT_CARD' && paymentOptions?.creditCard) {
            subscriptionPayload.creditCard = {
              holderName: paymentOptions.creditCard.holderName,
              number: paymentOptions.creditCard.number.replace(/\s/g, ''),
              expiryMonth: paymentOptions.creditCard.expiryMonth,
              expiryYear: paymentOptions.creditCard.expiryYear,
              ccv: paymentOptions.creditCard.ccv,
            };
            subscriptionPayload.creditCardHolderInfo = {
              name: paymentOptions.creditCardHolderInfo!.name,
              email: paymentOptions.creditCardHolderInfo!.email,
              cpfCnpj: paymentOptions.creditCardHolderInfo!.cpfCnpj.replace(/\D/g, ''),
              postalCode: paymentOptions.creditCardHolderInfo!.postalCode.replace(/\D/g, ''),
              addressNumber: paymentOptions.creditCardHolderInfo!.addressNumber,
              phone: paymentOptions.creditCardHolderInfo!.phone.replace(/\D/g, ''),
            };
            subscriptionPayload.remoteIp = paymentOptions.remoteIp;
          }

          // Cria a assinatura no ASAAS
          const subscription = await this.asaasService.createSubscription(subscriptionPayload);

          // Vincula a assinatura à empresa
          await this.companySubscriptionRepository.create({
            companyId: createdCompany.id,
            subscriptionId: subscription.id,
            planId
          });

          let payment: Record<string, unknown> | null = null;
          let accountActivated = false;

          if (billingType === 'CREDIT_CARD') {
            const paymentsResponse = await this.asaasService.getSubscriptionPayments(subscription.id);
            const payments = paymentsResponse?.data ?? paymentsResponse ?? [];
            const firstPayment = Array.isArray(payments) ? payments[0] : null;

            payment = firstPayment
              ? {
                  id: firstPayment.id,
                  status: firstPayment.status,
                  invoiceUrl: firstPayment.invoiceUrl ?? null,
                  value: firstPayment.value,
                }
              : null;

            accountActivated = this.isPaymentConfirmed(firstPayment?.status);

            if (accountActivated) {
              await this.prisma.company.update({
                where: { id: createdCompany.id },
                data: { state: 'ACTIVE' },
              });
              createdCompany.state = 'ACTIVE';
            }
          }

          return {
            company: createdCompany,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
            },
            payment,
            accountActivated,
            message: accountActivated
              ? 'Cadastro realizado e pagamento confirmado com sucesso!'
              : 'Cadastro realizado. Aguardando confirmação do pagamento.',
          };
        } else {
          // Para planos gratuitos, apenas vincula o plano sem criar cliente/assinatura no ASAAS
          await this.companySubscriptionRepository.create({
            companyId: createdCompany.id,
            subscriptionId: undefined,
            planId
          });
        }

        return {
          company: createdCompany,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          accountActivated: createdCompany.state === 'ACTIVE',
          message: 'Empresa adicionada com sucesso!',
        };
      } catch (error) {
        // Rollback: deleta os registros criados
        console.error('Erro durante onboarding, iniciando rollback...', error);
        console.error('Detalhes do erro:', error.response?.data || error.message);

        if (createdCompany) {
          // Remove WeatherAlert se foi criado
          try {
            await this.prisma.weatherAlert.deleteMany({
              where: { companyId: createdCompany.id },
            });
          } catch (e) {
            this.logger.warn('Erro ao remover WeatherAlert no rollback');
          }

          // Remove UserCompany do admin se foi criado
          const adminUserId = this.configService.get<string>('ADMIN_USER_ID');
          if (adminUserId) {
            try {
              await this.prisma.userCompany.deleteMany({
                where: {
                  userId: adminUserId,
                  companyId: createdCompany.id,
                },
              });
            } catch (e) {
              this.logger.warn('Erro ao remover UserCompany do admin no rollback');
            }
          }
        }

        if (linkPage) {
          await this.linkPageRepository.delete(linkPage.id).catch(() => { });
        }

        if (user) {
          await this.userRepository.deleteUserCompanies(user.id).catch(() => { });
          await this.userRepository.delete(user.id).catch(() => { });
        }

        if (createdCompany) {
          await this.companyRepository.delete(createdCompany.id).catch(() => { });

          if (createdCompany.addressId) {
            await this.companyRepository.deleteAddress(createdCompany.addressId).catch(() => { });
          }
        }

        const errorMessage = error.response?.data?.errors?.[0]?.description
          || error.response?.data?.message
          || error.message
          || 'Erro desconhecido';

        throw new BadRequestException(`Ocorreu um erro ao realizar o cadastro: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Erro externo no onboarding:', error);
      require('fs').appendFileSync('debug_onboarding.txt', 'Error in onboarding: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)) + '\n');
      if (error.response) {
        require('fs').appendFileSync('debug_onboarding.txt', 'Axios Response: ' + JSON.stringify(error.response.data) + '\n');
      }

      const errorMessage = error.response?.data?.errors?.[0]?.description
        || error.response?.data?.message
        || error.message
        || 'Por favor, tente novamente.';

      throw new BadRequestException(`Ocorreu um erro ao realizar o cadastro: ${errorMessage}`);
    }
  }

  async createDigitalMenuIntegration(companyId: string, digitalMenuIntegrationDto: CreateDigitalMenuIntegrationDto) {
    const existingDigitalMenuIntegration = await this.digitalMenuIntegrationRepository.findByCompanyAndPartner(companyId, digitalMenuIntegrationDto.partnerId);

    if (existingDigitalMenuIntegration) {
      return await this.digitalMenuIntegrationRepository.update(
        existingDigitalMenuIntegration.id,
        digitalMenuIntegrationDto
      );
    }

    return await this.digitalMenuIntegrationRepository.create({
      ...digitalMenuIntegrationDto,
      companyId,
      active: digitalMenuIntegrationDto.active ?? true,
    });
  }

  async createPartner(partnerDto: CreatePartnerDto) {
    return await this.partnerRepository.create(partnerDto);
  }

  async updatePartner(partnerId: string, partnerDto: CreatePartnerDto) {
    return await this.partnerRepository.update(partnerId, partnerDto);
  }

  async getDigitalMenuIntegration(companyId: string) {
    return await this.digitalMenuIntegrationRepository.findByCompanyId(companyId);
  }

  async getPartners(companyId: string) {
    return await this.partnerRepository.findAllWithIntegrations(companyId);
  }

  async getPlans() {
    return await this.planRepository.findActive();
  }

  async getBusinessPartners() {
    return await this.businessPartnerRepository.findAll();
  }

  async getBusinessPartnerById(id: string) {
    return await this.businessPartnerRepository.findById(id);
  }

  async createBusinessPartner(businessPartnerDto: CreateBusinessPartnerDto) {
    const { name, email, phone, cnpj, avatarUrl } = businessPartnerDto;

    const existingBusinessPartner = await this.businessPartnerRepository.findByEmail(email);

    if (existingBusinessPartner) {
      throw new BadRequestException('Business partner já cadastrado');
    }

    return await this.businessPartnerRepository.create({
      name,
      email,
      phone,
      cnpj,
      avatarUrl,
    });
  }

  async updateBusinessPartner(businessPartnerId: string, businessPartnerDto: CreateBusinessPartnerDto) {
    const { name, email, phone, cnpj, avatarUrl } = businessPartnerDto;

    const existingBusinessPartner = await this.businessPartnerRepository.findById(businessPartnerId);

    if (!existingBusinessPartner) {
      throw new BadRequestException('Business partner não encontrado');
    }

    return await this.businessPartnerRepository.update(businessPartnerId, {
      name,
      email,
      phone,
      cnpj,
      avatarUrl,
    });
  }
} 