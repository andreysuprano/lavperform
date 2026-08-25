"use client"

import { useEffect } from "react"
import { useAppRouter } from "@/hooks/use-app-router"
import { Loader2 } from "lucide-react"
import { Controller, useForm, type Control, type Resolver, type SubmitHandler } from "react-hook-form"
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
import { FirebaseLegacyImagesUploadField } from "@/components/firebase-image-upload-field"

import {
  useAutomaticCampaign,
  useUpdateAutomaticCampaign,
} from "../../campaigns-queries"
import {
  automaticCampaignFormSchema,
  type AutomaticCampaignFormInput,
  type UpdateAutomaticCampaignInput,
} from "../../schemas"
import {
  AUTOMATIC_CAMPAIGN_STATUS_VALUES,
  AUTOMATIC_CAMPAIGN_TYPE_VALUES,
  CAMPAIGN_CHANNEL_VALUES,
} from "../../types"
import {
  AUTOMATIC_CAMPAIGN_STATUS_LABELS,
  AUTOMATIC_CAMPAIGN_TYPE_LABELS,
  CHANNEL_LABELS,
  buildSendScheduleApiFields,
  fromDatetimeLocalValue,
  inferSendScheduleMode,
  toDatetimeLocalValue,
} from "../../utils"
import { CompanyReadonlyField } from "../company-readonly-field"
import { CouponSelect } from "../coupon-select"
import {
  AutomaticCampaignFormNotice,
  CreativesFieldArray,
  DaysOfWeekField,
  GiftsFieldArray,
  SendScheduleField,
} from "./automatic-campaign-form-fields"

