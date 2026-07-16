import { Box, Card, HStack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

import { LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { scheduleService } from '@/services'
import type { CompanyOpeningHour } from '@/types'
import { logger } from '@/utils/logger'
import { WEEKDAYS } from '@/utils/weekdays'

import { EditCompanyDaysAndHoursOfOperationForm } from '../EditCompanyDaysAndHoursOfOperationForm/EditCompanyDaysAndHoursOfOperationForm'
import type { ScheduleData } from '../EditCompanyDaysAndHoursOfOperationForm/EditCompanyDaysAndHoursOfOperationForm.types'

function DayScheduleItem({
  dayOfWeek,
  openTime,
  closeTime,
  isOpen,
}: CompanyOpeningHour) {
  const dayName =
    WEEKDAYS.find((w) => w.short === dayOfWeek)?.fullName ||
    dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)

  const scheduleText = isOpen
    ? `${openTime || ''} - ${closeTime || ''}`
    : 'Fechado'

  return (
    <Box
      bg={isOpen ? 'bg' : { base: 'red.100', _dark: 'red.950' }}
      borderColor={
        isOpen
          ? { base: 'gray.200', _dark: 'gray.700' }
          : { base: 'red.300', _dark: 'red.700' }
      }
      borderRadius="md"
      borderWidth={1}
      flex={1}
      key={dayOfWeek}
      minW={120}
      p={3}
    >
      <Text
        fontSize="sm"
        fontWeight="bold"
      >
        {dayName}
      </Text>
      <Text
        color={isOpen ? 'fg' : { base: 'red.600', _dark: 'red.400' }}
        fontSize="xs"
      >
        {scheduleText}
      </Text>
    </Box>
  )
}

export const CompanyDaysAndHoursOfOperationViewCard = () => {
  const { selectedCompany } = useAuth()
  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    operatingDays: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadScheduleData = useCallback(async () => {
    if (!selectedCompany?.id) return
    setIsLoading(true)

    try {
      const response = await scheduleService.getOpeningHours(selectedCompany.id)

      const sortedData = [...response.data].sort((a, b) => {
        const indexA = WEEKDAYS.findIndex((w) => w.short === a.dayOfWeek)
        const indexB = WEEKDAYS.findIndex((w) => w.short === b.dayOfWeek)
        return indexA - indexB
      })

      setScheduleData({ operatingDays: sortedData })
    } catch (error) {
      logger.error('Erro ao carregar horários:', error)
      setScheduleData({ operatingDays: [] })
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany?.id])

  const handleSuccessUpdate = async (updatedData: ScheduleData) => {
    const sorted = [...updatedData.operatingDays].sort((a, b) => {
      const indexA = WEEKDAYS.findIndex((w) => w.short === a.dayOfWeek)
      const indexB = WEEKDAYS.findIndex((w) => w.short === b.dayOfWeek)
      return indexA - indexB
    })
    setScheduleData({ operatingDays: sorted })
    await loadScheduleData()
  }

  useEffect(() => {
    loadScheduleData()
  }, [loadScheduleData])

  if (isLoading) {
    return <LoadingState />
  }

  const currentSchedule =
    scheduleData.operatingDays.length > 0 ? scheduleData : { operatingDays: [] }

  return (
    <Card.Root size="sm">
      <Card.Header
        flexDirection="row"
        justifyContent="space-between"
      >
        <Card.Title>Horários de Funcionamento</Card.Title>
        <EditCompanyDaysAndHoursOfOperationForm
          onClose={loadScheduleData}
          onSuccess={handleSuccessUpdate}
          schedule={currentSchedule}
        />
      </Card.Header>
      <Card.Body>
        {currentSchedule.operatingDays.length === 0 ? (
          <Text color="fg.muted">
            Nenhum horário de funcionamento configurado.
          </Text>
        ) : (
          <HStack
            alignItems="flex-start"
            gap={4}
            justifyContent={{ base: 'space-between', md: 'flex-start' }}
            wrap="wrap"
          >
            {currentSchedule.operatingDays.map((item) => (
              <DayScheduleItem
                key={item.dayOfWeek}
                {...item}
              />
            ))}
          </HStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}
