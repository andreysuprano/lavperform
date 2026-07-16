export interface Props {
  whatsapp: boolean
  email: boolean
  chat: boolean
  onWhatsAppToggle: (enabled: boolean) => void
  onEmailToggle: (enabled: boolean) => void
  onChatToggle: (enabled: boolean) => void
}
