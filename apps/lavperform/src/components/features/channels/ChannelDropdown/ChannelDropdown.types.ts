import type { ElementType } from 'react'

export type DropdownChannel = {
  name: string
  icon: ElementType
  /** WhatsApp Web: card com status de conexão (QR / conectado). */
  showStatus?: boolean
  /** WhatsApp Business API: card com status da integração oficial Meta. */
  showMetaStatus?: boolean
  /** Canal disponível na plataforma (badge verde “Ativo”, sem fluxo de conexão no menu). */
  showActiveBadge?: boolean
}
