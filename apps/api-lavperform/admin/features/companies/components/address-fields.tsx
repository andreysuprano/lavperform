"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Controller,
  useFormContext,
  type FieldErrors,
  type FieldValues,
} from "react-hook-form"

import {
  Field,
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

import { BRAZILIAN_STATES, fetchViaCep, onlyDigits } from "../utils"

type AddressFieldKey =
  | "zipCode"
  | "street"
  | "number"
  | "complement"
  | "neighborhood"
  | "city"
  | "state"

export function AddressFields({ namePrefix }: { namePrefix?: string }) {
  const form = useFormContext<FieldValues>()
  const [isLookingUpCep, setIsLookingUpCep] = useState(false)

  const path = (field: AddressFieldKey) =>
    namePrefix ? `${namePrefix}.${field}` : field

  function getError(field: AddressFieldKey): string | undefined {
    const errors = form.formState.errors
    if (namePrefix) {
      const nested = (errors as Record<string, FieldErrors>)[namePrefix]
      const err = (nested as Record<string, { message?: string }> | undefined)?.[
        field
      ]
      return err?.message as string | undefined
    }
    const err = (errors as Record<string, { message?: string }>)[field]
    return err?.message as string | undefined
  }

  async function handleZipBlur(value: string) {
    if (onlyDigits(value).length !== 8) return
    setIsLookingUpCep(true)
    try {
      const data = await fetchViaCep(value)
      if (!data) return
      const apply = (field: AddressFieldKey, val?: string) => {
        if (!val) return
        form.setValue(path(field), val, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
      apply("street", data.logradouro)
      apply("neighborhood", data.bairro)
      apply("city", data.localidade)
      apply("state", data.uf?.toUpperCase())
      if (data.complemento) apply("complement", data.complemento)
    } finally {
      setIsLookingUpCep(false)
    }
  }

  return (
    <FieldGroup>
      <div className="grid gap-5 md:grid-cols-3">
        <Field data-invalid={!!getError("zipCode")}>
          <FieldLabel htmlFor={path("zipCode")}>CEP</FieldLabel>
          <div className="relative">
            <Input
              id={path("zipCode")}
              inputMode="numeric"
              placeholder="00000-000"
              {...form.register(path("zipCode"), {
                onBlur: (event) => handleZipBlur(event.target.value),
              })}
            />
            {isLookingUpCep && (
              <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <FieldError>{getError("zipCode")}</FieldError>
        </Field>

        <Field className="md:col-span-2" data-invalid={!!getError("street")}>
          <FieldLabel htmlFor={path("street")}>Rua</FieldLabel>
          <Input id={path("street")} {...form.register(path("street"))} />
          <FieldError>{getError("street")}</FieldError>
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Field data-invalid={!!getError("number")}>
          <FieldLabel htmlFor={path("number")}>Número</FieldLabel>
          <Input id={path("number")} {...form.register(path("number"))} />
          <FieldError>{getError("number")}</FieldError>
        </Field>

        <Field
          className="md:col-span-2"
          data-invalid={!!getError("complement")}
        >
          <FieldLabel htmlFor={path("complement")}>Complemento</FieldLabel>
          <Input
            id={path("complement")}
            {...form.register(path("complement"))}
            placeholder="Opcional"
          />
          <FieldError>{getError("complement")}</FieldError>
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Field data-invalid={!!getError("neighborhood")}>
          <FieldLabel htmlFor={path("neighborhood")}>Bairro</FieldLabel>
          <Input
            id={path("neighborhood")}
            {...form.register(path("neighborhood"))}
          />
          <FieldError>{getError("neighborhood")}</FieldError>
        </Field>

        <Field data-invalid={!!getError("city")}>
          <FieldLabel htmlFor={path("city")}>Cidade</FieldLabel>
          <Input id={path("city")} {...form.register(path("city"))} />
          <FieldError>{getError("city")}</FieldError>
        </Field>

        <Field data-invalid={!!getError("state")}>
          <FieldLabel htmlFor={path("state")}>UF</FieldLabel>
          <Controller
            control={form.control}
            name={path("state")}
            render={({ field }) => (
              <Select
                value={(field.value as string | undefined) ?? ""}
                onValueChange={(value) =>
                  field.onChange(typeof value === "string" ? value : "")
                }
              >
                <SelectTrigger id={path("state")} className="w-full">
                  <SelectValueLabel
                    labels={Object.fromEntries(
                      BRAZILIAN_STATES.map((option) => [
                        option.value,
                        option.label,
                      ])
                    )}
                    placeholder="Selecione"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {BRAZILIAN_STATES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value} — {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError>{getError("state")}</FieldError>
        </Field>
      </div>
    </FieldGroup>
  )
}
