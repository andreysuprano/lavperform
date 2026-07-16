import type {
  AIAgentConfig,
  AIAgentKnowledgeFile,
  LandingPageConfig,
  LandingPageFormData,
  LandingPageData,
  WeatherConfig,
} from '../types'

/**
 * Dados mockados para a configuração do Agente de IA
 * Usado enquanto o backend não está disponível
 */
export const getMockAIAgentConfig = (companyId: string): AIAgentConfig => {
  // Tenta carregar do localStorage se existir
  const stored = localStorage.getItem(`@Whitelabel:aiAgentConfig:${companyId}`)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // Se houver erro ao parsear, usa valores padrão
    }
  }

  // Retorna valores padrão
  return {
    id: `mock-${companyId}`,
    companyId,
    enabled: false,
    settings: {
      personality: 'professional',
      responseStyle: 'balanced',
      language: 'pt-BR',
    },
    prompts: {
      greeting: 'Olá! Como posso ajudar você hoje?',
      defaultResponse: '',
      errorResponse:
        'Desculpe, ocorreu um erro. Tente novamente mais tarde.',
    },
    integrations: {
      whatsapp: false,
      email: false,
      chat: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Salva configuração mockada no localStorage
 */
export const saveMockAIAgentConfig = (
  companyId: string,
  config: Partial<AIAgentConfig>
): AIAgentConfig => {
  const current = getMockAIAgentConfig(companyId)
  const updated = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(
    `@Whitelabel:aiAgentConfig:${companyId}`,
    JSON.stringify(updated)
  )

  return updated
}

/**
 * Base de conhecimento mockada do Agente de IA
 * Armazenada por empresa enquanto o backend não está disponível
 */
const getKnowledgeBaseStorageKey = (companyId: string) =>
  `@Whitelabel:aiAgentKnowledgeBase:${companyId}`

export const getMockAIAgentKnowledgeBase = (
  companyId: string
): AIAgentKnowledgeFile[] => {
  const stored = localStorage.getItem(getKnowledgeBaseStorageKey(companyId))

  if (!stored) {
    return []
  }

  try {
    const parsed = JSON.parse(stored) as AIAgentKnowledgeFile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveMockAIAgentKnowledgeFile = ({
  companyId,
  file,
}: {
  companyId: string
  file: AIAgentKnowledgeFile
}): AIAgentKnowledgeFile[] => {
  const current = getMockAIAgentKnowledgeBase(companyId)
  const next = [...current, file]

  localStorage.setItem(getKnowledgeBaseStorageKey(companyId), JSON.stringify(next))

  return next
}

export const deleteMockAIAgentKnowledgeFile = ({
  companyId,
  fileId,
}: {
  companyId: string
  fileId: string
}): AIAgentKnowledgeFile[] => {
  const current = getMockAIAgentKnowledgeBase(companyId)
  const next = current.filter((file) => file.id !== fileId)

  localStorage.setItem(getKnowledgeBaseStorageKey(companyId), JSON.stringify(next))

  return next
}

/**
 * Dados mockados para a configuração da Landing Page
 * Usado enquanto o backend não está disponível
 */
export const getMockLandingPageConfig = (
  companyId: string
): LandingPageConfig => {
  // Tenta carregar do localStorage se existir
  const stored = localStorage.getItem(
    `@Whitelabel:landingPageConfig:${companyId}`
  )
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // Se houver erro ao parsear, usa valores padrão
    }
  }

  // Retorna valores padrão baseados no payload fornecido
  const defaultData: LandingPageData = {
    branding: {
      name: 'InLaundry',
      slogan: 'Lavanderia Express',
      logo: '/laundry.png',
    },
    hero: {
      title: 'Lave e Seque com Praticidade',
      highlightWord: 'Praticidade',
      subtitle: 'Centro, Florianópolis - SC',
      location: 'Centro, Florianópolis - SC',
      backgroundImage: '/hero.jpg',
      hours: {
        label: 'das 07:00 às 22:30',
        time: '07:00 - 22:30',
        days: 'Todos os dias',
      },
      payment: {
        label: 'Pagamento Digital',
        methods: 'Cartão e PIX',
      },
      ctaText: 'Solicitar Atendimento',
      ctaLink: 'https://wa.me/5548999999999',
    },
    services: {
      title: 'Serviços',
      description:
        'Preços acessíveis e qualidade garantida para o cuidado das suas roupas.',
      items: [
        {
          title: 'Lavagem',
          description:
            'Lavagem completa para suas roupas, garantindo limpeza e cuidado.',
          price: 'R$ 17,90',
          vantageList: [
            'Qualidade única da lavagem',
            'Produtos de alta tecnologia e exclusivos da marca',
            'Máquinas modernas e rápidas',
          ],
        },
        {
          title: 'Secagem',
          description:
            'Secagem eficiente para deixar suas roupas prontas para usar.',
          price: 'R$ 17,90',
          vantageList: [
            'Secagem controlada',
            'Preservação e maciez das roupas',
            'Roupas secas e sem pêlos',
          ],
        },
        {
          title: 'Serviço de atendente',
          description:
            'Ajuda rápida para você lavar certo e economizar tempo.',
          price: 'a partir de R$ 45,00',
          vantageList: [
            'Praticidade e economia',
            'Cuidado total com suas roupas',
            'Atendimento rápido e eficiente',
          ],
        },
      ],
    },
    location: {
      title: 'Localização',
      description:
        'Localidade estratégica funcionando das 07:00 às 22:30.',
      items: [
        {
          placeName: 'Praça do Banco Redondo',
          address:
            'R. Vítor Konder, 390 - Sala 3 - Centro, Florianópolis - SC, 88015-400',
          mapUrl: 'https://goo.gl/maps/example',
          mapEmbedUrl:
            'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.9539734866793!2d-46.66255102498167!3d-23.563987984686736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce59c6dceadf%3A0x8e5e8f3c7e8e9e0!2sInLaundry%20-%20Lavanderia%20Self%20Service!5e0!3m2!1spt-BR!2sbr!4v1695761234567!5m2!1spt-BR!2sbr',
          googleMapsLink: 'https://goo.gl/maps/example',
        },
      ],
    },
    faq: {
      title: 'Perguntas Frequentes',
      description: 'Tire suas dúvidas sobre os nossos serviços.',
      items: [
        {
          value: '1',
          title: 'O que posso lavar e secar na InLaundry?',
          text: `
<b>✅ Pode lavar e secar:</b>

<ul>
  <li>👕 Roupas de algodão</li>
  <li>👖 Jeans e tecidos resistentes</li>
  <li>🧦 Meias e roupas íntimas</li>
  <li>🏠 Roupas de cama e banho</li>
  <li>👶 Roupas infantis</li>
  <li>🛏️ Cobertor e Edredon de solteiro</li>
  <li>🛌 Cobertor e Edredon de Casal somente no tamanho "Padrão"</li>
</ul>
<br/>
<b>❌ Não pode lavar e secar:</b>
<ul>
    <li>🦺 Roupas com couro ou materiais especiais</li>
    <li>👗 Peças delicadas (seda, renda)</li>
    <li>🧥 Casacos com enchimento especial</li>
    <li>👞 Sapatos, tênis e similares</li>
    <li>🐕 Roupas com pêlos de PET</li>
    <li>🛏️ Edredon, Cobertor ou Coberdron modelos Queen e King Size</li>
    <li>🏠 Tapetes de todos os tipos</li>
    <li>🧽 Panos de chão</li>
    <li>🖤 Cortinas BlackOut</li>
    <li>🧸 Travesseiros e Bichos de Pelúcia de todos os tipos</li>
    <li>🎒 Mochilas e bolsas</li>
</ul>
    `,
        },
        {
          value: '2',
          title: 'Como funciona o processo de lavagem e secagem?',
          text: `
<b>📋 Passo a passo:</b>
<ol>
    <li>🧺 Separe as roupas por cor e tipo de tecido utilizando o cesto de roupas sujas.</li>
    <li>🔧 Selecione a lavadora escolhida e faça o pagamento da lavagem (R$ 17,90).</li>
    <li>🌀 Coloque as roupas na lavadora e inicie a lavagem</li>
    <li>🧺 Após o término, utilize o cesto de roupas limpas para retirar as roupas</li>
    <li>🔧 Para secar, selecione a secadora escolhida e faça o pagamento da secagem (R$ 17,90)</li>
    <li>🧽 Limpe o filtro da secadora antes de usar</li>
    <li>🌡️ Coloque as roupas limpas na secadora, selecione a temperatura alta e inicie a secagem</li>
    </ol>
    `,
        },
        {
          value: '3',
          title: 'Qual o horário de funcionamento?',
          text: '🕕 Funcionamos todos os dias da semana, das 07:00 às 22:30. Horário perfeito para quem tem rotina corrida e precisa de praticidade! Nossa equipe está sempre disponível para te ajudar. ⏰',
        },
        {
          value: '4',
          title: 'Quais formas de pagamento são aceitas?',
          text: '💳 O pagamento é feito separadamente: primeiro você paga a lavagem (R$ 17,90), realiza o processo, e depois, se quiser secar, faz um novo pagamento para a secagem (R$ 17,90). Aceitamos dinheiro, cartão e PIX, e para sua maior comodidade, temos o serviço de atendente! 💰',
        },
      ],
    },
    testimonials: {
      title: 'Avaliações',
      description: 'Veja o que nossos clientes dizem sobre nós.',
      items: [
        {
          quote:
            'Ótimo ambiente, excelente localização, máquinas novas !!!',
          author: 'Guilherme Balsamo',
        },
        {
          quote:
            'As roupas ficam com um bom cheiro e lavagem rápida em cerca de meia hora.',
          author: 'Gabriel G.',
        },
        {
          quote:
            'Boas máquinas. Ambiente limpo . Utilizo bastante os serviços.',
          author: 'Samira Mansur Elias',
        },
      ],
    },
    cta: {
      title: 'Pronto para Experimentar?',
      description:
        'Venha conhecer a InLaundry e comprove a qualidade dos nossos serviços.',
      buttonText: 'Solicitar Atendimento',
      whatsappNumber: '5548999999999',
    },
    footer: {
      description: 'Praticidade e carinho para suas roupas.',
      locationTitle: 'Praça do Banco Redondo',
      address:
        'R. Vítor Konder, 390 - Sala 3 (Centro), Florianópolis - SC',
      copyright: '© 2026 InLaundry. Todos os direitos reservados.',
    },
    navigation: [
      { label: 'Serviços', href: '#servicos' },
      { label: 'Localização', href: '#localizacao' },
      { label: 'Faq', href: '#faq' },
      { label: 'Avaliações', href: '#avaliacoes' },
    ],
  }

  return {
    id: `mock-${companyId}`,
    companyId,
    data: defaultData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Salva configuração mockada da Landing Page no localStorage
 */
export const saveMockLandingPageConfig = (
  companyId: string,
  config: Partial<LandingPageFormData>
): LandingPageConfig => {
  const current = getMockLandingPageConfig(companyId)
  const updated = {
    ...current,
    data: {
      ...current.data,
      ...config,
    },
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(
    `@Whitelabel:landingPageConfig:${companyId}`,
    JSON.stringify(updated)
  )

  return updated
}

/**
 * Dados mockados para a configuração de Clima e Tempo
 * Usado enquanto o backend não está disponível
 */
export const getMockWeatherConfig = (companyId: string): WeatherConfig => {
  // Tenta carregar do localStorage se existir
  const stored = localStorage.getItem(`@Whitelabel:weatherConfig:${companyId}`)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // Se houver erro ao parsear, usa valores padrão
    }
  }

  // Retorna valores padrão
  return {
    id: `mock-${companyId}`,
    companyId,
    enabled: false,
    conditions: [],
    automations: {
      whatsapp: false,
      email: false,
      messages: {
        rain: '🌧️ Olá! Previsão de chuva para amanhã. Que tal antecipar sua lavagem?',
        intense_sun:
          '☀️ Que dia de sol perfeito! Aproveite nosso desconto especial para lavagem hoje.',
        high_temperature:
          '🌡️ Temperatura alta hoje! Perfeito para secar suas roupas rapidamente.',
        low_temperature:
          '❄️ Temperatura baixa prevista. Lembre-se de proteger suas roupas.',
      },
    },
    rules: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Salva configuração mockada de Clima e Tempo no localStorage
 */
export const saveMockWeatherConfig = (
  companyId: string,
  config: Partial<WeatherConfig>
): WeatherConfig => {
  const current = getMockWeatherConfig(companyId)
  const updated = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  }

  localStorage.setItem(
    `@Whitelabel:weatherConfig:${companyId}`,
    JSON.stringify(updated)
  )

  return updated
}
