import type { ElementType } from 'react'
import { BsWhatsapp } from 'react-icons/bs'
import {
  MdOutlineEmail,
  MdOutlineNotificationsActive,
  MdOutlineSms,
} from 'react-icons/md'
import { RiWirelessChargingLine } from 'react-icons/ri'
import { TbBrandMeta } from 'react-icons/tb'

export type ChannelKey =
  | 'whatsapp_web'
  | 'whatsapp_business_api'
  | 'email'
  | 'sms'
  | 'rcs'
  | 'push_notification'

export type ChannelCatalogItem = {
  key: ChannelKey
  name: string
  icon: ElementType
  isAvailable: boolean
  /**
   * Usado quando queremos listar mas não permitir iniciar campanha.
   * Ex.: "beta", "em breve", ou dependente de integração futura.
   */
  isBeta?: boolean
  /**
   * Indica se o canal suporta envio de imagens nos criativos.
   * Quando false, o campo de upload de imagem é ocultado na etapa de Criativo.
   */
  supportsImage: boolean
  /**
   * Limite de caracteres da descrição do criativo para este canal.
   * Se vários canais no formulário definirem limite, usa-se o menor; omitir = 500 no form.
   */
  creativeDescriptionMaxChars?: number
  badgeLabel?: string
  badgeColorPalette?: string
  disabledReason?: string
  /**
   * Conteúdo do card na página de canais. Ausente = não listado nessa página.
   */
  channelsPage?: {
    description: string
    footerKind:
      | 'whatsapp_web'
      | 'whatsapp_business_api'
      | 'activated_only'
      | 'coming_soon'
    /** Estilo de card “ativo” (ex.: hover) na grade da página. */
    cardActive: boolean
  }
}

/** Ordem de exibição na página de canais (marketing). */
export const CHANNELS_PAGE_ORDER: ChannelKey[] = [
  'whatsapp_web',
  'sms',
  'whatsapp_business_api',
  'email',
  'rcs',
  'push_notification',
]

export const CHANNEL_CATALOG: ChannelCatalogItem[] = [
  {
    key: 'whatsapp_web',
    name: 'WhatsApp Web',
    icon: BsWhatsapp,
    isAvailable: true,
    supportsImage: true,
    badgeLabel: 'Gratuito',
    badgeColorPalette: 'green',
    channelsPage: {
      description:
        'Utilizando a API do WhatsApp Web você não tem custos para se comunicar com seus clientes, podendo aumentar o engajamento e ativar sua base, trazendo novas vendas recorrentes.',
      footerKind: 'whatsapp_web',
      cardActive: true,
    },
  },
  {
    key: 'sms',
    name: 'SMS',
    icon: MdOutlineSms,
    isAvailable: true,
    supportsImage: false,
    creativeDescriptionMaxChars: 134,
    badgeLabel: 'Envolve Custos',
    badgeColorPalette: 'orange',
    channelsPage: {
      description:
        'Envie mensagens de texto diretamente para o celular dos seus clientes, com alta taxa de abertura e sem depender de internet.',
      footerKind: 'activated_only',
      cardActive: true,
    },
  },
  {
    key: 'email',
    name: 'Email',
    icon: MdOutlineEmail,
    isAvailable: false,
    isBeta: true,
    supportsImage: true,
    badgeLabel: 'Em breve',
    badgeColorPalette: 'gray',
    disabledReason: 'Canal em beta/indisponível para iniciar campanhas.',
    channelsPage: {
      description:
        'Um dos canais mais baratos e menos explorados do mercado, diferencie da concorrência e esteja presente de todas as formas.',
      footerKind: 'coming_soon',
      cardActive: false,
    },
  },
  {
    key: 'whatsapp_business_api',
    name: 'WhatsApp Business API',
    icon: TbBrandMeta,
    isAvailable: true,
    supportsImage: true,
    badgeLabel: 'Disponível',
    badgeColorPalette: 'green',
    channelsPage: {
      description:
        'Utilizando a API Oficial do WhatsApp você pode alcançar muito mais pessoas por dia aumentando muito mais o potencial das campanhas.',
      footerKind: 'whatsapp_business_api',
      cardActive: true,
    },
  },
  {
    key: 'rcs',
    name: 'RCS',
    icon: RiWirelessChargingLine,
    isAvailable: false,
    isBeta: true,
    supportsImage: false,
    badgeLabel: 'Em breve',
    badgeColorPalette: 'gray',
    disabledReason: 'Canal em beta/indisponível para iniciar campanhas.',
    channelsPage: {
      description:
        'O sucessor do SMS com suporte a imagens, botões e carrosséis. Comunique-se de forma mais rica e interativa diretamente na caixa de mensagens nativa.',
      footerKind: 'coming_soon',
      cardActive: false,
    },
  },
  {
    key: 'push_notification',
    name: 'Push Notification',
    icon: MdOutlineNotificationsActive,
    isAvailable: false,
    isBeta: true,
    supportsImage: true,
    badgeLabel: 'Em breve',
    badgeColorPalette: 'gray',
    disabledReason: 'Canal em beta/indisponível para iniciar campanhas.',
    channelsPage: {
      description:
        'Notifique seus clientes em tempo real diretamente no navegador ou dispositivo, mesmo quando não estão no seu site.',
      footerKind: 'coming_soon',
      cardActive: false,
    },
  },
]
