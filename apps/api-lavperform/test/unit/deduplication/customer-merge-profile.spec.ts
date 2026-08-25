import { planMergedProfile } from 'src/deduplication/application/customer-merge-profile';

describe('planMergedProfile', () => {
  const survivor = {
    id: 'surv',
    name: 'João',
    phone: '5511999999999',
    email: null,
    cpf: null,
    birthDate: null,
    gender: null,
    observations: null,
    avatarUrl: null,
    whatsappVerified: false,
    whatsappVerifiedAt: null,
    whatsappOptin: true,
    addressId: null,
  };

  it('fills empty survivor fields from absorbed and prefers the longer name', () => {
    const plan = planMergedProfile(survivor, [
      {
        ...survivor,
        id: 'abs',
        name: 'João Silva',
        email: 'joao@exemplo.com',
        cpf: '12345678900',
        whatsappOptin: true,
      },
    ]);

    expect(plan.name).toBe('João Silva');
    expect(plan.email).toBe('joao@exemplo.com');
    expect(plan.cpf).toBe('12345678900');
    expect(plan.phone).toBe('5511999999999');
  });

  it('lets whatsapp opt-out win', () => {
    const plan = planMergedProfile(survivor, [
      { ...survivor, id: 'abs', whatsappOptin: false },
    ]);

    expect(plan.whatsappOptin).toBe(false);
  });

  it('steals address when survivor has none', () => {
    const plan = planMergedProfile(survivor, [
      { ...survivor, id: 'abs', addressId: 'addr-1' },
    ]);

    expect(plan.addressId).toBe('addr-1');
    expect(plan.stealAddressFromCustomerId).toBe('abs');
  });
});
