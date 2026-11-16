import { apiClient } from "@/services/api-client"

import type { AiModelsView, SaveAiModelsInput } from "./types"

export function getAiModels(): Promise<AiModelsView> {
  return apiClient<AiModelsView>("/admin/ai-models")
}

export function saveAiModels(input: SaveAiModelsInput): Promise<AiModelsView> {
  return apiClient<AiModelsView>("/admin/ai-models", {
    method: "PUT",
    body: JSON.stringify(input),
  })
}
