"use client"

import { PlusIcon, TrashIcon } from "lucide-react"
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FirebaseImagesUploadField } from "@/components/firebase-image-upload-field"

import type { AutomaticCampaignFormInput } from "../../schemas"
import { DAYS_OF_WEEK_OPTIONS, type SendScheduleMode } from "../../utils"

type FormInput = AutomaticCampaignFormInput

export function CreativesFieldArray({
  control,
  errors,
}: {
  control: Control<FormInput>
  errors: FieldErrors<FormInput>
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "creatives",
  })

  const creativeErrors = errors.creatives

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-lg border bg-muted/20 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Criativo {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(index)}
            >
              <TrashIcon />
            </Button>
          </div>
          <FieldGroup>
            <Field data-invalid={!!creativeErrors?.[index]?.title}>
              <FieldLabel>Título</FieldLabel>
              <Controller
                control={control}
                name={`creatives.${index}.title`}
                render={({ field: f }) => <Input {...f} />}
              />
              <FieldError>
                {creativeErrors?.[index]?.title?.message}
              </FieldError>
            </Field>
            <Field data-invalid={!!creativeErrors?.[index]?.message}>
              <FieldLabel>Mensagem</FieldLabel>
              <Controller
                control={control}
                name={`creatives.${index}.message`}
                render={({ field: f }) => <Textarea rows={3} {...f} />}
              />
              <FieldError>
                {creativeErrors?.[index]?.message?.message}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel>Imagens</FieldLabel>
              <Controller
                control={control}
                name={`creatives.${index}.imageUrls`}
                render={({ field: f }) => (
                  <FirebaseImagesUploadField
                    value={f.value ?? []}
                    onChange={f.onChange}
                    folder={`campaigns/automatic/creatives/${index + 1}`}
                  />
                )}
              />
            </Field>
            <Field>
              <FieldLabel>Link</FieldLabel>
              <Controller
                control={control}
                name={`creatives.${index}.link`}
                render={({ field: f }) => (
                  <Input
                    type="url"
                    value={f.value ?? ""}
                    onChange={(event) => f.onChange(event.target.value)}
                  />
                )}
              />
            </Field>
          </FieldGroup>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          append({ title: "", message: "", imageUrls: [], link: "" })
        }
      >
        <PlusIcon />
        Adicionar criativo
      </Button>
    </div>
  )
}

export function GiftsFieldArray({
  control,
  errors,
}: {
  control: Control<FormInput>
  errors: FieldErrors<FormInput>
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "gifts",
  })

  const giftErrors = errors.gifts

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="rounded-lg border bg-muted/20 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Brinde {index + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(index)}
            >
              <TrashIcon />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field data-invalid={!!giftErrors?.[index]?.type}>
              <FieldLabel>Tipo</FieldLabel>
              <Controller
                control={control}
                name={`gifts.${index}.type`}
                render={({ field: f }) => (
                  <Input placeholder="desconto" {...f} />
                )}
              />
              <FieldError>{giftErrors?.[index]?.type?.message}</FieldError>
            </Field>
            <Field data-invalid={!!giftErrors?.[index]?.unit}>
              <FieldLabel>Unidade</FieldLabel>
              <Controller
                control={control}
                name={`gifts.${index}.unit`}
                render={({ field: f }) => (
                  <Input placeholder="porcentagem" {...f} />
                )}
              />
              <FieldError>{giftErrors?.[index]?.unit?.message}</FieldError>
            </Field>
            <Field data-invalid={!!giftErrors?.[index]?.value}>
              <FieldLabel>Valor</FieldLabel>
              <Controller
                control={control}
                name={`gifts.${index}.value`}
                render={({ field: f }) => (
                  <Input type="number" min={0} {...f} />
                )}
              />
              <FieldError>{giftErrors?.[index]?.value?.message}</FieldError>
            </Field>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ type: "", unit: "", value: 0 })}
      >
        <PlusIcon />
        Adicionar brinde
      </Button>
    </div>
  )
}

