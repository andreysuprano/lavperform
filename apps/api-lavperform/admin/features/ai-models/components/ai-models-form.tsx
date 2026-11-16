"use client"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"

import { useAiModels, useSaveAiModels } from "../ai-models-queries"
import { MODEL_SOURCE_LABEL } from "../types"
import { ModelSelect } from "./model-select"

export function AiModelsForm() {
  const modelsQuery = useAiModels()
  const saveModels = useSaveAiModels()
  const view = modelsQuery.data
  const viewKey = view
    ? `${view.text.stored ?? ""}:${view.text.model}:${view.image.stored ?? ""}:${view.image.model}`
    : ""
  const [draft, setDraft] = useState<{
    key: string
    textModel: string
    imageModel: string
  } | null>(null)

  if (view && draft?.key !== viewKey) {
    setDraft({
      key: viewKey,
      textModel: view.text.stored ?? view.text.model,
      imageModel: view.image.stored ?? view.image.model,
    })
  }

  const textModel = draft?.key === viewKey ? draft.textModel : ""
  const imageModel = draft?.key === viewKey ? draft.imageModel : ""

  if (modelsQuery.isLoading) {
    return (
      <div className="h-64 max-w-3xl animate-pulse rounded-xl bg-muted" />
    )
  }

  if (!view) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Modelos de IA</CardTitle>
          <CardDescription>
            Não foi possível carregar a lista da OpenRouter.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            onClick={() => void modelsQuery.refetch()}
          >
            Tentar de novo
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const catalogReady = view.catalogAvailable && view.models.length > 0

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>OpenRouter</CardTitle>
        <CardDescription>
          Único provedor desta geração. A lista vem da API de modelos. O
          seletor de imagem mostra só quem devolve imagem. Salvar grava no
          banco e a próxima geração lê essa escolha, sem novo deploy.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!view.catalogAvailable ? (
          <p className="text-sm text-destructive">
            A OpenRouter não devolveu a lista agora. Dá para ver o que está em
            uso, mas escolher outro modelo exige a lista.
          </p>
        ) : null}

        <Field>
          <div className="flex flex-wrap items-center gap-2">
            <FieldLabel htmlFor="text-model">Modelo de texto</FieldLabel>
            <Badge variant="outline">{MODEL_SOURCE_LABEL[view.text.source]}</Badge>
          </div>
          <FieldDescription>
            Legendas e variações dos posts. Em uso: {view.text.model}
          </FieldDescription>
          <ModelSelect
            id="text-model"
            models={view.models}
            value={textModel}
            onChange={(value) =>
              setDraft((current) =>
                current ? { ...current, textModel: value } : current
              )
            }
            disabled={!catalogReady || saveModels.isPending}
            placeholder="Modelo de texto"
          />
        </Field>

        <Field>
          <div className="flex flex-wrap items-center gap-2">
            <FieldLabel htmlFor="image-model">Modelo de imagem</FieldLabel>
            <Badge variant="outline">
              {MODEL_SOURCE_LABEL[view.image.source]}
            </Badge>
          </div>
          <FieldDescription>
            Fundo dos posts. Só modelos com saída de imagem. Em uso:{" "}
            {view.image.model}
          </FieldDescription>
          <ModelSelect
            id="image-model"
            models={view.imageModels}
            value={imageModel}
            onChange={(value) =>
              setDraft((current) =>
                current ? { ...current, imageModel: value } : current
              )
            }
            disabled={!catalogReady || saveModels.isPending}
            placeholder="Modelo de imagem"
          />
        </Field>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          disabled={!catalogReady || saveModels.isPending || !textModel || !imageModel}
          onClick={() =>
            saveModels.mutate({ textModel, imageModel })
          }
        >
          {saveModels.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button
          variant="outline"
          disabled={saveModels.isPending}
          onClick={() =>
            saveModels.mutate({ textModel: null, imageModel: null })
          }
        >
          Restaurar padrão
        </Button>
      </CardFooter>
    </Card>
  )
}
