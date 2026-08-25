import {
  LuCheckCheck,
  LuCircleDollarSign,
  LuClock,
  LuDollarSign,
  LuLoader,
  LuMapPin,
  LuMessageCircleX,
  LuPercent,
  LuX,
} from 'react-icons/lu'

/** Mínimo de envios por dia (validação básica: número inteiro positivo) */
export const MIN_DAILY_SENDS = 1
/** Valor inicial no formulário e fallback quando o campo ainda não existe no estado/API */
export const DEFAULT_MAX_DAILY_SENDS = 50

export const campaignTypeItems = [
  {
    value: 'RECOGNITION',
    title: 'Campanha de Reconhecimento',
    description:
      'Fortalece o relacionamento com os clientes e mantém a marca presente por meio de comunicações relevantes.',
    isActive: true,
  },
  {
    value: 'SALES',
    title: 'Campanha de Venda',
    description:
      'Incentiva novas compras com ofertas e comunicações direcionadas para gerar vendas.',
    isActive: true,
  },
  {
    value: 'RECURRENCE',
    title: 'Campanha de Recorrência',
    description:
      'Campanhas de recorrência buscam transformar clientes ocasionais em compradores frequentes através de promoções e comunicações personalizadas.',
    isActive: false,
    target: ['campeao', 'fiel'],
  },
  {
    value: 'REACTIVATION',
    title: 'Campanha de Recuperação de Clientes',
    description:
      'É uma campanha que busca reengajar clientes que não compram há algum tempo, incentivando-os a retornar.',
    isActive: false,
    target: ['em_risco', 'perdido', 'quase_dormente'],
  },
  {
    value: 'ACQUISITION',
    title: 'Campanha de Captação',
    description:
      'É uma campanha focada em atrair novos clientes e convertê-los em compradores.',
    isActive: false,
  },
]

export const creatableCampaignTypeItems = campaignTypeItems.filter(
  (item) => item.value === 'RECOGNITION' || item.value === 'SALES'
)

export const incitationItems = [
  {
    value: 'discount',
    title: 'Desconto',
    description: 'Porcentagem ou valor fixo',
    icon: <LuCircleDollarSign />,
  },
  {
    value: 'tax',
    title: 'Frete grátis',
    description: 'Baseado no raio de entrega',
    icon: <LuMapPin />,
  },
  {
    value: 'none',
    title: 'Sem Incentivo',
    description: 'Sem promoção ao cliente',
    icon: <LuMessageCircleX />,
  },
]

export const discountTypeItems = [
  {
    value: 'percent',
    title: 'Porcentagem',
    icon: <LuPercent />,
  },
  {
    value: 'currency',
    title: 'Valor fixo',
    icon: <LuDollarSign />,
  },
]

export const messageStatusItems = [
  {
    value: 'SENT',
    label: 'Enviada',
    color: 'green',
    icon: <LuCheckCheck />,
  },
  {
    value: 'PENDING',
    label: 'Pendente',
    color: 'cyan',
    icon: <LuClock />,
  },
  {
    value: 'PROCESSING',
    label: 'Processando',
    color: 'blue',
    icon: <LuLoader />,
  },
  {
    value: 'ABORTED',
    label: 'Abortada',
    color: 'yellow',
    icon: <LuX />,
  },
  {
    value: 'ERROR',
    label: 'Erro',
    color: 'red',
    icon: <LuX />,
  },
] as const
