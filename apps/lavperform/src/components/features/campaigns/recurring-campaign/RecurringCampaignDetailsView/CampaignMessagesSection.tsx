import {
  Badge,
  Box,
  Center,
  Flex,
  Heading,
  HStack,
  IconButton,
  Separator,
  Spinner,
  Stack,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import useEmblaCarousel from 'embla-carousel-react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  LuCalendarClock,
  LuChevronLeft,
  LuChevronRight,
  LuMessageSquare,
  LuPhone,
  LuShoppingBag,
  LuTag,
  LuX,
} from 'react-icons/lu'
import { useSearchParams } from 'react-router-dom'

import {
  DateRangeFilter,
  type DateRangeValue,
  Empty,
  LazyImage,
  toaster,
} from '@/components'
import { Tooltip } from '@/components/ui/tooltip'
import { useWhiteLabel } from '@/config'
import { convertLinkToResizedImage } from '@/firebase/storage'
import { useCampaignMessages } from '@/hooks/queries'
import type {
  RecurringCampaignMessageOrder,
  RecurringCampaignMessageStatus,
  RfvClassificationSnake,
} from '@/types'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { formatTelefone } from '@/utils/mask'
import { formatDate } from '@/utils/strings'

import { messageStatusItems } from '../constants'
import {
  type CampaignMessagesFiltersState,
  DEFAULT_MESSAGES_RANGE,
  filtersToMessagesQuery,
  isDefaultMessagesFilters,
  parseMessagesFiltersFromSearch,
  writeMessagesFiltersToSearch,
} from './campaignMessagesFilters'
import { MultiSelectFilter } from './MultiSelectFilter'

const saleGlowAnimation = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--theme-primary) 50%, transparent),
                0 0 10px 2px color-mix(in srgb, var(--theme-primary) 15%, transparent);
  }
  50% {
    box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--theme-primary) 90%, transparent),
                0 0 18px 5px color-mix(in srgb, var(--theme-primary) 28%, transparent);
  }
