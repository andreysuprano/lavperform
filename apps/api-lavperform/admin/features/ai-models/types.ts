export type ModelSource = "database" | "environment" | "default"

export type AiModelOption = {
  id: string
  name: string
  imageOutput: boolean
}

export type AiModelChoice = {
  model: string
  source: ModelSource
  stored: string | null
}

export type AiModelsView = {
  provider: "openrouter"
  text: AiModelChoice
  image: AiModelChoice
  models: AiModelOption[]
  imageModels: AiModelOption[]
  catalogAvailable: boolean
}

export type SaveAiModelsInput = {
  textModel: string | null
  imageModel: string | null
}

export const MODEL_SOURCE_LABEL: Record<ModelSource, string> = {
  database: "Salvo no banco",
  environment: "Variável de ambiente",
  default: "Padrão do sistema",
}
