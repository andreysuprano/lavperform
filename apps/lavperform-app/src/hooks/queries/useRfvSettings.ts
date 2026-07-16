import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toaster } from '@/components/ui/toaster'
import { queryKeys } from '@/lib/react-query'
import { rfvSettingsService } from '@/services'
import type { RFVConfiguration, RFVLevel, RFVSettings } from '@/types'

type UseRfvSettingsParams = {
  companyId?: string
}

// ---------------------------------------------------------------------------
// Adapters: API ↔ UI
// ---------------------------------------------------------------------------

/**
 * Converts a flat thresholds array from the API into RFVLevel objects for the UI.
 * e.g. [14, 30, 60, 90, 120] → 5 levels with maxValues [14, 30, 60, 90, 120]
 */
function thresholdsToLevels(
  thresholds: number[],
  dimension: RFVLevel['dimension']
): RFVLevel[] {
  const incrementByDimension: Record<RFVLevel['dimension'], number> = {
    RECENCY: 30,
    FREQUENCY: 5,
    MONETARY: 100,
  }

  const increment = incrementByDimension[dimension]
  const normalizedThresholds = [...thresholds]
    .filter((v) => Number.isFinite(v))

  while (normalizedThresholds.length < 5) {
    const last = normalizedThresholds.at(-1) ?? 0
    normalizedThresholds.push(last + increment)
  }

  return normalizedThresholds.slice(0, 5).map((maxValue, index) => ({
    id: index + 1,
    dimension,
    label: '',
    minValue: index === 0 ? 0 : normalizedThresholds[index - 1] + 1,
    maxValue,
  }))
}

/**
 * Converts RFVLevel objects back to a flat thresholds array for the API.
 * e.g. 4 levels with maxValues [14, 30, 60, 90] → [14, 30, 60, 90]
 */
function levelsToThresholds(levels: RFVLevel[]): number[] {
  return levels.map((level) => level.maxValue ?? 0)
}

function configToSettings(config: RFVConfiguration): RFVSettings {
  return {
    recencyLevels: thresholdsToLevels(config.recencyThresholds, 'RECENCY'),
    frequencyLevels: thresholdsToLevels(config.frequencyThresholds, 'FREQUENCY'),
    monetaryLevels: thresholdsToLevels(config.monetaryThresholds, 'MONETARY'),
  }
}

function settingsToConfig(settings: RFVSettings): Pick<RFVConfiguration, 'recencyThresholds' | 'frequencyThresholds' | 'monetaryThresholds'> {
  return {
    recencyThresholds: levelsToThresholds(settings.recencyLevels),
    frequencyThresholds: levelsToThresholds(settings.frequencyLevels),
    monetaryThresholds: levelsToThresholds(settings.monetaryLevels),
  }
}

// ---------------------------------------------------------------------------
// Default fallback (when API returns nothing)
// ---------------------------------------------------------------------------

function buildDefaultSettings(): RFVSettings {
  return configToSettings({
    id: '',
    companyId: '',
    autoRecalculate: true,
    recalculateFrequency: 'daily',
    recencyPeriodDays: 180,
    frequencyPeriodDays: 180,
    monetaryPeriodDays: 180,
    recencyThresholds: [14, 30, 60, 90, 120],
    frequencyThresholds: [4, 8, 15, 25, 30],
    monetaryThresholds: [100, 300, 600, 1200, 1300],
    createdAt: '',
    updatedAt: '',
  })
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useRfvSettings({ companyId }: UseRfvSettingsParams) {
  return useQuery({
    queryKey: queryKeys.customers.rfvSettings(companyId ?? ''),
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Company ID is required to load RFV settings')
      }

      try {
        const response = await rfvSettingsService.getSettings(companyId)
        const config = response.data

        if (
          !config ||
          !config.recencyThresholds?.length ||
          !config.frequencyThresholds?.length ||
          !config.monetaryThresholds?.length
        ) {
          return buildDefaultSettings()
        }

        return configToSettings(config)
      } catch {
        return buildDefaultSettings()
      }
    },
    enabled: !!companyId,
  })
}

type UseUpdateRfvSettingsParams = {
  companyId: string
}

type UseUpdateRfvSettingsVariables = {
  settings: RFVSettings
}

export function useUpdateRfvSettings({ companyId }: UseUpdateRfvSettingsParams) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ settings }: UseUpdateRfvSettingsVariables) => {
      const payload = settingsToConfig(settings)
      const response = await rfvSettingsService.updateSettings(companyId, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.rfvSettings(companyId),
      })
      toaster.create({
        title: 'Configurações salvas com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro ao salvar configurações',
        description: 'Verifique sua conexão e tente novamente.',
        type: 'error',
      })
    },
  })
}

