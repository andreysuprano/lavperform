"use client"

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

import { useCreateAutomaticCampaign } from "../../campaigns-queries"
import {
  automaticCampaignFormSchema,
  type AutomaticCampaignFormInput,
  type CreateAutomaticCampaignInput,
} from "../../schemas"
import {
  AUTOMATIC_CAMPAIGN_TYPE_VALUES,
  CAMPAIGN_CHANNEL_VALUES,
} from "../../types"
import {
  AUTOMATIC_CAMPAIGN_TYPE_LABELS,
  CHANNEL_LABELS,
  buildSendScheduleApiFields,
  fromDatetimeLocalValue,
} from "../../utils"
import { CompanySelect } from "../company-select"
import { CouponSelect } from "../coupon-select"
import {
  CreativesFieldArray,
  DaysOfWeekField,
  GiftsFieldArray,
  SendScheduleField,
} from "./automatic-campaign-form-fields"

export function AutomaticCampaignCreateForm() {
  const router = useAppRouter()
  const createMutation = useCreateAutomaticCampaign()

  const form = useForm<AutomaticCampaignFormInput>({
    resolver: zodResolver(
      automaticCampaignFormSchema
    ) as Resolver<AutomaticCampaignFormInput>,
    defaultValues: {
      companyId: "",
      name: "",
      type: "REACTIVATION",
      segmentation: "",
      startDate: "",
      endDate: "",
      messageText: "",
      channel: "WHATSAPP_WEB",
      maxDailySends: 50,
      active: true,
      images: "",
      daysOfWeek: [],
      sendScheduleMode: "establishment",
      sendTimeStart: "",
      sendTimeEnd: "",
      couponId: "",
      gifts: [],
      creatives: [],
    },
  })

  const onSubmit: SubmitHandler<AutomaticCampaignFormInput> = async (
    values
  ) => {
    try {
      const { sendScheduleMode, sendTimeStart, sendTimeEnd, ...rest } = values
      const sendSchedule = buildSendScheduleApiFields(
        sendScheduleMode ?? "establishment",
        sendTimeStart,
        sendTimeEnd
      )

      const payload: CreateAutomaticCampaignInput = {
        ...rest,
        startDate: fromDatetimeLocalValue(values.startDate),
        endDate: values.endDate
          ? fromDatetimeLocalValue(values.endDate)
          : null,
        images: values.images?.trim() || undefined,
        couponId: values.couponId || null,
        gifts: values.gifts?.length ? values.gifts : [],
        creatives: values.creatives?.length ? values.creatives : [],
        ...sendSchedule,
      }

      const created = await createMutation.mutateAsync(payload)
      router.push(`/campaigns/automatic/${created.id}`)
    } catch {
      // Toast no hook
    }
  }

  const { errors } = form.formState
  const companyId = form.watch("companyId")

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
              <Field data-invalid={!!errors.companyId}>
                <FieldLabel htmlFor="companyId">Empresa</FieldLabel>
                <Controller
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <CompanySelect
                      id="companyId"
                      value={field.value || null}
                      onChange={(value) => {
                        field.onChange(value ?? "")
                        form.setValue("couponId", "")
                      }}
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

            <div className="grid gap-5 md:grid-cols-2">
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
                <FieldDescription>Opcional — deixe vazio para sem prazo.</FieldDescription>
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
          <CardDescription>
            Usado quando não há criativos configurados.
          </CardDescription>
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
                    folder="campaigns/automatic/legacy"
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
          <CardDescription>
            Cada envio escolhe aleatoriamente um criativo e uma imagem.
          </CardDescription>
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
                      companyId={companyId || null}
                      value={field.value || null}
                      onChange={(value) => field.onChange(value ?? "")}
                      placeholder="Nenhum cupom"
                    />
                  )}
                />
                <FieldDescription>Opcional. Apenas cupons ativos e vigentes.</FieldDescription>
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
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-stretch gap-2 md:flex-row md:items-center md:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/campaigns?tab=automatic")}
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
            "Criar campanha automática"
          )}
        </Button>
      </div>
    </form>
  )
}
