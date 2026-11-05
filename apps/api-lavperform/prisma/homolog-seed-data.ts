export const HOMOLOG_COMPANY = {
  name: 'Lavanderia Homolog',
  cnpj: '11222333000181',
  email: 'contato@homolog.lavperform.invalid',
  phone: '550000000099',
  slug: 'lavanderia-homolog',
  state: 'ACTIVE' as const,
  serviceModel: 'SELF_SERVICE' as const,
  asaasCustomerId: null,
};

export const HOMOLOG_ADDRESS = {
  street: 'Rua das Máquinas',
  number: '100',
  neighborhood: 'Homologação',
  city: 'Curitiba',
  state: 'PR',
  zipCode: '80000-000',
};

export const HOMOLOG_PLAN = {
  id: 'plan-homolog',
  name: 'Plano Homolog',
  description:
    'Plano local gratuito da homologação. Não existe cobrança nem assinatura no Asaas.',
  price: 0,
  cycle: 'MONTHLY' as const,
  subscriptionId: null,
};

export const HOMOLOG_BRAND = {
  primaryColor: '#0B6E99',
  deepColor: '#093A58',
  accentColor: '#FFD23F',
  neutralColor: '#FFFFFF',
  titleFont: 'Poppins',
  bodyFont: 'Inter',
  tones: ['Próximo', 'Direto'],
  voiceNotes:
    'Lavanderia de bairro em homologação. Fale de forma próxima, curta e concreta. Não prometa prazo que a operação não consegue cumprir.',
  references:
    'Peças dobradas, luz de manhã e balcão limpo. Não use cardápio, comida ou estoque de restaurante.',
};

export const HOMOLOG_DRAFT = {
  objective: 'cuidado',
  theme: 'Como cuidar de edredom sem encolher',
  format: 'feed',
  slideCount: 1,
  artStyle: 'fotografico_clean',
  includeCaption: true,
};

export const HOMOLOG_ACCESS_MODULES = [
  'customers',
  'orders',
  'campaigns',
  'automatic-campaign',
  'integrations',
  'dashboard',
  'metrics',
  'users',
  'companies',
  'social-posts',
] as const;

export const QA_USER_NAME = 'QA Homolog';
export const QA_USER_PHONE = '550000000000';
export const REAL_CONTACT_EMAIL = 'contato-real@homolog.lavperform.invalid';

const FAKE_FIRST_NAMES = [
  'Ana',
  'Bruno',
  'Carla',
  'Diego',
  'Elena',
  'Fábio',
  'Helena',
  'Igor',
  'Júlia',
  'Kaio',
];

export const FAKE_HOMOLOG_CUSTOMERS = FAKE_FIRST_NAMES.map(
  (firstName, index) => {
    const sequence = String(index + 1).padStart(4, '0');
    return {
      name: `${firstName} Homolog`,
      email: `cliente-${String(index + 1).padStart(2, '0')}@homolog.lavperform.invalid`,
      phone: `55000000${sequence}`,
      whatsappOptin: false as const,
      observations:
        'Seed de homologação. Telefone com DDD 00, inválido, fora de qualquer disparo.',
    };
  },
);
