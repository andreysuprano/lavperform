import { Alert, Button, Card, Stack } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LuCloudRain } from 'react-icons/lu'
import { RiSaveLine } from 'react-icons/ri'

import { AppContentLayout, LoadingState } from '@/components'
import { WeekdaySelect } from '@/components/forms'
import { StickySaveBar } from '@/components/layout/AppLayout/StickySaveBar'
import { useAuth } from '@/context/AuthContext'
import { useWhatsAppManager } from '@/hooks/useWhatsAppManager'
import {
  WeatherAlertDetailsModal,
  WeatherAlertMessagesCard,
  WeatherAlertsFrequencyCard,
  WeatherConditionSelect,
  WeatherHistoryCard,
  WeatherStatusCard,
} from '@/whitelabel/components'
import {
  useSaveWeatherAlertConfig,
  useToggleWeatherAlert,
  useWeatherAlertConfig,
  useWeatherHistory,
} from '@/whitelabel/hooks'
import type {
  WeatherAlertHistory,
  WeatherAlertMessages,
  WeatherConditionAPI,
} from '@/whitelabel/types'
import {
  weekdayNumbersToStrings,
  weekdayStringsToNumbers,
} from '@/whitelabel/utils'
import {
  DEFAULT_WEATHER_ALERT_MESSAGES,
  mergeWeatherAlertMessages,
} from '@/whitelabel/utils/weather.constants'

interface WeatherConfigForm {
  dailyAlerts: number
  daysOfWeek: number[] // [1, 2, 3, 4, 5] para seg-sex
  condition: string
  giftId: string
  messages: WeatherAlertMessages
}

function WeatherConfigPageBase() {
  const { selectedCompany } = useAuth()
  const { isConnected: isWhatsAppConnected } = useWhatsAppManager(
    selectedCompany?.id
  )

  // Buscar configuração atual da API real
  const { data: config, isLoading } = useWeatherAlertConfig()
  const saveConfig = useSaveWeatherAlertConfig()
  const toggleAlert = useToggleWeatherAlert()
  const { data: historyData, isLoading: isLoadingHistory } = useWeatherHistory()

  // Estado para o modal de detalhes
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)

  // React Hook Form
  const { control, handleSubmit, reset, watch, setValue } =
    useForm<WeatherConfigForm>({
      defaultValues: {
        dailyAlerts: 1,
        daysOfWeek: [1, 2, 3, 4, 5], // Seg a Sex por padrão
        condition: 'RAINING',
        giftId: '',
        messages: DEFAULT_WEATHER_ALERT_MESSAGES,
      },
    })

  // Preencher form com dados da API
  useEffect(() => {
    if (config) {
      reset({
        dailyAlerts: config.dailyAlerts,
        daysOfWeek: weekdayStringsToNumbers(config.daysOfWeek),
        condition: config.condition,
        giftId: config.giftId || '',
        messages: mergeWeatherAlertMessages(config.messages),
      })
    }
  }, [config, reset])

  // Submit do formulário
  const onSubmit = useCallback(
    async (data: WeatherConfigForm) => {
      try {
        await saveConfig.mutateAsync({
          condition: data.condition as WeatherConditionAPI,
          daysOfWeek: weekdayNumbersToStrings(data.daysOfWeek),
          dailyAlerts: data.dailyAlerts,
          giftId: data.giftId,
          messages: data.messages,
          active: config?.active ?? true,
        })
      } catch {
        // Erro já tratado no hook
      }
    },
    [saveConfig, config]
  )

  const handleToggleEnabled = useCallback(
    async (enabled: boolean) => {
      try {
        await toggleAlert.mutateAsync(enabled)
      } catch {
        // Erro já tratado no hook
      }
    },
    [toggleAlert]
  )

  const handleAlertClick = useCallback((alert: WeatherAlertHistory) => {
    setSelectedAlertId(alert.id)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedAlertId(null)
  }, [])

  if (isLoading) {
    return (
      <AppContentLayout
        icon={<LuCloudRain />}
        title="Clima e Tempo"
      >
        <LoadingState title="Carregando configuração..." />
      </AppContentLayout>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={0}>
        <AppContentLayout
          icon={<LuCloudRain />}
          title="Clima e Tempo"
        >
          <Stack gap={6}>
            <WeatherStatusCard
              enabled={config?.active ?? false}
              onToggle={handleToggleEnabled}
            />

            {config?.active && !isWhatsAppConnected && (
              <Alert.Root
                status="warning"
                variant="surface"
              >
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>WhatsApp Desconectado</Alert.Title>
                  <Alert.Description>
                    Os alertas climáticos só funcionam quando o WhatsApp está
                    conectado. Por favor, conecte seu WhatsApp para que os
                    alertas possam ser enviados automaticamente.
                  </Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            {config?.active && (
              <Stack
                gap={6}
                opacity={config?.active ? 1 : 0.5}
                transition="opacity 0.3s"
              >
                {/* Seleção de condição climática */}
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Condição Climática</Card.Title>
                    <Card.Description>
                      Selecione qual condição deve disparar os alertas
                    </Card.Description>
                  </Card.Header>
                  <Card.Body>
                    <WeatherConditionSelect
                      control={control}
                      disabled={!config?.active}
                      name="condition"
                      required
                    />
                  </Card.Body>
                </Card.Root>

                {/* Mensagens por tipo de alerta */}
                <WeatherAlertMessagesCard
                  control={control}
                  disabled={!config?.active}
                  name="messages"
                />

                {/* Slider de frequência de alertas */}
                <WeatherAlertsFrequencyCard
                  disabled={!config?.active}
                  onChange={(value) => setValue('dailyAlerts', value)}
                  value={watch('dailyAlerts')}
                />

                {/* Seleção de dias da semana */}
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Dias da Semana</Card.Title>
                    <Card.Description>
                      Selecione em quais dias os alertas serão enviados
                    </Card.Description>
                  </Card.Header>
                  <Card.Body>
                    <WeekdaySelect
                      control={control}
                      label="Dias ativos"
                      name="daysOfWeek"
                      required
                    />
                  </Card.Body>
                </Card.Root>

                {/* Histórico de alertas */}
                <WeatherHistoryCard
                  history={historyData}
                  isLoading={isLoadingHistory}
                  onAlertClick={handleAlertClick}
                />
              </Stack>
            )}
          </Stack>
        </AppContentLayout>

        {/* Sticky Footer com botão Salvar */}
        <StickySaveBar>
          <Button
            disabled={!config?.active}
            loading={saveConfig.isPending}
            size="lg"
            type="submit"
            width="full"
          >
            <RiSaveLine />
            Salvar Configurações
          </Button>
        </StickySaveBar>

        {/* Modal de detalhes do alerta */}
        <WeatherAlertDetailsModal
          alertId={selectedAlertId}
          isOpen={!!selectedAlertId}
          onClose={handleCloseModal}
        />
      </Stack>
    </form>
  )
}

const WeatherConfigPage = memo(WeatherConfigPageBase)

export { WeatherConfigPage }
