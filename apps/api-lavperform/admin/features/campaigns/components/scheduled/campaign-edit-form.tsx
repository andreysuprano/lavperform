"use client"

import { useEffect } from "react"
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

import { useCampaign, useUpdateCampaign } from "../../campaigns-queries"
import { updateCampaignSchema, type UpdateCampaignInput } from "../../schemas"
import {
  CAMPAIGN_CHANNEL_VALUES,
  CAMPAIGN_STATUS_VALUES,
} from "../../types"
import {
  CAMPAIGN_STATUS_LABELS,
  CHANNEL_LABELS,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../../utils"
import { CompanyReadonlyField } from "../company-readonly-field"

export function CampaignEditForm({ campaignId }: { campaignId: string }) {
  const router = useAppRouter()
  const campaignQuery = useCampaign(campaignId)
  const updateMutation = useUpdateCampaign(campaignId)

  const form = useForm<UpdateCampaignInput>({
    resolver: zodResolver(updateCampaignSchema) as Resolver<UpdateCampaignInput>,
    defaultValues: {
      name: "",
      scheduledDate: "",
      messageText: "",
      segmentation: "",
      maxDailySends: 50,
      imageUrl: "",
      modifiedByAI: false,
      channel: "WHATSAPP_WEB",
      trakingCode: "",
      status: "WAITING",
    },
  })

  useEffect(() => {
    const campaign = campaignQuery.data
    if (!campaign) return
    form.reset({
      name: campaign.name,
      scheduledDate: toDatetimeLocalValue(campaign.scheduledDate),
      messageText: campaign.messageText,
      segmentation: campaign.segmentation,
      maxDailySends: campaign.maxDailySends,
      imageUrl: campaign.imageUrl ?? "",
      modifiedByAI: campaign.modifiedByAI,
      channel: campaign.channel,
      trakingCode: campaign.trakingCode ?? "",
      status: campaign.status,
    })
  }, [campaignQuery.data, form])

  const onSubmit: SubmitHandler<UpdateCampaignInput> = async (values) => {
    const { companyId: _companyId, ...payload } = values
    try {
      await updateMutation.mutateAsync({
        ...payload,
        scheduledDate: values.scheduledDate
          ? fromDatetimeLocalValue(values.scheduledDate)
          : undefined,
        imageUrl: values.imageUrl === "" ? null : values.imageUrl,
        trakingCode: values.trakingCode === "" ? null : values.trakingCode,
      })
      router.push(`/campaigns/${campaignId}`)
    } catch {
      // Toast no hook
    }
  }

  if (campaignQuery.isLoading) {
    return (
      <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
    )
  }

  if (campaignQuery.error || !campaignQuery.data) {
    return (
      <p className="text-sm text-destructive">
        {campaignQuery.error?.message ?? "Campanha não encontrada"}
      </p>
    )
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
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <CompanyReadonlyField
                companyId={campaignQuery.data.companyId}
                companyName={campaignQuery.data.company?.name}
              />

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
          <CardTitle>Agendamento e status</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.scheduledDate}>
                <FieldLabel htmlFor="scheduledDate">Data agendada</FieldLabel>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  {...form.register("scheduledDate")}
                />
                <FieldError>{errors.scheduledDate?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.status}>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(typeof value === "string" ? value : field.value)
                      }
                    >
                      <SelectTrigger id="status" className="w-full">
                        <SelectValueLabel labels={CAMPAIGN_STATUS_LABELS} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {CAMPAIGN_STATUS_VALUES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {CAMPAIGN_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{errors.status?.message}</FieldError>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.messageText}>
              <FieldLabel htmlFor="messageText">Mensagem</FieldLabel>
              <Textarea id="messageText" rows={4} {...form.register("messageText")} />
              <FieldError>{errors.messageText?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.segmentation}>
              <FieldLabel htmlFor="segmentation">Segmentação</FieldLabel>
              <Input id="segmentation" {...form.register("segmentation")} />
              <FieldError>{errors.segmentation?.message}</FieldError>
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.imageUrl}>
                <FieldLabel>Imagem</FieldLabel>
                <Controller
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FirebaseImageUploadField
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      folder={`campaigns/scheduled/${campaignId}`}
                    />
                  )}
                />
                <FieldError>{errors.imageUrl?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.trakingCode}>
                <FieldLabel htmlFor="trakingCode">Código de rastreio</FieldLabel>
                <Input id="trakingCode" {...form.register("trakingCode")} />
                <FieldError>{errors.trakingCode?.message}</FieldError>
              </Field>
            </div>
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
          onClick={() => router.push(`/campaigns/${campaignId}`)}
          disabled={updateMutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </div>
    </form>
  )
}
