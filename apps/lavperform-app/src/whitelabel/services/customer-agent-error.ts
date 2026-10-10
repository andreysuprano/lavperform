export const CUSTOMER_AGENT_FALLBACK =
  'Desculpe, não consegui concluir agora. Pode enviar sua mensagem de novo?'

export function customerFacingAgentError(message: string | undefined): string {
  const text = message?.trim() ?? ''
  if (
    !text ||
    /lav\s*ai|falha na integração|econnaborted|sem resposta http|a resposta falhou/i.test(text)
  ) {
    return CUSTOMER_AGENT_FALLBACK
  }
  return text
}