export function AutomaticCampaignEditForm({
  campaignId,
}: {
  campaignId: string
}) {
  const router = useAppRouter()
  const campaignQuery = useAutomaticCampaign(campaignId)
  const updateMutation = useUpdateAutomaticCampaign(campaignId)

  const form = useForm<AutomaticCampaignFormInput>({
    resolver: zodResolver(
      automaticCampaignFormSchema
    ) as Resolver<AutomaticCampaignFormInput>,
    defaultValues: {
      name: "",
      type: "REACTIVATION",
      segmentation: "",
      startDate: "",
      endDate: "",
      messageText: "",
      channel: "WHATSAPP_WEB",
      maxDailySends: 50,
      active: true,
      showSalesOnCard: true,
      images: "",
      daysOfWeek: [],
      sendScheduleMode: "establishment",
      sendTimeStart: "",
      sendTimeEnd: "",
      couponId: "",
      gifts: [],
      creatives: [],
      status: "PROCESSING",
    },
  })

  useEffect(() => {
    const campaign = campaignQuery.data
    if (!campaign) return
    form.reset({
      companyId: campaign.companyId,
      name: campaign.name,
      type: campaign.type,
      segmentation: campaign.segmentation,
      startDate: toDatetimeLocalValue(campaign.startDate),
      endDate: campaign.endDate
        ? toDatetimeLocalValue(campaign.endDate)
        : "",
      messageText: campaign.messageText,
      channel: campaign.channel,
      maxDailySends: campaign.maxDailySends,
      active: campaign.active,
      showSalesOnCard: campaign.showSalesOnCard ?? true,
      images: campaign.images ?? "",
      daysOfWeek: campaign.daysOfWeek ?? [],
      sendScheduleMode: inferSendScheduleMode(
        campaign.sendTimeStart,
        campaign.sendTimeEnd
      ),
      sendTimeStart: campaign.sendTimeStart ?? "",
      sendTimeEnd: campaign.sendTimeEnd ?? "",
      couponId: campaign.couponId ?? "",
      gifts: (campaign.gifts ?? []).map((g) => ({
        type: g.type,
        unit: g.unit,
        value: Number(g.value),
      })),
      creatives: (campaign.creatives ?? []).map((c) => ({
        title: c.title,
        message: c.message,
        imageUrls: c.imageUrls ?? [],
        link: c.link ?? "",
      })),
      status: campaign.status,
    })
  }, [campaignQuery.data, form])

  const onSubmit: SubmitHandler<AutomaticCampaignFormInput> = async (
    values
  ) => {
    const {
      companyId: _companyId,
      sendScheduleMode,
      sendTimeStart,
      sendTimeEnd,
      ...rest
    } = values
    try {
      const sendSchedule = buildSendScheduleApiFields(
        sendScheduleMode ?? "establishment",
        sendTimeStart,
        sendTimeEnd
      )

      const payload: UpdateAutomaticCampaignInput = {
        ...rest,
        startDate: values.startDate
          ? fromDatetimeLocalValue(values.startDate)
          : undefined,
        endDate: values.endDate
          ? fromDatetimeLocalValue(values.endDate)
          : values.endDate === ""
            ? null
            : undefined,
        images: values.images?.trim() ? values.images : undefined,
        couponId: values.couponId === "" ? null : values.couponId,
        status: values.status,
        gifts: values.gifts,
        creatives: values.creatives?.map((c) => ({
          ...c,
          link: c.link === "" ? null : c.link,
        })),
        ...sendSchedule,
      }

      await updateMutation.mutateAsync(payload)
      router.push(`/campaigns/automatic/${campaignId}`)
    } catch {
      // Toast no hook
    }
  }

  if (campaignQuery.isLoading) {
    return <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
  }

  if (campaignQuery.error || !campaignQuery.data) {
    return (
      <p className="text-sm text-destructive">
        {campaignQuery.error?.message ?? "Campanha não encontrada"}
      </p>
    )
  }

  if (campaignQuery.data.deletedAt) {
    return (
      <p className="text-sm text-muted-foreground">
        Campanhas excluídas não podem ser editadas. Restaure-a primeiro.
      </p>
    )
  }

  const { errors } = form.formState

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4 md:gap-6"
    >
      <AutomaticCampaignFormNotice isEdit />

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

            <div className="grid gap-5 md:grid-cols-3">
              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="type">Tipo</FieldLabel>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(typeof value === "string" ? value : field.value)
                      }
                    >
                      <SelectTrigger id="type" className="w-full">
                        <SelectValueLabel labels={AUTOMATIC_CAMPAIGN_TYPE_LABELS} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {AUTOMATIC_CAMPAIGN_TYPE_VALUES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {AUTOMATIC_CAMPAIGN_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{errors.type?.message}</FieldError>
              </Field>

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
                        <SelectValueLabel labels={AUTOMATIC_CAMPAIGN_STATUS_LABELS} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {AUTOMATIC_CAMPAIGN_STATUS_VALUES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {AUTOMATIC_CAMPAIGN_STATUS_LABELS[status]}
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

            <Field data-invalid={!!errors.segmentation}>
              <FieldLabel htmlFor="segmentation">Segmentação</FieldLabel>
              <Input id="segmentation" {...form.register("segmentation")} />
              <FieldError>{errors.segmentation?.message}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
              <Field data-invalid={!!errors.startDate}>
                <FieldLabel htmlFor="startDate">Data de início</FieldLabel>
                <Input
                  id="startDate"
                  type="datetime-local"
                  {...form.register("startDate")}
                />
                <FieldError>{errors.startDate?.message}</FieldError>
              </Field>

              <Field data-invalid={!!errors.endDate}>
                <FieldLabel htmlFor="endDate">Data de fim</FieldLabel>
                <Input
                  id="endDate"
                  type="datetime-local"
                  {...form.register("endDate")}
                />
                <FieldDescription>Deixe vazio para remover prazo.</FieldDescription>
                <FieldError>{errors.endDate?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel>Dias da semana</FieldLabel>
              <DaysOfWeekField control={form.control as Control<AutomaticCampaignFormInput>} />
            </Field>

            <SendScheduleField
              control={form.control as Control<AutomaticCampaignFormInput>}
              errors={errors}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo legacy</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.messageText}>
              <FieldLabel htmlFor="messageText">Mensagem</FieldLabel>
              <Textarea id="messageText" rows={4} {...form.register("messageText")} />
              <FieldError>{errors.messageText?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.images}>
              <FieldLabel>Imagens legacy</FieldLabel>
              <Controller
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FirebaseLegacyImagesUploadField
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    folder={`campaigns/automatic/${campaignId}/legacy`}
                  />
                )}
              />
              <FieldError>{errors.images?.message}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criativos</CardTitle>
        </CardHeader>
        <CardContent>
          <CreativesFieldArray control={form.control as Control<AutomaticCampaignFormInput>} errors={errors} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brindes</CardTitle>
        </CardHeader>
        <CardContent>
          <GiftsFieldArray control={form.control as Control<AutomaticCampaignFormInput>} errors={errors} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-5 md:grid-cols-2">
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

              <Field data-invalid={!!errors.couponId}>
                <FieldLabel htmlFor="couponId">Cupom</FieldLabel>
                <Controller
                  control={form.control}
                  name="couponId"
                  render={({ field }) => (
                    <CouponSelect
                      id="couponId"
                      companyId={campaignQuery.data.companyId}
                      value={field.value || null}
                      onChange={(value) => field.onChange(value ?? "")}
                      currentCoupon={campaignQuery.data.coupon}
                      placeholder="Nenhum cupom"
                    />
                  )}
                />
                <FieldDescription>Deixe vazio para desvincular.</FieldDescription>
                <FieldError>{errors.couponId?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Controller
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                Campanha ativa
              </label>
            </Field>

            <Field>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Controller
                  control={form.control}
                  name="showSalesOnCard"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  )}
                />
                <span className="space-y-1">
                  <span className="block">Mostrar vendas no card</span>
                  <span className="block text-xs text-muted-foreground">
                    Quando ligado, a quantidade de vendas aparece no card
                    somente se for maior que zero.
                  </span>
                </span>
              </label>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-2 md:flex-row md:items-center md:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/campaigns/automatic/${campaignId}`)}
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
