import { Box, Button, HStack, IconButton, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

import {
  isAfter,
  isBefore,
  isSameDay,
  monthGrid,
  MONTHS_PT,
  today,
  WEEKDAYS_PT_SHORT,
} from './utils'

type CalendarProps = {
  /** Mês "âncora" (qualquer dia dentro do mês). */
  visibleMonth: Date
  /** Data de início do intervalo (se já escolhida). */
  start: Date | null
  /** Data de fim do intervalo (se já escolhida). */
  end: Date | null
  /** Data sob hover   usada para pré-visualizar o range durante a seleção. */
  hover: Date | null
  onHover: (d: Date | null) => void
  onSelect: (d: Date) => void
  onNavigate: (delta: number) => void
  /** Mostra apenas a seta apropriada quando parte de um painel de 2 meses. */
  hidePrev?: boolean
  hideNext?: boolean
  /** Próximo mês (para desabilitar navegação ao bater no outro). */
  siblingMonth?: Date
}

function CalendarComponent({
  visibleMonth,
  start,
  end,
  hover,
  onHover,
  onSelect,
  onNavigate,
  hidePrev,
  hideNext,
}: CalendarProps) {
  const days = useMemo(
    () => monthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  )

  const now = today()

  // Define o range efetivo usado para o "realce" (considerando hover)
  const activeEnd: Date | null = useMemo(() => {
    if (end) return end
    if (start && hover && isAfter(hover, start)) return hover
    return null
  }, [start, end, hover])

  const activeStart: Date | null = useMemo(() => {
    if (start && end) return start
    if (start && hover && isBefore(hover, start)) return hover
    return start
  }, [start, end, hover])

  return (
    <Box minW="260px">
      <HStack
        justify="space-between"
        mb={3}
        px={1}
      >
        <IconButton
          aria-label="Mês anterior"
          onClick={() => onNavigate(-1)}
          rounded="full"
          size="xs"
          variant="ghost"
          visibility={hidePrev ? 'hidden' : 'visible'}
        >
          <LuChevronLeft />
        </IconButton>
        <Text
          fontSize="sm"
          fontWeight="semibold"
          letterSpacing="tight"
          textTransform="capitalize"
        >
          {MONTHS_PT[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
        </Text>
        <IconButton
          aria-label="Próximo mês"
          onClick={() => onNavigate(1)}
          rounded="full"
          size="xs"
          variant="ghost"
          visibility={hideNext ? 'hidden' : 'visible'}
        >
          <LuChevronRight />
        </IconButton>
      </HStack>

      <Box
        display="grid"
        gap="1px"
        gridTemplateColumns="repeat(7, minmax(0, 1fr))"
        mb={1}
      >
        {WEEKDAYS_PT_SHORT.map((w, i) => (
          <Text
            color="fg.muted"
            fontSize="2xs"
            fontWeight="medium"
            key={`${w}-${i}`}
            letterSpacing="wide"
            textAlign="center"
            textTransform="uppercase"
          >
            {w}
          </Text>
        ))}
      </Box>

      <Box
        display="grid"
        gridTemplateColumns="repeat(7, minmax(0, 1fr))"
        rowGap="2px"
      >
        {days.map((d) => {
          const inMonth = d.getMonth() === visibleMonth.getMonth()
          const isToday = isSameDay(d, now)
          const isFuture = isAfter(d, now)

          const isStart = activeStart ? isSameDay(d, activeStart) : false
          const isEnd = activeEnd ? isSameDay(d, activeEnd) : false
          const inRange =
            activeStart &&
            activeEnd &&
            !isBefore(d, activeStart) &&
            !isAfter(d, activeEnd)

          const isEdgeLeft = isStart && activeStart && activeEnd
          const isEdgeRight = isEnd && activeStart && activeEnd
          const isSingle =
            activeStart && !activeEnd && isSameDay(d, activeStart)

          return (
            <Box
              bg={
                inRange && !isSingle
                  ? 'colorPalette.subtle'
                  : 'transparent'
              }
              borderLeftRadius={isEdgeLeft ? 'full' : 'none'}
              borderRightRadius={isEdgeRight ? 'full' : 'none'}
              key={d.toISOString()}
              position="relative"
            >
              <Button
                _disabled={{
                  opacity: 0.2,
                  cursor: 'not-allowed',
                }}
                _hover={{
                  bg:
                    isStart || isEnd
                      ? 'colorPalette.solid'
                      : 'colorPalette.muted',
                }}
                aria-pressed={isStart || isEnd}
                bg={
                  isStart || isEnd
                    ? 'colorPalette.solid'
                    : 'transparent'
                }
                color={
                  isStart || isEnd
                    ? 'colorPalette.contrast'
                    : inMonth
                      ? 'fg'
                      : 'fg.muted'
                }
                disabled={isFuture}
                fontSize="xs"
                fontWeight={isStart || isEnd ? 'bold' : isToday ? 'semibold' : 'normal'}
                h={9}
                minW={9}
                onClick={() => onSelect(d)}
                onMouseEnter={() => onHover(d)}
                onMouseLeave={() => onHover(null)}
                opacity={inMonth ? 1 : 0.35}
                p={0}
                rounded="full"
                transition="background 120ms ease, color 120ms ease"
                variant="ghost"
                w={9}
              >
                {d.getDate()}
              </Button>
              {isToday && !(isStart || isEnd) && (
                <Box
                  bg="colorPalette.solid"
                  bottom="4px"
                  h="3px"
                  left="50%"
                  pointerEvents="none"
                  position="absolute"
                  rounded="full"
                  transform="translateX(-50%)"
                  w="3px"
                />
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export const Calendar = memo(CalendarComponent)
