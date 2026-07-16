export type EventType =
  | 'purchase'           // Compra realizada
  | 'repurchase'         // Recompra
  | 'coupon_received'    // Recebeu cupom
  | 'message_sent'       // Mensagem enviada
  | 'rfv_changed'        // Mudança de status RFV
  | 'campaign_entered'   // Entrou em campanha
  | 'campaign_exited'    // Saiu de campanha
  | 'risk_detected'      // Cliente em risco
  | 'recovered'          // Cliente recuperado

export type MessageChannel = 'whatsapp' | 'email' | 'app' | 'sms'

export interface Campaign {
  id: string
  name: string
  icon?: string
}

export interface TimelineEvent {
  id: string
  type: EventType
  timestamp: string // ISO 8601
  title: string
  description?: string
  
  // Dados específicos por tipo
  purchase?: {
    channel: string
    amount: number
  }
  
  message?: {
    channel: MessageChannel
    preview: string
    fullContent: string
  }
  
  rfvChange?: {
    from: string
    to: string
  }
  
  campaign?: Campaign
}
