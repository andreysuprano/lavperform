export const META_PIXEL_CODE_MESSAGE =
  'Cole o código base do Pixel, o que o Gerenciador de Eventos mostra em Instalar código manualmente.'

export const GTM_CODE_MESSAGE =
  'Cole o código de instalação do Google Tag Manager, o que a tela de instalação mostra para o contêiner Web.'

export function trackingErrorMessage(error: unknown, fallback: string) {
  const message = (
    error as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message
  return typeof message === 'string' && message.length > 0 ? message : fallback
}
