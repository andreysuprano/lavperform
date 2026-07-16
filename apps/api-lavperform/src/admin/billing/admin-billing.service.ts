import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreditPaymentMethod, CreditTopupStatus } from '@prisma/client';
import { CompaniesService } from '../../companies/application/companies.service';
import { CreditsService } from '../../credits/application/credits.service';
import { AsaasService } from '../../integrations/asaas/api/asaas.service';
import { ICompanySubscriptionRepository } from '../../plans/domain/company-subscription.repository.interface';
import { IPlanRepository } from '../../plans/domain/plan.repository.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { CreateBillingPaymentDto } from './dto/create-billing-payment.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanFilterDto } from './dto/plan-filter.dto';
import { ProvisionSubscriptionDto } from './dto/provision-subscription.dto';
import { ReceiveInCashDto } from './dto/receive-in-cash.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { resolveSubscriptionBillingType } from '../../plans/domain/resolve-subscription-billing-type';
import {
  SubscriptionAsaasStatus,
  UpdateSubscriptionStatusDto,
} from './dto/update-subscription-status.dto';

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasService: AsaasService,
    private readonly companiesService: CompaniesService,
    private readonly creditsService: CreditsService,
    @Inject('IPlanRepository')
    private readonly planRepository: IPlanRepository,
    @Inject('ICompanySubscriptionRepository')
    private readonly companySubscriptionRepository: ICompanySubscriptionRepository,
  ) {}

  async findActivePlans() {
    return this.planRepository.findActive();
  }

  async findAllPlans(filter: PlanFilterDto = {}) {
    return this.planRepository.findAll({
      search: filter.search,
      active: filter.active,
    });
  }

  async findPlanById(id: string) {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }
    return plan;
  }

  async createPlan(dto: CreatePlanDto) {
    const plan = await this.planRepository.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      cycle: dto.cycle,
      recommended: dto.recommended,
      maxPayments: dto.maxPayments,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      active: dto.active,
      isSelfCheckout: dto.isSelfCheckout ?? false,
      allowBoleto: dto.allowBoleto ?? false,
      allowPix: dto.allowPix ?? false,
    });

    if (dto.isSelfCheckout) {
      return this.planRepository.setSelfCheckoutPlan(plan.id);
    }

    return plan;
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.findPlanById(id);

    const { isSelfCheckout, ...planData } = dto;

    let plan = await this.planRepository.update(id, {
      ...(planData.name !== undefined ? { name: planData.name } : {}),
      ...(planData.description !== undefined ? { description: planData.description } : {}),
      ...(planData.price !== undefined ? { price: planData.price } : {}),
      ...(planData.cycle !== undefined ? { cycle: planData.cycle } : {}),
      ...(planData.recommended !== undefined ? { recommended: planData.recommended } : {}),
      ...(planData.maxPayments !== undefined ? { maxPayments: planData.maxPayments } : {}),
      ...(planData.endDate !== undefined
        ? { endDate: planData.endDate ? new Date(planData.endDate) : null }
        : {}),
      ...(planData.active !== undefined ? { active: planData.active } : {}),
      ...(planData.allowBoleto !== undefined
        ? { allowBoleto: planData.allowBoleto }
        : {}),
      ...(planData.allowPix !== undefined ? { allowPix: planData.allowPix } : {}),
      ...(isSelfCheckout === false ? { isSelfCheckout: false } : {}),
    });

    if (isSelfCheckout) {
      plan = await this.planRepository.setSelfCheckoutPlan(id);
    }

    return plan;
  }

  async togglePlanActive(id: string) {
    const plan = await this.findPlanById(id);
    return this.planRepository.update(id, { active: !plan.active });
  }

  async deletePlan(id: string) {
    await this.findPlanById(id);
    const linkedSubscriptions = await this.prisma.companySubscription.count({
      where: { planId: id },
    });
    if (linkedSubscriptions > 0) {
      throw new BadRequestException(
        'Plano vinculado a empresas não pode ser removido. Desative-o.',
      );
    }
    await this.planRepository.delete(id);
  }

  async getSubscription(companyId: string) {
    const result = await this.companiesService.findSubscription(companyId);
    const record = await this.prisma.companySubscription.findFirst({
      where: { companyId },
      include: { plan: true },
    });
    return { ...result, plan: record?.plan ?? null };
  }

  async getSubscriptionPayments(companyId: string) {
    return this.companiesService.findSubscriptionPayments(companyId);
  }

  async getSubscriptionPaymentDetails(companyId: string, paymentId: string) {
    await this.ensureCompanyExists(companyId);
    const payment = await this.asaasService.getPaymentDetails(paymentId);
    const paymentMethods =
      await this.companiesService.findPaymentMethodInfo(companyId, paymentId);
    return { payment, ...paymentMethods };
  }

  async changePlan(companyId: string, dto: ChangePlanDto) {
    const plan = await this.planRepository.findById(dto.planId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }
    if (!plan.active) {
      throw new BadRequestException('Plano inativo não pode ser atribuído');
    }

    const company = await this.getCompanyWithAddress(companyId);
    let companySubscription =
      await this.companySubscriptionRepository.findByCompanyId(companyId);

    if (!companySubscription) {
      companySubscription = await this.companySubscriptionRepository.create({
        companyId,
        planId: plan.id,
        subscriptionId: null,
      });
    }

    const value = dto.value ?? Number(plan.price);
    const cycle = dto.cycle ?? plan.cycle;
    const updatePendingPayments = dto.updatePendingPayments ?? true;

    if (Number(plan.price) > 0) {
      const asaasCustomerId = await this.ensureAsaasCustomer(company);

      if (!companySubscription.subscriptionId) {
        const asaasSubscription = await this.asaasService.createSubscription({
          billingType:
            dto.billingType ?? resolveSubscriptionBillingType(plan),
          cycle,
          value,
          customer: asaasCustomerId,
          nextDueDate: new Date().toISOString().slice(0, 10),
          description: plan.description,
          maxPayments: plan.maxPayments,
        });
        companySubscription = await this.companySubscriptionRepository.update(
          companySubscription.id,
          {
            subscriptionId: asaasSubscription.id,
            planId: plan.id,
          },
        );
      } else {
        await this.asaasService.updateSubscription(
          companySubscription.subscriptionId,
          {
            value,
            cycle,
            description: plan.description,
            billingType: dto.billingType,
            updatePendingPayments,
            maxPayments: plan.maxPayments,
          },
        );
        companySubscription = await this.companySubscriptionRepository.update(
          companySubscription.id,
          { planId: plan.id },
        );
      }
    } else {
      if (companySubscription.subscriptionId) {
        await this.asaasService.deleteSubscription(
          companySubscription.subscriptionId,
        );
      }
      companySubscription = await this.companySubscriptionRepository.update(
        companySubscription.id,
        { subscriptionId: null, planId: plan.id },
      );
    }

    const asaas = companySubscription.subscriptionId
      ? await this.asaasService.getSubscriptionDetails(
          companySubscription.subscriptionId,
        )
      : null;

    return { internal: companySubscription, asaas, plan };
  }

  async updateSubscriptionStatus(
    companyId: string,
    dto: UpdateSubscriptionStatusDto,
  ) {
    const { companySubscription } =
      await this.getSubscriptionContext(companyId);

    if (!companySubscription.subscriptionId) {
      throw new BadRequestException(
        'Empresa com plano gratuito não possui assinatura no Asaas',
      );
    }

    if (
      dto.status === SubscriptionAsaasStatus.ACTIVE &&
      !dto.nextDueDate
    ) {
      throw new BadRequestException(
        'nextDueDate é obrigatório ao reativar a assinatura',
      );
    }

    const asaas = await this.asaasService.updateSubscription(
      companySubscription.subscriptionId,
      {
        status: dto.status,
        ...(dto.nextDueDate ? { nextDueDate: dto.nextDueDate } : {}),
      },
    );

    return { internal: companySubscription, asaas };
  }

  async provisionSubscription(
    companyId: string,
    dto: ProvisionSubscriptionDto,
  ) {
    const company = await this.getCompanyWithAddress(companyId);
    let companySubscription =
      await this.companySubscriptionRepository.findByCompanyId(companyId);

    if (!companySubscription) {
      throw new NotFoundException('Assinatura interna não encontrada');
    }

    const planId = dto.planId ?? companySubscription.planId;
    const plan = await this.planRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }
    if (Number(plan.price) <= 0) {
      throw new BadRequestException(
        'Provisionamento Asaas só se aplica a planos pagos',
      );
    }
    if (companySubscription.subscriptionId) {
      throw new BadRequestException('Empresa já possui assinatura no Asaas');
    }

    const asaasCustomerId = await this.ensureAsaasCustomer(company);
    const asaasSubscription = await this.asaasService.createSubscription({
      billingType: resolveSubscriptionBillingType(plan),
      cycle: plan.cycle,
      value: Number(plan.price),
      customer: asaasCustomerId,
      nextDueDate: new Date().toISOString().slice(0, 10),
      description: plan.description,
      maxPayments: plan.maxPayments,
    });

    companySubscription = await this.companySubscriptionRepository.update(
      companySubscription.id,
      {
        subscriptionId: asaasSubscription.id,
        planId: plan.id,
      },
    );

    return {
      internal: companySubscription,
      asaas: asaasSubscription,
      plan,
    };
  }

  async deleteCompanySubscription(companyId: string) {
    const { companySubscription } =
      await this.getSubscriptionContext(companyId);

    if (companySubscription.subscriptionId) {
      await this.asaasService.deleteSubscription(
        companySubscription.subscriptionId,
      );
    }

    const updated = await this.companySubscriptionRepository.update(
      companySubscription.id,
      { subscriptionId: null },
    );

    return { internal: updated, asaas: null };
  }

  async createStandalonePayment(
    companyId: string,
    dto: CreateBillingPaymentDto,
  ) {
    const company = await this.getCompanyWithAddress(companyId);
    const asaasCustomerId = await this.ensureAsaasCustomer(company);

    const payment = await this.asaasService.createPayment({
      customer: asaasCustomerId,
      billingType: dto.billingType,
      value: dto.value,
      dueDate: dto.dueDate,
      description: dto.description,
    });

    return payment;
  }

  async receiveSubscriptionPaymentInCash(
    companyId: string,
    paymentId: string,
    dto: ReceiveInCashDto,
  ) {
    await this.getSubscriptionContext(companyId);
    const payment = await this.asaasService.receivePaymentInCash(paymentId, {
      paymentDate: dto.paymentDate,
      value: dto.value,
      notifyCustomer: dto.notifyCustomer ?? false,
    });
    return payment;
  }

  async deleteSubscriptionPayment(companyId: string, paymentId: string) {
    await this.getSubscriptionContext(companyId);
    return this.asaasService.deletePayment(paymentId);
  }

  async refundSubscriptionPayment(
    companyId: string,
    paymentId: string,
    dto: RefundPaymentDto,
  ) {
    await this.getSubscriptionContext(companyId);
    return this.asaasService.refundPayment(paymentId, dto);
  }

  async receiveTopupInCash(
    companyId: string,
    topupId: string,
    dto: ReceiveInCashDto,
  ) {
    const topup = await this.creditsService.findTopup(companyId, topupId);
    if (topup.paymentMethod === CreditPaymentMethod.PLATFORM) {
      throw new BadRequestException(
        'Vouchers da plataforma não possuem cobrança no Asaas',
      );
    }
    if (!topup.asaasChargeId) {
      throw new BadRequestException('Recarga sem cobrança vinculada no Asaas');
    }

    await this.asaasService.receivePaymentInCash(topup.asaasChargeId, {
      paymentDate: dto.paymentDate,
      value: dto.value,
      notifyCustomer: dto.notifyCustomer ?? false,
    });

    return this.creditsService.recoverTopupFromAsaas(
      companyId,
      topup.asaasChargeId,
    );
  }

  async syncTopupFromAsaas(companyId: string, topupId: string) {
    const topup = await this.creditsService.findTopup(companyId, topupId);
    if (topup.paymentMethod === CreditPaymentMethod.PLATFORM) {
      throw new BadRequestException(
        'Vouchers da plataforma não possuem cobrança no Asaas',
      );
    }
    if (!topup.asaasChargeId) {
      throw new BadRequestException('Recarga sem cobrança vinculada no Asaas');
    }
    return this.creditsService.recoverTopupFromAsaas(
      companyId,
      topup.asaasChargeId,
    );
  }

  async deleteTopupAsaasCharge(companyId: string, topupId: string) {
    const topup = await this.creditsService.findTopup(companyId, topupId);
    if (topup.paymentMethod === CreditPaymentMethod.PLATFORM) {
      throw new BadRequestException(
        'Vouchers da plataforma não possuem cobrança no Asaas',
      );
    }
    if (!topup.asaasChargeId) {
      throw new BadRequestException('Recarga sem cobrança vinculada no Asaas');
    }

    if (topup.status === CreditTopupStatus.PAID) {
      throw new BadRequestException(
        'Não é possível excluir cobrança de recarga já paga',
      );
    }

    await this.asaasService.deletePayment(topup.asaasChargeId);
    return this.prisma.creditTopup.update({
      where: { id: topupId },
      data: { status: CreditTopupStatus.CANCELED },
    });
  }

  private async getSubscriptionContext(companyId: string) {
    await this.ensureCompanyExists(companyId);
    const companySubscription =
      await this.companySubscriptionRepository.findByCompanyId(companyId);

    if (!companySubscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    return { companySubscription };
  }

  private async ensureCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }

  private async getCompanyWithAddress(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: { address: true },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return company;
  }

  private async ensureAsaasCustomer(company: {
    id: string;
    name: string;
    cnpj: string;
    email: string;
    phone: string | null;
    asaasCustomerId: string | null;
    address: {
      street: string | null;
      number: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      zipCode: string | null;
    } | null;
  }): Promise<string> {
    if (company.asaasCustomerId) {
      return company.asaasCustomerId;
    }

    const customer = await this.asaasService.createCustomer({
      name: company.name,
      cpfCnpj: company.cnpj,
      email: company.email,
      address: this.formatAddress(company),
      province: company.address?.state ?? '',
      postalCode: company.address?.zipCode ?? '',
      mobilePhone: company.phone?.replace(/\D/g, '') ?? '',
      addressNumber: company.address?.number ?? '',
      complement: company.address?.complement ?? '',
      company: company.name,
    });

    await this.prisma.company.update({
      where: { id: company.id },
      data: { asaasCustomerId: customer.id },
    });

    return customer.id;
  }

  private formatAddress(company: {
    address: {
      street: string | null;
      number: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
    } | null;
  }) {
    const address = company.address;
    if (!address) return '';
    return [
      address.street,
      address.number,
      address.neighborhood,
      address.city,
      address.state,
    ]
      .filter(Boolean)
      .join(', ');
  }
}
