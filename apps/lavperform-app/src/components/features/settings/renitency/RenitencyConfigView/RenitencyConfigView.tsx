import {
  Button,
  Field,
  Flex,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { InfoCard, LoadingState } from '@/components'
import {
  useRenitencySettings,
  useUpdateRenitencySettings,
} from '@/hooks/queries/useRenitencySettings'

import type { Props } from './RenitencyConfigView.types'

function RenitencyConfigViewBase({ companyId }: Props) {
  const { data, isLoading } = useRenitencySettings({ companyId })
  const { mutate: updateSettings, isPending } = useUpdateRenitencySettings({
    companyId: companyId ?? '',
  })

  const [minDaysBetween, setMinDaysBetween] = useState<number | ''>('')

  useEffect(() => {
    if (data) {
      setMinDaysBetween(data.minDaysBetween)
    }
  }, [data])

  const parsedValue = useMemo(() => {
    if (minDaysBetween === '') return null
    return Number(minDaysBetween)
  }, [minDaysBetween])

  const isValid = useMemo(() => {
    return (
      parsedValue !== null &&
      Number.isInteger(parsedValue) &&
      parsedValue >= 1
    )
  }, [parsedValue])

  const hasChanges = useMemo(() => {
    if (!data || parsedValue === null) return false
    return parsedValue !== data.minDaysBetween
  }, [data, parsedValue])

  const handleSave = useCallback(() => {
    if (!companyId || !isValid || parsedValue === null) return
    updateSettings({ minDaysBetween: parsedValue })
  }, [companyId, isValid, parsedValue, updateSettings])

  if (isLoading) {
    return <LoadingState title="Carregando configurações de renitência..." />
  }

  return (
    <Stack gap={6}>
      <Flex
        justify="flex-end"
        gap={3}
        direction={{ base: 'column', sm: 'row' }}
      >
        <Button
          colorScheme="green"
          disabled={!companyId || !isValid || !hasChanges || isPending}
          loading={isPending}
          loadingText="Salvando..."
          onClick={handleSave}
        >
          Salvar configurações
        </Button>
      </Flex>

      <Stack
        gap={4}
        maxW="480px"
      >
        <Field.Root
          invalid={minDaysBetween !== '' && !isValid}
          required
        >
          <Field.Label>Intervalo mínimo entre mensagens (dias)</Field.Label>
          <Input
            min={1}
            step={1}
            type="number"
            value={minDaysBetween}
            onChange={(event) => {
              const value = event.target.value
              setMinDaysBetween(value === '' ? '' : Number(value))
            }}
          />
          <Field.HelperText>
            Mínimo de 1 dia. Valor padrão recomendado: 3 dias.
          </Field.HelperText>
          {minDaysBetween !== '' && !isValid && (
            <Field.ErrorText>
              Informe um número inteiro maior ou igual a 1.
            </Field.ErrorText>
          )}
        </Field.Root>

        <Text
          color="fg.muted"
          fontSize="sm"
        >
          Se um cliente já recebeu uma mensagem automática neste canal há menos
          dias do que o intervalo configurado, o envio será adiado até a próxima
          data elegível.
        </Text>
      </Stack>

      <InfoCard
        title="O que é renitência?"
        description={`A renitência define o intervalo mínimo entre mensagens automáticas no mesmo canal para o mesmo cliente, evitando insistência excessiva.

Essa regra se aplica a campanhas automáticas e alertas climáticos. Campanhas manuais não são afetadas.

WhatsApp Web e WhatsApp Business API contam como o mesmo canal para o cálculo do intervalo.`}
      />
    </Stack>
  )
}

const RenitencyConfigView = memo(
  RenitencyConfigViewBase
) as typeof RenitencyConfigViewBase

export { RenitencyConfigView, type Props as RenitencyConfigViewProps }
