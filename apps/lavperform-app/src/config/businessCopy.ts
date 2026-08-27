import { getCurrentTheme } from './white-label.config'
import type { ThemeConfig } from './white-label.types'

export type BusinessCopy = {
  unitSingular: string
  unitSelectPlaceholder: string
  registerWelcomeTitle: string
  registerWelcomeDescription: string
  digitalChannelName: string
  customersSyncAlert: string
  digitalMenuUrlLabel: string
  companyPageChannelPlaceholder: string
  deliveryFeeLabel: string
  freeShippingTitle: string
  freeShippingDescription: string
  deliveryRadiusLabel: string
  deliveryRadiusFreeSubtitle: string
  couponTypeFrete: string
  couponTypeFreteLong: string
  menuLinkSentLabel: string
  followUpDefaultMessage: string
  academyTitle: string
  orderTypeLabels: Record<string, string>
  salesChannelLabels: Record<string, string>
  orderStatusLabels: Record<string, { label: string; color: string }>
}

const FOOD_COPY: BusinessCopy = {
  unitSingular: 'restaurante',
  unitSelectPlaceholder: 'Selecione um restaurante',
  registerWelcomeTitle: 'Bem-vindo ao FoodCRM',
  registerWelcomeDescription:
    'Esse é o primeiro passo para você fazer parte do ecossistema que mais gera vendas para restaurantes no Brasil.',
  digitalChannelName: 'Cardápio Digital',
  customersSyncAlert:
    'Após a configuração da integração com o seu Cardápio Digital os dados dos seus clientes serão preenchidos automaticamente.',
  digitalMenuUrlLabel: 'Url do cardápio',
  companyPageChannelPlaceholder: '(ex: iFood, Site, Delivery)',
  deliveryFeeLabel: 'Taxa de entrega',
  freeShippingTitle: 'Frete grátis',
  freeShippingDescription: 'Baseado no raio de entrega',
  deliveryRadiusLabel: 'Raio de entrega',
  deliveryRadiusFreeSubtitle: 'Raio de entrega grátis',
  couponTypeFrete: 'Frete',
  couponTypeFreteLong: 'Frete grátis (raio)',
  menuLinkSentLabel: 'Link do cardápio enviado',
  followUpDefaultMessage: 'Oi {nome}! Conseguiu fazer seu pedido?',
  academyTitle: 'Academy FoodCRM',
  orderTypeLabels: {
    delivery: 'Delivery',
    takeout: 'Retirada',
    dine_in: 'Mesa',
    pickup: 'Retirada',
  },
  salesChannelLabels: {
    catalog: '-',
    ifood: 'iFood',
    digital_menu: 'Cardápio Digital',
    app: 'App',
    website: 'Site',
  },
  orderStatusLabels: {
    confirmed: { label: 'Confirmado', color: 'green' },
    delivered: { label: 'Entregue', color: 'green' },
    cancelled: { label: 'Cancelado', color: 'red' },
    placed: { label: 'Recebido', color: 'blue' },
    in_preparation: { label: 'Preparando', color: 'orange' },
    ready_to_pickup: { label: 'Pronto', color: 'cyan' },
    dispatched: { label: 'Em entrega', color: 'purple' },
    concluded: { label: 'Concluído', color: 'green' },
  },
}

const LAUNDRY_COPY: BusinessCopy = {
  unitSingular: 'lavanderia',
  unitSelectPlaceholder: 'Selecione uma loja',
  registerWelcomeTitle: 'Bem-vindo ao LavPerform',
  registerWelcomeDescription:
    'Esse é o primeiro passo para você fazer parte do ecossistema que mais gera vendas para lavanderias no Brasil.',
  digitalChannelName: 'PDV',
  customersSyncAlert:
    'Após a configuração da integração com o seu PDV os dados dos seus clientes serão preenchidos automaticamente.',
  digitalMenuUrlLabel: 'URL do PDV',
  companyPageChannelPlaceholder: '(ex: WhatsApp, Site, PDV)',
  deliveryFeeLabel: 'Taxa de coleta/entrega',
  freeShippingTitle: 'Coleta/entrega grátis',
  freeShippingDescription: 'Baseado no raio de atendimento',
  deliveryRadiusLabel: 'Raio de atendimento',
  deliveryRadiusFreeSubtitle: 'Raio de coleta/entrega grátis',
  couponTypeFrete: 'Coleta/entrega',
  couponTypeFreteLong: 'Coleta/entrega grátis (raio)',
  menuLinkSentLabel: 'Link da loja enviado',
  followUpDefaultMessage: 'Oi {nome}! Conseguiu finalizar o serviço?',
  academyTitle: 'Academy LavPerform',
  orderTypeLabels: {
    delivery: 'Entrega',
    takeout: 'Retirada',
    dine_in: 'Loja',
    pickup: 'Retirada',
  },
  salesChannelLabels: {
    catalog: '-',
    ifood: 'Marketplace',
    digital_menu: 'PDV',
    app: 'App',
    website: 'Site',
  },
  orderStatusLabels: {
    confirmed: { label: 'Confirmado', color: 'green' },
    delivered: { label: 'Concluído', color: 'green' },
    cancelled: { label: 'Cancelado', color: 'red' },
    placed: { label: 'Recebido', color: 'blue' },
    in_preparation: { label: 'Em processo', color: 'orange' },
    ready_to_pickup: { label: 'Pronto para retirada', color: 'cyan' },
    dispatched: { label: 'Em rota', color: 'purple' },
    concluded: { label: 'Concluído', color: 'green' },
  },
}

export function isFoodTheme(theme: ThemeConfig = getCurrentTheme()) {
  return theme.id === 'default'
}

export function getBusinessCopy(theme: ThemeConfig = getCurrentTheme()): BusinessCopy {
  return isFoodTheme(theme) ? FOOD_COPY : LAUNDRY_COPY
}
