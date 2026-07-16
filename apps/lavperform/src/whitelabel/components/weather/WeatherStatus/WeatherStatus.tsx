import { Box, Button, Image, Text } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo, useMemo } from 'react'

import { useAuth } from '@/context/AuthContext'
import { useWhitelabelActive } from '@/whitelabel/hooks'
import { useCurrentWeather } from '@/whitelabel/hooks/queries/useCurrentWeather'

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`

function WeatherStatusBase() {
  const { selectedCompany } = useAuth()
  const { isActive } = useWhitelabelActive()
  const { data: weatherData, isLoading, isError } = useCurrentWeather()

  const animation = `${pulse} 2s infinite`

  const fixedIconUrl = useMemo(() => {
    if (!weatherData?.conditionIcon) return ''
    
    return weatherData.conditionIcon.startsWith('//')
      ? `https:${weatherData.conditionIcon}`
      : weatherData.conditionIcon
  }, [weatherData?.conditionIcon])

  // Apenas não renderiza se whitelabel estiver inativo ou sem empresa selecionada
  if (!isActive || !selectedCompany) {
    return null
  }

  // Estado de LOADING
  if (isLoading) {
    return (
      <Button
        disabled
        display={{ base: 'none', lg: 'flex' }}
        gap={2}
        size="sm"
        variant="outline"
      >
        <Box
          animation={animation}
          bg="gray.400"
          borderRadius="full"
          h="8px"
          w="8px"
        />
        <Text fontSize="sm">Carregando...</Text>
      </Button>
    )
  }

  // Estado de ERRO
  if (isError || !weatherData) {
    return (
      <Button
        display={{ base: 'none', lg: 'flex' }}
        gap={2}
        size="sm"
        variant="outline"
      >
        <Box
          bg="orange.500"
          borderRadius="full"
          h="8px"
          w="8px"
        />
        <Text fontSize="sm">Clima Indisponível</Text>
      </Button>
    )
  }

  // Estado de SUCESSO - dados disponíveis
  return (
    <Button
      display={{ base: 'none', lg: 'flex' }}
      gap={2}
      size="sm"
      variant="outline"
    >
      <Image
        alt={weatherData.conditionText}
        h="24px"
        src={fixedIconUrl}
        w="24px"
      />
      <Text fontSize="sm">
        {Math.round(weatherData.tempC)}°C
      </Text>
      <Text fontSize="sm">
        {weatherData.cityName}
      </Text>
    </Button>
  )
}

export const WeatherStatus = memo(WeatherStatusBase)
