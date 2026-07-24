import { Button, Flex, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { InfoCard, LoadingState } from '@/components'
import {
  useAutoConfigureRfv,
  useRfvSettings,
  useUpdateRfvSettings,
} from '@/hooks/queries/useRfvSettings'
import type { RFVLevel, RFVSettings } from '@/types'

import { RFVSection } from '../RFVSection/RFVSection'
import type { Props } from './RFVConfigContainer.types'

const EMPTY_SETTINGS: RFVSettings = {
  recencyLevels: [],
  frequencyLevels: [],
  monetaryLevels: [],
}

function RFVConfigContainerBase({ companyId }: Props) {
  const { data, isLoading } = useRfvSettings({ companyId })
  const [settings, setSettings] = useState<RFVSettings>(EMPTY_SETTINGS)

  const { mutate: updateSettings, isPending } = useUpdateRfvSettings({
    companyId: companyId ?? '',
  })

  const { mutate: autoConfigure, isPending: isAutoConfiguring } =
    useAutoConfigureRfv({
      companyId: companyId ?? '',
    })

  useEffect(() => {
    if (data) {
      setSettings(data)
    }
  }, [data])

  const recencyLevels = useMemo(
    () => settings.recencyLevels,
    [settings.recencyLevels]
  )
  const frequencyLevels = useMemo(
    () => settings.frequencyLevels,
    [settings.frequencyLevels]
  )
  const monetaryLevels = useMemo(
    () => settings.monetaryLevels,
    [settings.monetaryLevels]
  )

  const frequencyDisplayLevels = useMemo(
    () => [...frequencyLevels].reverse(),
    [frequencyLevels]
  )
  const monetaryDisplayLevels = useMemo(
    () => [...monetaryLevels].reverse(),
    [monetaryLevels]
  )

  const hasInvalidRanges = useMemo(() => {
    const hasInvalidThresholds = (levels: RFVLevel[]) => {
      let prevMax: number | null = null

      return levels.some((level) => {
        const maxValue = level.maxValue

        if (maxValue === null || Number.isNaN(maxValue)) {
          return false
        }

        if (maxValue < 0) return true

        if (prevMax !== null && maxValue <= prevMax) {
          return true
        }

        prevMax = maxValue
        return false
      })
    }

    return (
      hasInvalidThresholds(settings.recencyLevels) ||
      hasInvalidThresholds(settings.frequencyLevels) ||
      hasInvalidThresholds(settings.monetaryLevels)
    )
  }, [settings])

  const handleLevelChange = useCallback(
    (dimension: keyof RFVSettings) =>
      (levelId: number, updated: Partial<RFVLevel>) => {
        setSettings((prev) => ({
          ...prev,
          [dimension]: prev[dimension].map((level) =>
            level.id === levelId ? { ...level, ...updated } : level
          ),
        }))
      },
    []
  )

  const handleSave = useCallback(() => {
    updateSettings({ settings })
  }, [settings, updateSettings])

  const handleAutoConfigure = useCallback(() => {
    autoConfigure()
  }, [autoConfigure])

  if (isLoading) {
    return <LoadingState title="Carregando parâmetros RFV..." />
  }

  return (
    <Stack gap={6}>
      <Flex
        justify="flex-end"
        gap={3}
        direction={{ base: 'column', sm: 'row' }}
      >
        <Button
          variant="outline"
          disabled={isAutoConfiguring || isPending || !companyId}
          loading={isAutoConfiguring}
          loadingText="Analisando dados..."
          onClick={handleAutoConfigure}
        >
          Configurar automaticamente
        </Button>
        <Button
          colorScheme="green"
          disabled={hasInvalidRanges || isPending || isAutoConfiguring || !companyId}
          loading={isPending}
          loadingText="Salvando..."
          onClick={handleSave}
        >
          Salvar configurações
        </Button>
      </Flex>

      {hasInvalidRanges && (
        <Text color="red.500" fontSize="sm">
          Existem intervalos com valores mínimos maiores que os máximos. Ajuste os
          valores para continuar usando estes parâmetros com segurança.
        </Text>
      )}

      <SimpleGrid
        columns={{ base: 1, md: 2, xl: 3 }}
        gap={6}
      >
        <RFVSection
          description="Configure em quantos dias os clientes são considerados mais ou menos recentes com base no último pedido."
          dimension="RECENCY"
          levels={recencyLevels}
          onLevelChange={handleLevelChange('recencyLevels')}
          title="Recência"
        />
        <RFVSection
          description="Ajuste a quantidade de pedidos em um período para classificar a frequência de compra dos clientes."
          dimension="FREQUENCY"
          levels={frequencyDisplayLevels}
          onLevelChange={handleLevelChange('frequencyLevels')}
          title="Frequência"
        />
        <RFVSection
          description="Defina os intervalos de valor gasto para classificar o ticket médio e o potencial de valor de cada cliente."
          dimension="MONETARY"
          levels={monetaryDisplayLevels}
          onLevelChange={handleLevelChange('monetaryLevels')}
          title="Valor Monetário"
        />
      </SimpleGrid>

      <InfoCard
        title="Configurações da Matriz RFV/RFM"
        description="A classificação RFV analisa o comportamento dos clientes a partir de três dimensões: Recência (dias desde a última compra), Frequência (quantidade de pedidos realizados) e Valor Monetário (ticket médio). Com base nessas informações, os clientes são distribuídos em 11 grupos, tornando mais fácil direcionar ofertas e campanhas personalizadas para cada perfil.

Cada dimensão é avaliada em uma escala de 1 a 5, onde 1 representa o menor valor e 5 o maior. Na tela de Análise da base de clientes, você encontra a matriz RFV com a distribuição completa dos seus clientes entre os grupos.

Não sabe por onde começar? Use o botão 'Configurar automaticamente' para que analisemos os dados reais da sua base e definamos os melhores parâmetros para você."
      />
    </Stack>
  )
}

const RFVConfigContainer = memo(RFVConfigContainerBase) as typeof RFVConfigContainerBase

export { RFVConfigContainer, type Props as RFVConfigContainerProps }

