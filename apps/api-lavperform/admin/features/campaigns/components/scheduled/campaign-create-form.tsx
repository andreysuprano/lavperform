"use client"

import { useAppRouter } from "@/hooks/use-app-router"
import { Loader2 } from "lucide-react"
import { Controller, useForm, type Resolver, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SelectValueLabel } from "@/components/select-value-label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FirebaseImageUploadField } from "@/components/firebase-image-upload-field"

import { useCreateCampaign } from "../../campaigns-queries"
import { createCampaignSchema, type CreateCampaignInput } from "../../schemas"
import { CAMPAIGN_CHANNEL_VALUES } from "../../types"
import { CHANNEL_LABELS, fromDatetimeLocalValue } from "../../utils"
import { CompanySelect } from "../company-select"

export function CampaignCreateForm() {
  const router = useAppRouter()
  const createMutation = useCreateCampaign()

  const form = useForm<CreateCampaignInput>({
    resolver: zodResolver(createCampaignSchema) as Resolver<CreateCampaignInput>,
    defaultValues: {
      companyId: "",
      name: "",
      scheduledDate: "",
      messageText: "",
      segmentation: "",
      maxDailySends: 50,
      imageUrl: "",
      modifiedByAI: false,
      channel: "WHATSAPP_WEB",
    },
  })

  const onSubmit: SubmitHandler<CreateCampaignInput> = async (values) => {
    try {
      const created = await createMutation.mutateAsync({
        ...values,
        scheduledDate: fromDatetimeLocalValue(values.scheduledDate),
        imageUrl: values.imageUrl || undefined,
      })
      router.push(`/campaigns/${created.id}`)
    } catch {
      // Toast no hook
    }
  }

  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 md:gap-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>Empresa e nome da campanha.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.companyId}>
                <FieldLabel htmlFor="companyId">Empresa</FieldLabel>
                <Controller
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <CompanySelect
                      id="companyId"
                      value={field.value || null}
                      onChange={(value) => field.onChange(value ?? "")}
                      placeholder="Selecione a empresa"
                    />
                  )}
                />
                <FieldError>{errors.companyId?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" {...form.register("name")} />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamento</CardTitle>
          <CardDescription>Data e hora previstas para envio.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!errors.scheduledDate}>
            <FieldLabel htmlFor="scheduledDate">Data agendada</FieldLabel>
            <Input
              id="scheduledDate"
              type="datetime-local"
              {...form.register("scheduledDate")}
            />
            <FieldDescription>Use o horário local; será convertido para UTC.</FieldDescription>
            <FieldError>{errors.scheduledDate?.message}</FieldError>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo</CardTitle>
          <CardDescription>Mensagem e segmentação dos destinatários.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.messageText}>
              <FieldLabel htmlFor="messageText">Mensagem</FieldLabel>
              <Textarea
                id="messageText"
                rows={4}
                {...form.register("messageText")}
              />
              <FieldError>{errors.messageText?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.segmentation}>
              <FieldLabel htmlFor="segmentation">Segmentação</FieldLabel>
              <Input
                id="segmentation"
                placeholder="clientes_ativos"
                {...form.register("segmentation")}
              />
              <FieldError>{errors.segmentation?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.imageUrl}>
              <FieldLabel>Imagem</FieldLabel>
              <Controller
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FirebaseImageUploadField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    folder="campaigns/scheduled"
                  />
                )}
              />
              <FieldError>{errors.imageUrl?.message}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.channel}>
                <FieldLabel htmlFor="channel">Canal</FieldLabel>
                <Controller
                  control={form.control}
                  name="channel"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(typeof value === "string" ? value : field.value)
                      }
                    >
                      <SelectTrigger id="channel" className="w-full">
                        <SelectValueLabel labels={CHANNEL_LABELS} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CAMPAIGN_CHANNEL_VALUES.map((channel) => (
                            <SelectItem key={channel} value={channel}>
                              {CHANNEL_LABELS[channel]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{errors.channel?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.maxDailySends}>
                <FieldLabel htmlFor="maxDailySends">Máx. envios/dia</FieldLabel>
                <Input
                  id="maxDailySends"
                  type="number"
                  min={1}
                  {...form.register("maxDailySends", { valueAsNumber: true })}
                />
                <FieldError>{errors.maxDailySends?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Controller
                  control={form.control}
                  name="modifiedByAI"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                Modificada por IA
              </label>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-2 md:flex-row md:items-center md:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/campaigns?tab=scheduled")}
          disabled={createMutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Criando...
            </>
          ) : (
            "Criar campanha"
          )}
        </Button>
      </div>
    </form>
  )
}
