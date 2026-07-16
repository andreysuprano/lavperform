import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from 'src/onboarding/onboarding.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async () => 'hashed'),
}));

describe('OnboardingService', () => {
  const userRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteUserCompanies: jest.fn(),
  };

  const companyRepository = {
    findByCnpj: jest.fn(),
    findBySlug: jest.fn(),
    delete: jest.fn(),
    deleteAddress: jest.fn(),
  };

  const linkPageRepository = {
    create: jest.fn(),
    delete: jest.fn(),
  };

  const planRepository = {
    findById: jest.fn(),
    findActive: jest.fn(),
    findSelfCheckoutPlan: jest.fn(),
    setSelfCheckoutPlan: jest.fn(),
  };

  const companySubscriptionRepository = {
    create: jest.fn(),
  };

  const digitalMenuIntegrationRepository = {
    findByCompanyAndPartner: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findByCompanyId: jest.fn(),
  };

  const partnerRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findAllWithIntegrations: jest.fn(),
  };

  const businessPartnerRepository = {
    findById: jest.fn(),
    create: jest.fn(),
  };

  const companiesService: any = {
    create: jest.fn(),
  };

  const asaasService: any = {
    createCustomer: jest.fn(),
    createSubscription: jest.fn(),
    getSubscriptionPayments: jest.fn(),
  };

  const weatherAlertRepository: any = {
    create: jest.fn(),
  };

  const configService: any = {
    get: jest.fn(),
  };

  const prisma: any = {
    $transaction: jest.fn(async (fn: any) => {
      if (typeof fn === 'function') {
        return fn(prisma);
      }
      return Promise.all(fn);
    }),
    company: {
      update: jest.fn().mockResolvedValue({}),
    },
    userCompany: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    weatherAlert: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };

  let service: OnboardingService;

  const baseCompany = {
    name: 'Comp',
    cnpj: '123',
    neighborhood: 'Center',
    address: {
      street: 'Street',
      number: '10',
      complement: 'A',
      neighborhood: 'Center',
      city: 'City',
      state: 'ST',
      zipCode: '000',
    },
  };

  const onboardingDto: any = {
    company: baseCompany,
    planId: 'plan1',
    businessPartnerId: 'bp',
    email: 'user@test.com',
    password: 'pass',
    name: 'User',
    phone: '(11)9999-9999',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OnboardingService(
      userRepository as any,
      companyRepository as any,
      linkPageRepository as any,
      planRepository as any,
      companySubscriptionRepository as any,
      partnerRepository as any,
      businessPartnerRepository as any,
      digitalMenuIntegrationRepository as any,
      weatherAlertRepository as any,
      companiesService,
      asaasService,
      configService,
      prisma,
    );
  });

  it('throws when user email already exists', async () => {
    userRepository.findByEmail.mockResolvedValueOnce({ id: 'u1' });
    await expect(service.create(onboardingDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when company CNPJ already exists', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce({ id: 'c1' });
    await expect(service.create(onboardingDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates onboarding successfully with slug fallback', async () => {
    // user email check
    userRepository.findByEmail.mockResolvedValueOnce(null);
    // company cnpj check
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    // slug conflict check
    companyRepository.findBySlug.mockResolvedValueOnce({ id: 'existing-slug' });

    companiesService.create.mockResolvedValue({
      id: 'comp1',
      name: 'Comp',
      cnpj: '123',
      addressId: 'addr1',
      address: baseCompany.address,
    });
    userRepository.create.mockResolvedValue({ id: 'u1', phone: '(11)9999-9999', name: 'User', email: 'user@test.com' });
    linkPageRepository.create.mockResolvedValue({ id: 'lp1' });
    asaasService.createCustomer.mockResolvedValue({ id: 'cust1' });
    planRepository.findById.mockResolvedValue({ id: 'plan1', cycle: 'MONTH', price: 10, description: 'desc', maxPayments: 1 });
    asaasService.createSubscription.mockResolvedValue({ id: 'sub1' });
    companySubscriptionRepository.create.mockResolvedValue({});

    const result = await service.create(onboardingDto);
    expect(result.company.id).toBe('comp1');
    expect(result.user.id).toBe('u1');
    expect(asaasService.createCustomer).toHaveBeenCalled();
    expect(companySubscriptionRepository.create).toHaveBeenCalled();
  });

  it('creates subscription with CREDIT_CARD when plan does not allow alternatives', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockResolvedValueOnce(null);
    companiesService.create.mockResolvedValue({
      id: 'comp-card-only',
      name: 'Comp',
      cnpj: '123',
      addressId: 'addr1',
      address: baseCompany.address,
    });
    userRepository.create.mockResolvedValue({
      id: 'u1',
      phone: '(11)9999-9999',
      name: 'User',
      email: 'user@test.com',
    });
    linkPageRepository.create.mockResolvedValue({ id: 'lp1' });
    asaasService.createCustomer.mockResolvedValue({ id: 'cust1' });
    planRepository.findById.mockResolvedValue({
      id: 'plan1',
      cycle: 'MONTH',
      price: 10,
      description: 'desc',
      maxPayments: 1,
      allowBoleto: false,
      allowPix: false,
    });
    asaasService.createSubscription.mockResolvedValue({ id: 'sub1' });
    companySubscriptionRepository.create.mockResolvedValue({});

    await service.create(onboardingDto);

    expect(asaasService.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ billingType: 'CREDIT_CARD' }),
    );
  });

  it('creates subscription with UNDEFINED when plan allows alternatives and no card is provided', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockResolvedValueOnce(null);
    companiesService.create.mockResolvedValue({
      id: 'comp-alt',
      name: 'Comp',
      cnpj: '123',
      addressId: 'addr1',
      address: baseCompany.address,
    });
    userRepository.create.mockResolvedValue({
      id: 'u1',
      phone: '(11)9999-9999',
      name: 'User',
      email: 'user@test.com',
    });
    linkPageRepository.create.mockResolvedValue({ id: 'lp1' });
    asaasService.createCustomer.mockResolvedValue({ id: 'cust1' });
    planRepository.findById.mockResolvedValue({
      id: 'plan1',
      cycle: 'MONTH',
      price: 10,
      description: 'desc',
      maxPayments: 1,
      allowBoleto: true,
      allowPix: true,
    });
    asaasService.createSubscription.mockResolvedValue({ id: 'sub1' });
    companySubscriptionRepository.create.mockResolvedValue({});

    await service.create(onboardingDto);

    expect(asaasService.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ billingType: 'UNDEFINED' }),
    );
  });

  it('creates onboarding when slug is unique and partner id is empty', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockResolvedValueOnce(null);

    companiesService.create.mockResolvedValue({
      id: 'comp2',
      name: 'Comp',
      cnpj: '123',
      addressId: 'addr2',
      address: baseCompany.address,
    });
    userRepository.create.mockResolvedValue({ id: 'u2', phone: '(11)9999-9999', name: 'User', email: 'user@test.com' });
    linkPageRepository.create.mockResolvedValue({ id: 'lp2' });
    asaasService.createCustomer.mockResolvedValue({ id: 'cust2' });
    planRepository.findById.mockResolvedValue({ id: 'plan1', cycle: 'MONTH', price: 10, description: 'desc', maxPayments: 1 });
    asaasService.createSubscription.mockResolvedValue({ id: 'sub2' });
    companySubscriptionRepository.create.mockResolvedValue({});

    const result = await service.create({ ...onboardingDto, businessPartnerId: undefined });

    expect(companiesService.create).toHaveBeenCalledWith(expect.objectContaining({ businessPartnerId: undefined }));
    expect(result.company.id).toBe('comp2');
  });

  it('rolls back when Asaas customer creation returns detailed errors', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockResolvedValueOnce(null);
    companiesService.create.mockResolvedValue({ id: 'comp3', addressId: 'addr3', address: baseCompany.address });
    userRepository.create.mockResolvedValue({ id: 'u3', phone: '123', name: 'User', email: 'user@test.com' });
    linkPageRepository.create.mockResolvedValue({ id: 'lp3' });
    asaasService.createCustomer.mockRejectedValue({ response: { data: { errors: [{ description: 'bad-customer' }] } } });

    linkPageRepository.delete.mockResolvedValue({});
    userRepository.deleteUserCompanies.mockResolvedValue({});
    userRepository.delete.mockResolvedValue({});
    companyRepository.delete.mockResolvedValue({});
    companyRepository.deleteAddress.mockResolvedValue({});

    await expect(service.create(onboardingDto)).rejects.toBeInstanceOf(BadRequestException);
    expect(linkPageRepository.delete).toHaveBeenCalled();
    expect(companyRepository.delete).toHaveBeenCalledWith('comp3');
  });

  it('fills Asaas customer data with empty defaults when address is missing', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockResolvedValueOnce(null);
    companiesService.create.mockResolvedValue({ id: 'comp4', address: {}, addressId: 'addr4', name: 'Comp', cnpj: '123' } as any);
    userRepository.create.mockResolvedValue({ id: 'u4', phone: '(11)9999-9999', name: 'User', email: 'user@test.com' });
    linkPageRepository.create.mockResolvedValue({ id: 'lp4' });
    asaasService.createCustomer.mockResolvedValue({ id: 'cust4' });
    planRepository.findById.mockResolvedValue({ id: 'plan1', cycle: 'MONTH', price: 10, description: 'desc', maxPayments: 1 });
    asaasService.createSubscription.mockResolvedValue({ id: 'sub4' });
    companySubscriptionRepository.create.mockResolvedValue({});

    await service.create(onboardingDto);

    expect(asaasService.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        province: '',
        postalCode: '',
        addressNumber: '',
        complement: '',
      }),
    );
  });

  it('handles external errors with response message fallback', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companiesService.create.mockRejectedValue({ response: { data: { message: 'external-fail' } } });

    await expect(service.create(onboardingDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falls back to default error message when slug lookup fails without details', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockRejectedValueOnce({}); // slug lookup inside try

    await expect(service.create(onboardingDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('executes rollback catch handlers when deletions also fail', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockResolvedValueOnce(null);
    companiesService.create.mockResolvedValue({ id: 'comp5', address: baseCompany.address, addressId: 'addr5' });
    userRepository.create.mockResolvedValue({ id: 'u5', phone: '123', name: 'User', email: 'user@test.com' });
    linkPageRepository.create.mockResolvedValue({ id: 'lp5' });
    // Force inner catch due to Asaas error without message
    asaasService.createCustomer.mockRejectedValue({});
    // Make rollbacks reject so catch callbacks run
    linkPageRepository.delete.mockRejectedValue(new Error('fail'));
    userRepository.deleteUserCompanies.mockRejectedValue(new Error('fail'));
    userRepository.delete.mockRejectedValue(new Error('fail'));
    companyRepository.delete.mockRejectedValue(new Error('fail'));
    companyRepository.deleteAddress.mockRejectedValue(new Error('fail'));

    await expect(service.create(onboardingDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('runs rollback when plan is missing', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    companyRepository.findByCnpj.mockResolvedValueOnce(null);
    companyRepository.findBySlug.mockResolvedValueOnce(null);
    companiesService.create.mockResolvedValue({ id: 'comp1', addressId: 'addr1', address: baseCompany.address });
    userRepository.create.mockResolvedValue({ id: 'u1', phone: '123', name: 'User', email: 'user@test.com' });
    linkPageRepository.create.mockResolvedValue({ id: 'lp1' });
    asaasService.createCustomer.mockResolvedValue({ id: 'cust1' });
    planRepository.findById.mockResolvedValue(null); // triggers rollback

    linkPageRepository.delete.mockResolvedValue({});
    userRepository.deleteUserCompanies.mockResolvedValue({});
    userRepository.delete.mockResolvedValue({});
    companyRepository.delete.mockResolvedValue({});
    companyRepository.deleteAddress.mockResolvedValue({});

    await expect(service.create(onboardingDto)).rejects.toBeInstanceOf(BadRequestException);

    expect(linkPageRepository.delete).toHaveBeenCalledWith('lp1');
    expect(userRepository.deleteUserCompanies).toHaveBeenCalledWith('u1');
    expect(companyRepository.delete).toHaveBeenCalledWith('comp1');
  });

  it('updates existing digital menu integration', async () => {
    digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue({ id: 'dm1' });
    digitalMenuIntegrationRepository.update.mockResolvedValue({ id: 'dm1', partnerId: 'p1' });

    const result = await service.createDigitalMenuIntegration('comp', { partnerId: 'p1' } as any);
    expect(digitalMenuIntegrationRepository.update).toHaveBeenCalled();
    expect(result).toEqual({ id: 'dm1', partnerId: 'p1' });
  });

  it('creates digital menu integration when none exists', async () => {
    digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(null);
    digitalMenuIntegrationRepository.create.mockResolvedValue({ id: 'dm2' });

    const result = await service.createDigitalMenuIntegration('comp', { partnerId: 'p2' } as any);
    expect(result).toEqual({ id: 'dm2' });
  });

  it('creates and updates partners', async () => {
    partnerRepository.create.mockResolvedValue({ id: 'p1' });
    partnerRepository.update.mockResolvedValue({ id: 'p1', name: 'New' });

    expect(await service.createPartner({ name: 'P' } as any)).toEqual({ id: 'p1' });
    expect(await service.updatePartner('p1', { name: 'P2' } as any)).toEqual({ id: 'p1', name: 'New' });
  });

  it('lists digital menu integrations and partners and plans', async () => {
    digitalMenuIntegrationRepository.findByCompanyId.mockResolvedValue({ id: 'dm' });
    partnerRepository.findAllWithIntegrations.mockResolvedValue([{ id: 'p1' }]);
    planRepository.findActive.mockResolvedValue([{ id: 'plan1' }]);
    businessPartnerRepository.findById.mockResolvedValue({ id: 'bp1' });

    expect(await service.getDigitalMenuIntegration('comp')).toEqual({ id: 'dm' });
    expect(await service.getPartners('comp')).toEqual([{ id: 'p1' }]);
    expect(await service.getPlans()).toEqual([{ id: 'plan1' }]);
    expect(await service.getBusinessPartnerById('bp1')).toEqual({ id: 'bp1' });
  });
});
