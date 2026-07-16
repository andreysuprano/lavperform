/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminBillingService } from 'src/admin/billing/admin-billing.service';

describe('AdminBillingService', () => {
  const prisma = {
    company: { findUnique: jest.fn(), update: jest.fn() },
    companySubscription: { findFirst: jest.fn() },
    creditTopup: { update: jest.fn() },
  };
  const asaasService = {
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
    updateSubscription: jest.fn(),
    deleteSubscription: jest.fn(),
    getSubscriptionDetails: jest.fn(),
    receivePaymentInCash: jest.fn(),
    deletePayment: jest.fn(),
  };
  const companiesService = {
    findSubscription: jest.fn(),
    findSubscriptionPayments: jest.fn(),
    findPaymentMethodInfo: jest.fn(),
  };
  const creditsService = {
    findTopup: jest.fn(),
    recoverTopupFromAsaas: jest.fn(),
  };
  const planRepository = { findById: jest.fn(), findActive: jest.fn() };
  const companySubscriptionRepository = {
    findByCompanyId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  let service: AdminBillingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminBillingService(
      prisma as any,
      asaasService as any,
      companiesService as any,
      creditsService as any,
      planRepository as any,
      companySubscriptionRepository as any,
    );
  });

  describe('changePlan', () => {
    const companyId = 'company-1';
    const paidPlan = {
      id: 'plan-paid',
      price: 99,
      cycle: 'MONTHLY',
      description: 'Pro',
      maxPayments: 0,
      active: true,
    };

    it('throws when plan not found', async () => {
      planRepository.findById.mockResolvedValue(null);
      await expect(
        service.changePlan(companyId, { planId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates existing asaas subscription and planId', async () => {
      planRepository.findById.mockResolvedValue(paidPlan);
      prisma.company.findUnique.mockResolvedValue({
        id: companyId,
        name: 'Loja',
        cnpj: '123',
        email: 'a@b.com',
        phone: '11999999999',
        asaasCustomerId: 'cus_1',
        address: null,
      });
      companySubscriptionRepository.findByCompanyId.mockResolvedValue({
        id: 'sub-local',
        companyId,
        subscriptionId: 'sub_asaas',
        planId: 'plan-old',
      });
      asaasService.updateSubscription.mockResolvedValue({ id: 'sub_asaas' });
      asaasService.getSubscriptionDetails.mockResolvedValue({
        id: 'sub_asaas',
        value: 99,
      });
      companySubscriptionRepository.update.mockResolvedValue({
        id: 'sub-local',
        companyId,
        subscriptionId: 'sub_asaas',
        planId: paidPlan.id,
      });

      const result = await service.changePlan(companyId, {
        planId: paidPlan.id,
      });

      expect(asaasService.updateSubscription).toHaveBeenCalledWith(
        'sub_asaas',
        expect.objectContaining({
          value: 99,
          updatePendingPayments: true,
        }),
      );
      expect(companySubscriptionRepository.update).toHaveBeenCalledWith(
        'sub-local',
        { planId: paidPlan.id },
      );
      expect(result.plan).toEqual(paidPlan);
    });

    it('creates internal subscription when company has none', async () => {
      planRepository.findById.mockResolvedValue({
        ...paidPlan,
        price: 0,
        id: 'plan-free',
      });
      prisma.company.findUnique.mockResolvedValue({
        id: companyId,
        name: 'Loja',
        cnpj: '123',
        email: 'a@b.com',
        phone: null,
        address: null,
        asaasCustomerId: null,
      });
      companySubscriptionRepository.findByCompanyId.mockResolvedValue(null);
      companySubscriptionRepository.create.mockResolvedValue({
        id: 'sub-local',
        companyId,
        subscriptionId: null,
        planId: 'plan-free',
      });
      companySubscriptionRepository.update.mockResolvedValue({
        id: 'sub-local',
        companyId,
        subscriptionId: null,
        planId: 'plan-free',
      });

      await service.changePlan(companyId, { planId: 'plan-free' });

      expect(companySubscriptionRepository.create).toHaveBeenCalledWith({
        companyId,
        planId: 'plan-free',
        subscriptionId: null,
      });
    });

    it('removes asaas subscription when switching to free plan', async () => {
      const freePlan = { ...paidPlan, id: 'plan-free', price: 0 };
      planRepository.findById.mockResolvedValue(freePlan);
      prisma.company.findUnique.mockResolvedValue({
        id: companyId,
        asaasCustomerId: 'cus_1',
        name: 'Loja',
        cnpj: '123',
        email: 'a@b.com',
        phone: null,
        address: null,
      });
      companySubscriptionRepository.findByCompanyId.mockResolvedValue({
        id: 'sub-local',
        companyId,
        subscriptionId: 'sub_asaas',
        planId: 'plan-paid',
      });
      companySubscriptionRepository.update.mockResolvedValue({
        id: 'sub-local',
        subscriptionId: null,
        planId: freePlan.id,
      });

      await service.changePlan(companyId, { planId: freePlan.id });

      expect(asaasService.deleteSubscription).toHaveBeenCalledWith('sub_asaas');
      expect(companySubscriptionRepository.update).toHaveBeenCalledWith(
        'sub-local',
        { subscriptionId: null, planId: freePlan.id },
      );
    });
  });

  describe('receiveTopupInCash', () => {
    it('throws when topup has no asaas charge', async () => {
      creditsService.findTopup.mockResolvedValue({
        id: 'topup-1',
        asaasChargeId: null,
      });
      await expect(
        service.receiveTopupInCash('company-1', 'topup-1', {
          paymentDate: '2026-05-22',
          value: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('calls asaas receiveInCash and recovers topup', async () => {
      creditsService.findTopup.mockResolvedValue({
        id: 'topup-1',
        asaasChargeId: 'pay_1',
      });
      asaasService.receivePaymentInCash.mockResolvedValue({ status: 'RECEIVED_IN_CASH' });
      creditsService.recoverTopupFromAsaas.mockResolvedValue({
        id: 'topup-1',
        status: 'PAID',
      });

      const result = await service.receiveTopupInCash('company-1', 'topup-1', {
        paymentDate: '2026-05-22',
        value: 50,
      });

      expect(asaasService.receivePaymentInCash).toHaveBeenCalledWith('pay_1', {
        paymentDate: '2026-05-22',
        value: 50,
        notifyCustomer: false,
      });
      expect(creditsService.recoverTopupFromAsaas).toHaveBeenCalledWith(
        'company-1',
        'pay_1',
      );
      expect(result.status).toBe('PAID');
    });
  });
});