export function DaysOfWeekField({
  control,
}: {
  control: Control<FormInput>
}) {
  return (
    <Controller
      control={control}
      name="daysOfWeek"
      render={({ field }) => {
        const selected = new Set(field.value ?? [])
        return (
          <div className="flex flex-wrap gap-3">
            {DAYS_OF_WEEK_OPTIONS.map((day) => (
              <label
                key={day.value}
                className="flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <Checkbox
                  checked={selected.has(day.value)}
                  onCheckedChange={(checked) => {
                    const next = new Set(selected)
                    if (checked) next.add(day.value)
                    else next.delete(day.value)
                    field.onChange(Array.from(next))
                  }}
                />
                {day.label}
              </label>
            ))}
          </div>
        )
      }}
    />
  )
}

const SEND_SCHEDULE_OPTIONS: Array<{
  value: SendScheduleMode
  label: string
  description: string
}> = [
  {
    value: "establishment",
    label: "Horário de funcionamento",
    description: "Usa o horário cadastrado na empresa.",
  },
  {
    value: "fixed",
    label: "Horário fixo",
    description: "Todas as mensagens do dia no mesmo horário.",
  },
  {
    value: "range",
    label: "Intervalo de horário",
    description: "Distribui envios aleatoriamente no intervalo.",
  },
]

export function SendScheduleField({
  control,
  errors,
}: {
  control: Control<FormInput>
  errors: FieldErrors<FormInput>
}) {
  return (
    <FieldGroup>
      <Field data-invalid={!!errors.sendScheduleMode}>
        <FieldLabel>Horário de envio</FieldLabel>
        <Controller
          control={control}
          name="sendScheduleMode"
          render={({ field }) => (
            <Select
              value={field.value ?? "establishment"}
              onValueChange={field.onChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o modo de horário" />
              </SelectTrigger>
              <SelectContent>
                {SEND_SCHEDULE_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{errors.sendScheduleMode?.message}</FieldError>
      </Field>

      <Controller
        control={control}
        name="sendScheduleMode"
        render={({ field: modeField }) => {
          if (modeField.value === "fixed") {
            return (
              <Field data-invalid={!!errors.sendTimeStart}>
                <FieldLabel htmlFor="sendTimeStart">Horário fixo</FieldLabel>
                <Controller
                  control={control}
                  name="sendTimeStart"
                  render={({ field }) => (
                    <Input
                      id="sendTimeStart"
                      type="time"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FieldError>{errors.sendTimeStart?.message}</FieldError>
              </Field>
            )
          }

          if (modeField.value === "range") {
            return (
              <div className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={!!errors.sendTimeStart}>
                  <FieldLabel htmlFor="sendTimeStart">Início</FieldLabel>
                  <Controller
                    control={control}
                    name="sendTimeStart"
                    render={({ field }) => (
                      <Input
                        id="sendTimeStart"
                        type="time"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldError>{errors.sendTimeStart?.message}</FieldError>
                </Field>
                <Field data-invalid={!!errors.sendTimeEnd}>
                  <FieldLabel htmlFor="sendTimeEnd">Fim</FieldLabel>
                  <Controller
                    control={control}
                    name="sendTimeEnd"
                    render={({ field }) => (
                      <Input
                        id="sendTimeEnd"
                        type="time"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldError>{errors.sendTimeEnd?.message}</FieldError>
                </Field>
              </div>
            )
          }

          return (
            <FieldDescription>
              {
                SEND_SCHEDULE_OPTIONS.find(
                  (option) => option.value === (modeField.value ?? "establishment")
                )?.description
              }
            </FieldDescription>
          )
        }}
      />
    </FieldGroup>
  )
}

export function AutomaticCampaignFormNotice({ isEdit }: { isEdit?: boolean }) {
  if (!isEdit) return null
  return (
    <FieldDescription className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-amber-800 dark:text-amber-200">
      Ao salvar com criativos ou brindes, os registros existentes serão
      substituídos completamente. A campanha será reenfileirada automaticamente.
    </FieldDescription>
  )
}
