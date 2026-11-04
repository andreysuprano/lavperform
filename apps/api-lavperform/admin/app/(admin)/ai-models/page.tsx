"use client"

import { AiModelsForm } from "@/features/ai-models/components/ai-models-form"

export default function AiModelsPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold tracking-tight">Modelos de IA</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o modelo de texto e o modelo de imagem usados na geração de
          posts. Se não houver escolha salva, ou se o modelo deixar de existir,
          o sistema usa a variável de ambiente e, em seguida, o padrão.
        </p>
      </div>
      <AiModelsForm />
    </div>
  )
}
