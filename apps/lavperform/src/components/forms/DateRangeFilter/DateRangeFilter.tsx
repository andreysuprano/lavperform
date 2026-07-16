import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Popover,
  Portal,
  Separator,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { LuCalendarRange, LuChevronDown, LuTriangleAlert } from 'react-icons/lu'

import { Calendar } from './Calendar'
import type {
  DateRangeFilterProps,
  DateRangePreset,
  DateRangeValue,
} from './DateRangeFilter.types'
import {
  addMonths,
  diffInDays,
  formatRangeLabel,
  fromBR,
  fromYMD,
  isAfter,
  isBefore,
  maskBRDate,
  MAX_RANGE_DAYS,
  toBR,
  today,
  toYMD,
} from './utils'

type Mode = 'presets' | 'custom'

const DEFAULT_PRESETS: DateRangePreset[] = [7, 14, 30]
const PRESET_LABEL: Record<DateRangePreset, string> = {
  1: 'Hoje',
  7: 'Últimos 7 dias',
  14: 'Últimos 14 dias',
  30: 'Últimos 30 dias',
}

function DateRangeFilterComponent({
  value,
  defaultValue,
  onChange,
  size = 'sm',
  disabled,
  maxRangeDays = MAX_RANGE_DAYS,
  presets = DEFAULT_PRESETS,
  allowCustom = true,
}: DateRangeFilterProps) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState<DateRangeValue>(
    value ?? defaultValue ?? { kind: 'preset', days: 7 }
  )
  const current: DateRangeValue = isControlled ? value! : internal

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>(
    current.kind === 'custom' ? 'custom' : 'presets'
  )

  // Estado em edição do intervalo customizado (só é "commitado" ao Aplicar)
  const [draftStart, setDraftStart] = useState<Date | null>(null)
  const [draftEnd, setDraftEnd] = useState<Date | null>(null)
  const [draftStartText, setDraftStartText] = useState('')
  const [draftEndText, setDraftEndText] = useState('')
  const [hover, setHover] = useState<Date | null>(null)
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    const t = today()
    return addMonths(t, -1)
  })

  const lastSelectionRef = useRef<'start' | 'end'>('start')

  // Sincroniza o draft ao abrir/trocar de modo
  useEffect(() => {
    if (!open) return
    if (current.kind === 'custom') {
      const s = fromYMD(current.startDate)
      const e = fromYMD(current.endDate)
      setDraftStart(s)
      setDraftEnd(e)
      setDraftStartText(s ? toBR(s) : '')
      setDraftEndText(e ? toBR(e) : '')
      if (e) setLeftMonth(addMonths(e, -1))
      else if (s) setLeftMonth(addMonths(s, -1))
      lastSelectionRef.current = 'start'
    } else {
      setDraftStart(null)
      setDraftEnd(null)
      setDraftStartText('')
      setDraftEndText('')
      setLeftMonth(addMonths(today(), -1))
      lastSelectionRef.current = 'start'
    }
  }, [open, current])

  const commit = useCallback(
    (v: DateRangeValue) => {
      if (!isControlled) setInternal(v)
      onChange?.(v)
    },
    [isControlled, onChange]
  )

  const handlePresetClick = useCallback(
    (days: DateRangePreset) => {
      commit({ kind: 'preset', days })
      setMode('presets')
      setOpen(false)
    },
    [commit]
  )

  const handleDaySelect = useCallback(
    (d: Date) => {
      const t = today()
      if (isAfter(d, t)) return

      // 1º clique (ou início de nova seleção): define start e limpa end.
      if (lastSelectionRef.current === 'start' || !draftStart) {
        setDraftStart(d)
        setDraftEnd(null)
        setDraftStartText(toBR(d))
        setDraftEndText('')
        lastSelectionRef.current = 'end'
        return
      }

      // 2º clique: fecha o intervalo, invertendo se clicou antes do start.
      if (isBefore(d, draftStart)) {
        setDraftEnd(draftStart)
        setDraftEndText(toBR(draftStart))
        setDraftStart(d)
        setDraftStartText(toBR(d))
      } else {
        setDraftEnd(d)
        setDraftEndText(toBR(d))
      }
      lastSelectionRef.current = 'start'
    },
    [draftStart]
  )

  const handleStartTextChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const masked = maskBRDate(e.target.value)
      setDraftStartText(masked)
      const parsed = fromBR(masked)
      if (parsed) {
        setDraftStart(parsed)
        setLeftMonth(addMonths(parsed, 0))
        lastSelectionRef.current = 'end'
      }
    },
    []
  )

  const handleEndTextChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const masked = maskBRDate(e.target.value)
      setDraftEndText(masked)
      const parsed = fromBR(masked)
      if (parsed) setDraftEnd(parsed)
    },
    []
  )

  const validation = useMemo(() => {
    const t = today()
    if (!draftStart && !draftEnd) {
      return {
        ok: false,
        message: 'Selecione um intervalo para continuar.',
        warning: null as string | null,
      }
    }
    if (!draftStart || !draftEnd) {
      return {
        ok: false,
        message: 'Selecione uma data inicial e uma data final.',
        warning: null,
      }
    }
    if (draftStartText && !fromBR(draftStartText)) {
      return { ok: false, message: 'Data inicial inválida.', warning: null }
    }
    if (draftEndText && !fromBR(draftEndText)) {
      return { ok: false, message: 'Data final inválida.', warning: null }
    }
    if (isBefore(draftEnd, draftStart)) {
      return {
        ok: false,
        message: 'A data final não pode ser anterior à inicial.',
        warning: null,
      }
    }
    if (isAfter(draftEnd, t)) {
      return {
        ok: false,
        message: 'A data final não pode ser maior que hoje.',
        warning: null,
      }
    }
    const days = diffInDays(draftStart, draftEnd) + 1
    if (days > maxRangeDays) {
      return {
        ok: true,
        message: null,
        warning: `Intervalo de ${days} dias pode ficar lento. Recomendado até ${maxRangeDays} dias.`,
      }
    }
    return { ok: true, message: null, warning: null }
  }, [draftStart, draftEnd, draftStartText, draftEndText, maxRangeDays])

  const handleApply = useCallback(() => {
    if (!validation.ok || !draftStart || !draftEnd) return
    commit({
      kind: 'custom',
      startDate: toYMD(draftStart),
      endDate: toYMD(draftEnd),
    })
    setOpen(false)
  }, [validation.ok, draftStart, draftEnd, commit])

  const handleCancel = useCallback(() => {
    setOpen(false)
  }, [])

  const triggerLabel = useMemo(() => {
    if (current.kind === 'preset') return PRESET_LABEL[current.days]
    const s = fromYMD(current.startDate)
    const e = fromYMD(current.endDate)
    if (!s || !e) return 'Selecionar período'
    return formatRangeLabel(s, e)
  }, [current])

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth])

  return (
    <Popover.Root
      onOpenChange={(d) => setOpen(d.open)}
      open={open}
      positioning={{
        placement: 'bottom-end',
        overflowPadding: 8,
        // Em telas pequenas, evita o conteúdo "encostar" na borda.
        gutter: 6,
      }}
    >
      <Popover.Trigger asChild>
        <Button
          _hover={{ bg: 'bg.subtle', borderColor: 'colorPalette.emphasized' }}
          aria-label="Selecionar período"
          bg="bg.panel"
          borderColor="border.emphasized"
          borderWidth="1px"
          color="fg"
          disabled={disabled}
          flexShrink={0}
          fontWeight="medium"
          gap={2}
          letterSpacing="tight"
          maxW={{ base: 'full', md: 'none' }}
          minW={0}
          overflow="hidden"
          px={3}
          rounded="lg"
          shadow="xs"
          size={size}
          variant="outline"
        >
          <Box
            alignItems="center"
            as="span"
            bg="colorPalette.subtle"
            color="colorPalette.fg"
            display="inline-flex"
            flexShrink={0}
            justifyContent="center"
            p={1}
            rounded="md"
          >
            <LuCalendarRange size={14} />
          </Box>
          <Text
            as="span"
            lineClamp={1}
            maxW={{ base: '160px', sm: 'none' }}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {triggerLabel}
          </Text>
          <Box
            as="span"
            color="fg.muted"
            flexShrink={0}
            transform={open ? 'rotate(180deg)' : 'rotate(0deg)'}
            transition="transform 160ms ease"
          >
            <LuChevronDown size={14} />
          </Box>
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            bg="bg.panel"
            borderColor="border.muted"
            maxH={{ base: 'calc(100vh - 32px)', md: 'unset' }}
            maxW={{
              base: 'calc(100vw - 16px)',
              md: 'unset',
            }}
            minW={{ base: '280px', md: 'auto' }}
            overflowY={{ base: 'auto', md: 'visible' }}
            rounded="xl"
            shadow="xl"
            w={{ base: 'calc(100vw - 16px)', md: 'auto' }}
          >
            <Flex direction={{ base: 'column', md: 'row' }}>
              {/* Presets   lista vertical em todos os breakpoints.
                  No mobile vai acima do calendário, no desktop à esquerda. */}
              <Stack
                bg="bg.subtle"
                borderBottomColor="border.muted"
                borderBottomWidth={{ base: '1px', md: 0 }}
                borderRightColor="border.muted"
                borderRightWidth={{ base: 0, md: '1px' }}
                gap={1}
                minW={{ base: 'auto', md: '200px' }}
                p={{ base: 2, md: 3 }}
                roundedLeft={{ md: 'xl' }}
                roundedTop={{ base: 'xl', md: 'xl' }}
                w={{ base: 'full', md: 'auto' }}
              >
                <Text
                  color="fg.muted"
                  fontSize="2xs"
                  fontWeight="semibold"
                  letterSpacing="widest"
                  px={2}
                  py={1}
                  textTransform="uppercase"
                >
                  Período
                </Text>
                {presets.map((days) => {
                  const active =
                    current.kind === 'preset' &&
                    current.days === days &&
                    mode === 'presets'
                  return (
                    <Button
                      _hover={{
                        bg: active ? 'colorPalette.solid' : 'bg.emphasized',
                      }}
                      aria-pressed={active}
                      bg={active ? 'colorPalette.solid' : 'transparent'}
                      color={active ? 'colorPalette.contrast' : 'fg'}
                      fontSize="sm"
                      fontWeight={active ? 'semibold' : 'normal'}
                      justifyContent="flex-start"
                      key={days}
                      onClick={() => handlePresetClick(days)}
                      rounded="md"
                      size="sm"
                      variant="ghost"
                      w="full"
                    >
                      {PRESET_LABEL[days]}
                    </Button>
                  )
                })}
                {allowCustom && (
                  <>
                    <Separator my={2} />
                    <Button
                      _hover={{
                        bg:
                          mode === 'custom'
                            ? 'colorPalette.subtle'
                            : 'bg.emphasized',
                      }}
                      aria-pressed={mode === 'custom'}
                      bg={mode === 'custom' ? 'colorPalette.subtle' : 'transparent'}
                      color={mode === 'custom' ? 'colorPalette.fg' : 'fg'}
                      fontSize="sm"
                      fontWeight={mode === 'custom' ? 'semibold' : 'normal'}
                      justifyContent="flex-start"
                      onClick={() => setMode('custom')}
                      rounded="md"
                      size="sm"
                      variant="ghost"
                      w="full"
                    >
                      <HStack gap={2}>
                        <LuCalendarRange size={14} />
                        <Text as="span">Personalizado</Text>
                      </HStack>
                    </Button>
                  </>
                )}
              </Stack>

              {/* Área do calendário / formulário */}
              {mode === 'custom' ? (
                <Stack gap={3} p={{ base: 3, md: 4 }} w={{ base: 'full', md: 'auto' }}>
                  <HStack gap={{ base: 2, md: 3 }}>
                    <Stack flex={1} gap={1} minW={0}>
                      <Text
                        color="fg.muted"
                        fontSize="2xs"
                        fontWeight="semibold"
                        letterSpacing="wide"
                        textTransform="uppercase"
                      >
                        De
                      </Text>
                      <Input
                        bg="bg"
                        borderColor={
                          draftStartText && !fromBR(draftStartText)
                            ? 'red.400'
                            : 'border.emphasized'
                        }
                        fontFamily="mono"
                        fontSize="sm"
                        inputMode="numeric"
                        onChange={handleStartTextChange}
                        placeholder="DD/MM/AAAA"
                        rounded="md"
                        size="sm"
                        value={draftStartText}
                      />
                    </Stack>
                    <Box
                      color="fg.muted"
                      display={{ base: 'none', sm: 'block' }}
                      pt={5}
                    >
                      <Text>→</Text>
                    </Box>
                    <Stack flex={1} gap={1} minW={0}>
                      <Text
                        color="fg.muted"
                        fontSize="2xs"
                        fontWeight="semibold"
                        letterSpacing="wide"
                        textTransform="uppercase"
                      >
                        Até
                      </Text>
                      <Input
                        bg="bg"
                        borderColor={
                          draftEndText && !fromBR(draftEndText)
                            ? 'red.400'
                            : 'border.emphasized'
                        }
                        fontFamily="mono"
                        fontSize="sm"
                        inputMode="numeric"
                        onChange={handleEndTextChange}
                        placeholder="DD/MM/AAAA"
                        rounded="md"
                        size="sm"
                        value={draftEndText}
                      />
                    </Stack>
                  </HStack>

                  <Flex
                    direction={{ base: 'column', lg: 'row' }}
                    gap={{ base: 2, lg: 6 }}
                    onMouseLeave={() => setHover(null)}
                  >
                    <Calendar
                      end={draftEnd}
                      hideNext
                      hover={hover}
                      onHover={setHover}
                      onNavigate={(delta) =>
                        setLeftMonth((m) => addMonths(m, delta))
                      }
                      onSelect={handleDaySelect}
                      start={draftStart}
                      visibleMonth={leftMonth}
                    />
                    <Box
                      display={{ base: 'none', lg: 'block' }}
                    >
                      <Calendar
                        end={draftEnd}
                        hidePrev
                        hover={hover}
                        onHover={setHover}
                        onNavigate={(delta) =>
                          setLeftMonth((m) => addMonths(m, delta))
                        }
                        onSelect={handleDaySelect}
                        start={draftStart}
                        visibleMonth={rightMonth}
                      />
                    </Box>
                  </Flex>

                  {/* Feedback de validação/aviso */}
                  <VStack
                    align="stretch"
                    gap={2}
                    minH="28px"
                  >
                    {validation.message && (
                      <HStack
                        color="red.500"
                        fontSize="xs"
                        gap={2}
                      >
                        <LuTriangleAlert size={14} />
                        <Text>{validation.message}</Text>
                      </HStack>
                    )}
                    {validation.warning && (
                      <HStack
                        color="orange.500"
                        fontSize="xs"
                        gap={2}
                      >
                        <LuTriangleAlert size={14} />
                        <Text>{validation.warning}</Text>
                      </HStack>
                    )}
                  </VStack>

                  <Flex
                    align="center"
                    direction={{ base: 'column', sm: 'row' }}
                    gap={2}
                    justify="space-between"
                  >
                    <Text
                      color="fg.muted"
                      fontSize="xs"
                      textAlign={{ base: 'center', sm: 'left' }}
                      w={{ base: 'full', sm: 'auto' }}
                    >
                      {draftStart && draftEnd && !validation.message
                        ? `${diffInDays(draftStart, draftEnd) + 1} dias selecionados`
                        : 'Toque em uma data para iniciar o intervalo.'}
                    </Text>
                    <HStack
                      gap={2}
                      justify={{ base: 'stretch', sm: 'flex-end' }}
                      w={{ base: 'full', sm: 'auto' }}
                    >
                      <Button
                        flex={{ base: 1, sm: 'initial' }}
                        onClick={handleCancel}
                        size="sm"
                        variant="ghost"
                      >
                        Cancelar
                      </Button>
                      <Button
                        _hover={{ bg: 'colorPalette.emphasized' }}
                        bg="colorPalette.solid"
                        color="colorPalette.contrast"
                        disabled={!validation.ok}
                        flex={{ base: 1, sm: 'initial' }}
                        fontWeight="semibold"
                        onClick={handleApply}
                        rounded="md"
                        size="sm"
                      >
                        Aplicar
                      </Button>
                    </HStack>
                  </Flex>
                </Stack>
              ) : (
                <Stack
                  gap={2}
                  maxW={{ base: 'full', md: '280px' }}
                  p={{ base: 4, md: 6 }}
                >
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    Períodos rápidos
                  </Text>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                    lineHeight="short"
                  >
                    Escolha um dos períodos rápidos ou selecione{' '}
                    <Text
                      as="span"
                      color="colorPalette.fg"
                      fontWeight="semibold"
                    >
                      Personalizado
                    </Text>{' '}
                    para definir um intervalo próprio.
                  </Text>
                </Stack>
              )}
            </Flex>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

/**
 * Converte um `DateRangeValue` em parâmetros de query string compatíveis
 * com os endpoints de dashboard/metrics. Usa apenas `dateFilter` OU o par
 * `startDate`/`endDate`   nunca ambos.
 */
export function dateRangeToParams(
  v: DateRangeValue | undefined
): Record<string, string> {
  if (!v) return {}
  if (v.kind === 'preset') return { dateFilter: String(v.days) }
  return { startDate: v.startDate, endDate: v.endDate }
}

/**
 * Extrai um `DateRangeValue` a partir de `URLSearchParams` (ou objeto simples).
 * Regra: se `startDate` e `endDate` forem válidos → custom. Senão, lê
 * `dateFilter` (7|14|30). Default: preset de 7 dias.
 */
export function parseDateRangeFromSearch(
  search: URLSearchParams | Record<string, string | null | undefined>
): DateRangeValue {
  const get = (k: string) =>
    search instanceof URLSearchParams ? search.get(k) : (search[k] ?? null)

  const startRaw = get('startDate')
  const endRaw = get('endDate')
  const startDate = fromYMD(startRaw)
  const endDate = fromYMD(endRaw)
  if (startDate && endDate && !isAfter(startDate, endDate)) {
    return {
      kind: 'custom',
      startDate: toYMD(startDate),
      endDate: toYMD(endDate),
    }
  }

  const filter = get('dateFilter')
  if (
    filter === '1' ||
    filter === '7' ||
    filter === '14' ||
    filter === '30'
  ) {
    return { kind: 'preset', days: Number(filter) as DateRangePreset }
  }
  return { kind: 'preset', days: 7 }
}

/** Igualdade profunda simples para comparar dois valores. */
export function isSameDateRange(
  a: DateRangeValue | undefined,
  b: DateRangeValue | undefined
): boolean {
  if (!a || !b) return a === b
  if (a.kind !== b.kind) return false
  if (a.kind === 'preset' && b.kind === 'preset') return a.days === b.days
  if (a.kind === 'custom' && b.kind === 'custom') {
    return a.startDate === b.startDate && a.endDate === b.endDate
  }
  return false
}

const DateRangeFilter = memo(DateRangeFilterComponent)
export { DateRangeFilter }
