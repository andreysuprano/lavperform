"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  globalWebhookSchema,
  type GlobalWebhookInput,
} from "../schemas"
import type { GlobalWebhookConfig } from "../types"
import { useGlobalWebhook, useSetGlobalWebhook } from "../whatsapp-queries"

export function GlobalWebhookSection() {
  const webhookQuery = useGlobalWebhook()
  const setWebhookMutation = useSetGlobalWebhook()

  const form = useForm<GlobalWebhookInput>({
    resolver: zodResolver(globalWebhookSchema),
    defaultValues: getDefaultValues(webhookQuery.data),
  })

  useEffect(() => {
    if (webhookQuery.data) {
      form.reset(getDefaultValues(webhookQuery.data))
    }
  }, [webhookQuery.data, form])

  function handleSubmit(values: GlobalWebhookInput) {
    setWebhookMutation.mutate(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook global</CardTitle>
        <CardDescription>
          Configuração do webhook que recebe eventos de todas as instâncias do
          servidor UAZAPI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {webhookQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando configuração...
          </div>
        ) : webhookQuery.error ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-destructive">
              {(webhookQuery.error as Error).message}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => webhookQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <Field orientation="horizontal">
              <Checkbox
                id="webhook-enabled"
                checked={form.watch("enabled")}
                onCheckedChange={(checked) =>
                  form.setValue("enabled", checked === true)
                }
              />
              <FieldLabel htmlFor="webhook-enabled">Webhook habilitado</FieldLabel>
            </Field>

            <Field>
              <FieldLabel htmlFor="webhook-url">URL de destino</FieldLabel>
              <Input
                id="webhook-url"
                placeholder="https://api.foodcrm.fun/whatsapp/webhook"
                {...form.register("url")}
              />
              <FieldError>{form.formState.errors.url?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="webhook-events">Eventos</FieldLabel>
              <Input
                id="webhook-events"
                placeholder="connection, messages"
                {...form.register("events")}
              />
              <FieldDescription>
                Separe os eventos por vírgula (ex: connection, messages).
              </FieldDescription>
            </Field>

            {webhookQuery.data && (
              <details className="rounded-md border bg-muted/30 p-3 text-xs">
                <summary className="cursor-pointer font-medium">
                  Resposta bruta da UAZAPI
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                  {JSON.stringify(webhookQuery.data, null, 2)}
                </pre>
              </details>
            )}

            <div>
              <Button type="submit" disabled={setWebhookMutation.isPending}>
                {setWebhookMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar webhook"
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function getDefaultValues(config?: GlobalWebhookConfig): GlobalWebhookInput {
  const events = Array.isArray(config?.events)
    ? config.events.join(", ")
    : ""

  return {
    enabled: config?.enabled ?? false,
    url: typeof config?.url === "string" ? config.url : "",
    events,
  }
}