`

function formatCurrencyBRL(value: string): string {
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatOrderDateTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function OrdersTooltipContent({
  orders,
  colorPalette,
}: {
  orders: RecurringCampaignMessageOrder[]
  colorPalette: string
}) {
  const totalSum = orders.reduce((acc, o) => acc + parseFloat(o.total || '0'), 0)
  const accentColor = `${colorPalette}.400`
  return (
    <Box
      maxW="260px"
      py={1}
    >
      <HStack
        gap={1.5}
        mb={2}
      >
        <LuShoppingBag
          color="var(--theme-primary)"
          size={13}
        />
        <Text
          color={accentColor}
          fontSize="xs"
          fontWeight="semibold"
        >
          Venda gerada pela mensagem
        </Text>
      </HStack>
      {orders.map((order, i) => (
        <Box key={order.id}>
          {i > 0 && (
            <Separator
              mb={2}
              mt={2}
              opacity={0.3}
            />
          )}
          <Flex
            align="center"
            gap={2}
            justify="space-between"
          >
            <Text
              color="fg.muted"
              fontSize="xs"
            >
              Venda #{order.displayId}
            </Text>
            <Text
              color={accentColor}
              fontSize="xs"
              fontWeight="bold"
            >
              {formatCurrencyBRL(order.total)}
            </Text>
          </Flex>
          {order.createdAt && (
            <HStack
              gap={1.5}
              mt={0.5}
            >
              <LuCalendarClock
                color="var(--chakra-colors-fg-subtle)"
                size={11}
              />
              <Text
                color="fg.subtle"
                fontSize="xs"
              >
                {formatOrderDateTime(order.createdAt)}
              </Text>
            </HStack>
          )}
        </Box>
      ))}
      {orders.length > 1 && (
        <>
          <Separator
            mb={2}
            mt={2}
            opacity={0.3}
          />
          <Flex
            align="center"
            justify="space-between"
          >
            <Text
              color="fg.muted"
              fontSize="xs"
              fontWeight="medium"
            >
              Total
            </Text>
            <Text
              color={accentColor}
              fontSize="xs"
              fontWeight="bold"
            >
              {totalSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </Flex>
        </>
      )}
    </Box>
  )
}

const RFV_OPTIONS = clientTypesOptions.items.map((item) => ({
  value: item.value as RfvClassificationSnake,
  label: item.label,
}))

const STATUS_ORDER: RecurringCampaignMessageStatus[] = [
  'PENDING',
  'PROCESSING',
  'SENT',
  'ERROR',
  'ABORTED',
]

const STATUS_OPTIONS = STATUS_ORDER.map((value) => {
  const item = messageStatusItems.find((m) => m.value === value)
  return {
    value,
    label: item?.label ?? value,
    icon: item?.icon,
    color: item?.color,
  }
})

const RFV_LABEL: Record<string, string> = Object.fromEntries(
  clientTypesOptions.items.map((item) => [item.value, item.label])
)

type AppliedChip =
  | { id: string; label: string; onRemove: () => void }
  | undefined

function formatRangeChip(value: DateRangeValue): string | null {
  if (value.kind === 'preset') {
    if (value.days === 1) return null
    return `Últimos ${value.days} dias`
  }
  const [sYear, sMonth, sDay] = value.startDate.split('-')
  const [eYear, eMonth, eDay] = value.endDate.split('-')
  const short = sYear === eYear
  const start = short ? `${sDay}/${sMonth}` : `${sDay}/${sMonth}/${sYear}`
  const end = short ? `${eDay}/${eMonth}` : `${eDay}/${eMonth}/${eYear}`
  return `${start} – ${end}`
}

interface Props {
  campaignId: string | undefined
  companyId: string | undefined
}

interface TruncatedMessageTextProps {
  text: string
}

function TruncatedMessageText({ text }: TruncatedMessageTextProps) {
  return (
    <Tooltip
      closeDelay={100}
      content={
        <Box
          maxW="360px"
          whiteSpace="pre-wrap"
          wordBreak="break-word"
        >
          {text}
        </Box>
      }
      contentProps={{
        bg: 'bg.panel',
        borderColor: 'border.muted',
        borderWidth: '1px',
        color: 'fg',
        fontSize: 'sm',
        lineHeight: '1.55',
        px: 3,
        py: 2,
        shadow: 'lg',
      }}
      openDelay={200}
      showArrow
    >
      <Text
        color="fg"
        cursor="help"
        fontSize="sm"
        lineClamp={6}
        lineHeight="1.55"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
      >
        {text}
      </Text>
    </Tooltip>
  )
}

function CampaignMessagesSectionComponent({ campaignId, companyId }: Props) {
  const { colorPalette } = useWhiteLabel()
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<CampaignMessagesFiltersState>(
    () => parseMessagesFiltersFromSearch(searchParams),
    [searchParams]
  )

  const query = useMemo(() => filtersToMessagesQuery(filters), [filters])

  const {
    data: messages,
    isLoading,
    isFetching,
    error,
  } = useCampaignMessages(campaignId, companyId, query)

  const lastErrorRef = useRef<unknown>(null)
  useEffect(() => {
    if (!error || error === lastErrorRef.current) return
    lastErrorRef.current = error
    const anyErr = error as { response?: { data?: { message?: string } } }
    toaster.create({
      type: 'error',
      title: 'Erro ao carregar mensagens',
      description:
        anyErr?.response?.data?.message ??
        'Não foi possível carregar as mensagens da campanha.',
    })
  }, [error])

  const updateFilters = useCallback(
    (partial: Partial<CampaignMessagesFiltersState>) => {
      const next: CampaignMessagesFiltersState = { ...filters, ...partial }
      setSearchParams((prev) => writeMessagesFiltersToSearch(prev, next), {
        replace: true,
      })
    },
    [filters, setSearchParams]
  )

  const handleDateRangeChange = useCallback(
    (next: DateRangeValue) => updateFilters({ dateRange: next }),
    [updateFilters]
  )

  const handleRfvChange = useCallback(
    (next: string[]) =>
      updateFilters({ rfv: next as RfvClassificationSnake[] }),
    [updateFilters]
  )

  const handleStatusChange = useCallback(
    (next: string[]) =>
      updateFilters({ status: next as RecurringCampaignMessageStatus[] }),
    [updateFilters]
  )

  const handleClearAll = useCallback(() => {
    updateFilters({
      dateRange: DEFAULT_MESSAGES_RANGE,
      rfv: [],
      status: [],
    })
  }, [updateFilters])

  const isDefault = isDefaultMessagesFilters(filters)

  const appliedChips = useMemo<AppliedChip[]>(() => {
    const chips: AppliedChip[] = []

    const rangeLabel = formatRangeChip(filters.dateRange)
    if (rangeLabel) {
      chips.push({
        id: 'date',
        label: rangeLabel,
        onRemove: () => updateFilters({ dateRange: DEFAULT_MESSAGES_RANGE }),
      })
    }

    for (const value of filters.rfv) {
      chips.push({
        id: `rfv:${value}`,
        label: `RFV: ${RFV_LABEL[value] ?? value}`,
        onRemove: () =>
          updateFilters({ rfv: filters.rfv.filter((v) => v !== value) }),
      })
    }

    for (const value of filters.status) {
      const item = messageStatusItems.find((m) => m.value === value)
      chips.push({
        id: `status:${value}`,
        label: `Status: ${item?.label ?? value}`,
        onRemove: () =>
          updateFilters({ status: filters.status.filter((v) => v !== value) }),
      })
    }

    return chips
  }, [filters, updateFilters])

  const messageList = messages ?? []
  const showEmpty = !isLoading && messageList.length === 0

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  })

  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect, messageList.length])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  return (
    <Box w="full">
      <Stack
        gap={3}
        mb={4}
      >
        <Flex
          align={{ base: 'stretch', sm: 'center' }}
          direction={{ base: 'column', sm: 'row' }}
          gap={3}
          justify="space-between"
        >
          <HStack gap={3}>
            <Flex
              align="center"
              bg={`${colorPalette}.subtle`}
              borderRadius="lg"
              color={`${colorPalette}.fg`}
              h={9}
              justify="center"
              w={9}
            >
              <LuMessageSquare size={18} />
            </Flex>
            <Stack gap={0}>
              <HStack gap={2}>
                <Heading
                  fontSize="sm"
                  fontWeight="semibold"
                  letterSpacing="tight"
                >
                  Mensagens enviadas
                </Heading>
                {isFetching && !isLoading && (
                  <Spinner
                    color="fg.muted"
                    size="xs"
                  />
                )}
              </HStack>
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                Histórico dos disparos com filtros de período, RFV e status
              </Text>
            </Stack>
          </HStack>

          {messageList.length > 1 && (
            <HStack gap={1.5}>
              <IconButton
                aria-label="Mensagem anterior"
                disabled={!canScrollPrev}
                onClick={scrollPrev}
                rounded="full"
                size="sm"
                variant="outline"
              >
                <LuChevronLeft />
              </IconButton>
              <IconButton
                aria-label="Próxima mensagem"
                disabled={!canScrollNext}
                onClick={scrollNext}
                rounded="full"
                size="sm"
                variant="outline"
              >
                <LuChevronRight />
              </IconButton>
            </HStack>
          )}
        </Flex>

        <Flex
          align="center"
          gap={2}
          wrap="wrap"
        >
          <DateRangeFilter
            maxRangeDays={90}
            onChange={handleDateRangeChange}
            presets={[1, 7, 14, 30]}
            size="sm"
            value={filters.dateRange}
          />
          <MultiSelectFilter
            icon={<LuTag size={14} />}
            label="RFV"
            onChange={handleRfvChange}
            options={RFV_OPTIONS}
            value={filters.rfv}
          />
          <MultiSelectFilter
            label="Status"
            onChange={handleStatusChange}
            options={STATUS_OPTIONS}
            value={filters.status}
          />
          {!isDefault && (
            <Box
              _hover={{ color: 'fg' }}
              as="button"
              color="fg.muted"
              fontSize="xs"
              fontWeight="medium"
              onClick={handleClearAll}
              px={2}
              py={1}
              rounded="md"
              textDecoration="underline"
              transition="color 120ms ease"
            >
              Limpar filtros
            </Box>
          )}
        </Flex>

        {appliedChips.length > 0 && (
          <Wrap gap={2}>
            {appliedChips.map((chip) =>
              chip ? (
                <WrapItem key={chip.id}>
                  <Badge
                    alignItems="center"
                    cursor="pointer"
                    display="inline-flex"
                    gap={1}
                    onClick={chip.onRemove}
                    px={2}
                    py={1}
                    rounded="full"
                    variant="subtle"
                  >
                    <Text
                      as="span"
                      fontSize="xs"
                    >
                      {chip.label}
                    </Text>
                    <Box
                      aria-label={`Remover filtro ${chip.label}`}
                      as="span"
                      color="fg.muted"
                      display="inline-flex"
                    >
                      <LuX size={12} />
                    </Box>
                  </Badge>
                </WrapItem>
              ) : null
            )}
          </Wrap>
        )}
      </Stack>

      {isLoading ? (
        <Center
          minH="200px"
          w="100%"
        >
          <Spinner size="lg" />
        </Center>
      ) : showEmpty ? (
        <Box py={8}>
          <Empty
            description="Ajuste os filtros acima ou limpe-os para visualizar as mensagens enviadas."
            title="Nenhuma mensagem encontrada"
          />
        </Box>
      ) : (
        <Box
          className="embla"
          maxW="full"
          minW={0}
          overflow="hidden"
          ref={emblaRef}
          w="full"
        >
          <HStack
            alignItems="stretch"
            className="embla__container"
            ml={{ base: '-2', md: '-3' }}
            py={2}
          >
            {messageList.map((message, index) => {
              const messageStatus = messageStatusItems.find(
                (item) => item.value === message.status
              )
              const customerName = message.customerName?.trim() || 'Cliente'

              const hasSale = message.hasOrder && message.orders && message.orders.length > 0

              return (
                <Box
                  className="embla__slide"
                  flexShrink={0}
                  key={`${message.phone}-${message.scheduledDate}-${index}`}
                  maxW={{ base: '85%', sm: '320px', md: '340px' }}
                  minW={{ base: '85%', sm: '320px', md: '340px' }}
                ><Box
                  _hover={{
                    borderColor: hasSale ? `${colorPalette}.400` : 'border.emphasized',
                    shadow: 'sm',
                  }}
                  bg="bg.panel"
                  borderColor={hasSale ? `${colorPalette}.400` : 'border.muted'}
                  borderRadius="lg"
                  borderWidth="1px"
                  css={hasSale ? { animation: `${saleGlowAnimation} 2.8s ease-in-out infinite` } : undefined}
                  display="flex"
                  flexDirection="column"
                  h="100%"
                  overflow="hidden"
                  transition="border-color 150ms ease, box-shadow 150ms ease"
                  w="100%"
                >
                  <Flex
                    align="center"
                    gap={2}
                    justify="space-between"
                    px={4}
                    pt={3}
                    pb={message.customerRfvClassification ? 2 : 2.5}
                  >
                    <Stack
                      flex={1}
                      gap={0.5}
                      minW={0}
                    >
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        lineClamp={1}
                      >
                        {customerName}
                      </Text>
                      <HStack
                        color="fg.muted"
                        fontSize="xs"
                        gap={1.5}
                      >
                        <LuPhone size={11} />
                        <Text
                          as="span"
                          lineClamp={1}
                        >
                          {formatTelefone(message.phone)}
                        </Text>
                      </HStack>
                    </Stack>

                    <HStack
                      flexShrink={0}
                      gap={1.5}
                    >
                      {hasSale && message.orders && (
                        <Tooltip
                          content={<OrdersTooltipContent colorPalette={colorPalette} orders={message.orders} />}
                          contentProps={{
                            bg: 'bg.panel',
                            borderColor: `${colorPalette}.700`,
                            borderWidth: '1px',
                            color: 'fg',
                            px: 3,
                            py: 2.5,
                            shadow: 'lg',
                          }}
                          openDelay={100}
                          showArrow
                        >
                          <Box
                            _hover={{ color: `${colorPalette}.400`, transform: 'scale(1.1)' }}
                            alignItems="center"
                            color={`${colorPalette}.500`}
                            cursor="pointer"
                            display="inline-flex"
                            transition="color 150ms ease, transform 150ms ease"
                          >
                            <LuShoppingBag size={15} />
                          </Box>
                        </Tooltip>
                      )}
                      {messageStatus && (
                        <Badge
                          colorPalette={messageStatus.color}
                          gap={1}
                          size="sm"
                          variant="subtle"
                        >
                          {messageStatus.icon}
                          {messageStatus.label}
                        </Badge>
                      )}
                    </HStack>
                  </Flex>

                  {message.customerRfvClassification && (
                    <HStack
                      gap={1.5}
                      pb={2.5}
                      px={4}
                      wrap="wrap"
                    >
                      <Badge
                        colorPalette={colorPalette}
                        size="xs"
                        variant="subtle"
                      >
                        <LuTag size={10} />
                        {clientTypesOptions.items.find(
                          (item) =>
                            item.value === message.customerRfvClassification
                        )?.label ?? message.customerRfvClassification}
                      </Badge>
                    </HStack>
                  )}

                  {message.mediaUrl && (
                    <Box
                      bg="bg.subtle"
                      borderRadius="md"
                      h="96px"
                      mx={4}
                      overflow="hidden"
                    >
                      <LazyImage
                        alt={message.messageText || 'Mídia da mensagem'}
                        fit="cover"
                        h="100%"
                        src={convertLinkToResizedImage(message.mediaUrl)}
                        w="100%"
                      />
                    </Box>
                  )}

                  {message.messageText && (
                    <Box
                      mt={message.mediaUrl ? 3 : 0}
                      px={4}
                    >
                      <TruncatedMessageText text={message.messageText} />
                    </Box>
                  )}

                  <Flex
                    align="center"
                    borderTopColor="border.subtle"
                    borderTopWidth="1px"
                    color="fg.muted"
                    fontSize="xs"
                    justify="flex-end"
                    mt={message.messageText || message.mediaUrl ? 3 : 1}
                    px={4}
                    py={2}
                  >
                    <HStack gap={1.5}>
                      <LuCalendarClock size={12} />
                      <Text as="span">
                        {formatDate(message.scheduledDate)}
                      </Text>
                    </HStack>
                  </Flex>
                </Box>
                </Box>
              )
            })}
          </HStack>
        </Box>
      )}
    </Box>
  )
}

const CampaignMessagesSection = memo(CampaignMessagesSectionComponent)

export { CampaignMessagesSection }
