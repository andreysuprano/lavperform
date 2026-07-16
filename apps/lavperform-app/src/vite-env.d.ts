/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL absoluta HTTPS para placeholder quando o criativo não tem imagem (campanha automática). */
  readonly VITE_AUTOMATIC_CAMPAIGN_EMPTY_CREATIVE_IMAGE_URL?: string
}
