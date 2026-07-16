import {
  Alert,
  Box,
  Card,
  FormatNumber,
  HStack,
  Heading,
  Icon,
  Skeleton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { ElementType } from 'react'
import {
  RiBroadcastLine,
  RiContactsLine,
  RiSparkling2Line,
  RiUserAddLine,
  RiUserForbidLine,
  RiUserLine,
} from 'react-icons/ri'

import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { useCustomerMetrics } from '@/hooks/queries'

function safePercent(part: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, (part / total) * 100))
}

interface MiniStatProps {
  icon: ElementType
  label: string
  value: number
  tone?: 'default' | 'positive' | 'muted' | 'accent'
}

function MiniStat({ icon, label, value, tone = 'default' }: MiniStatProps) {
  const toneStyles = {
    default: { iconColor: 'fg', bg: 'bg.subtle' },
    positive: { iconColor: 'green.500', bg: 'green.subtle' },
    muted: { iconColor: 'fg.muted', bg: 'bg.muted' },
    accent: { iconColor: 'primary', bg: 'bg.subtle' },
  }[tone]

  return (
    <HStack
      align="center"
      gap={3}
    >
      <Box
        bg={toneStyles.bg}
        borderRadius="lg"
        flexShrink={0}
        lineHeight={0}
        p={2.5}
      >
        <Icon
          as={icon}
          color={toneStyles.iconColor}
          size="md"
        />
      </Box>
      <VStack
        align="flex-start"
        gap={0}
      >
        <Text
          color="fg.muted"
          fontSize="xs"
          letterSpacing="wide"
          textTransform="uppercase"
        >
          {label}
        </Text>
        <Text
          fontSize="xl"
          fontWeight="semibold"
          lineHeight={1.1}
        >
          <FormatNumber value={value} />
        </Text>
      </VStack>
    </HStack>
  )
}

interface SegmentBarProps {
  segments: Array<{ value: number; color: string }>
  total: number
}

function SegmentBar({ segments, total }: SegmentBarProps) {
  return (
    <Box
      bg="bg.muted"
      borderRadius="full"
      h="6px"
      overflow="hidden"
      w="full"
    >
      <HStack
        gap={0}
        h="full"
        w="full"
      >
        {segments.map((segment, idx) => {
          const width = safePercent(segment.value, total)
          if (width === 0) return null
          return (
            <Box
              key={idx}
              bg={segment.color}
              h="full"
              transition="width 0.4s ease"
              w={`${width}%`}
            />
          )
        })}
      </HStack>
    </Box>
  )
}

function SectionHeader({
  icon,
  label,
}: {
  icon: ElementType
  label: string
}) {
  return (
    <HStack
      color="fg.muted"
      gap={2}
    >
      <Icon
        as={icon}
        size="sm"
      />
      <Text
        fontSize="xs"
        fontWeight="medium"
        letterSpacing="0.08em"
        textTransform="uppercase"
      >
        {label}
      </Text>
    </HStack>
  )
}

export function CustomerMetricsSection() {
  const { selectedCompany } = useAuth()
  const { colors } = useWhiteLabel()
  const { data, isLoading, isError } = useCustomerMetrics(selectedCompany?.id)

  if (isError) {
    return (
      <Alert.Root
        borderRadius="lg"
        mb={6}
        status="error"
      >
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Erro ao carregar métricas de clientes</Alert.Title>
        </Alert.Content>
      </Alert.Root>
    )
  }

  if (isLoading) {
    return (
      <Skeleton
        borderRadius="xl"
        h={{ base: '380px', lg: '180px' }}
        mb={6}
      />
    )
  }

  const metrics = data?.data
  if (!metrics) return null

  const {
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    achievableCustomers,
    unattainableCustomers,
    newCustomers,
    newCustomersPeriodDays,
    leads,
  } = metrics

  const activePct = safePercent(activeCustomers, totalCustomers)
  const inactivePct = safePercent(inactiveCustomers, totalCustomers)

  const reachTotal = achievableCustomers + unattainableCustomers
  const achievablePct = safePercent(achievableCustomers, reachTotal)

  return (
    <Card.Root
      borderRadius="xl"
      mb={6}
    >

      <Card.Body p={{ base: 5, md: 6 }}>
        <Stack
          align="stretch"
          direction={{ base: 'column', lg: 'row' }}
          gap={0}
        >
          <VStack
            align="flex-start"
            borderBottomWidth={{ base: '1px', lg: 0 }}
            borderColor="border"
            borderRightWidth={{ base: 0, lg: '1px' }}
            flex={{ base: 'auto', lg: 1.2 }}
            gap={4}
            pb={{ base: 5, lg: 0 }}
            pr={{ base: 0, lg: 6 }}
          >
            <SectionHeader
              icon={RiUserLine}
              label="Base de clientes"
            />
            <VStack
              align="flex-start"
              gap={1}
            >
              <Heading
                fontSize={{ base: '4xl', md: '5xl' }}
                fontWeight="bold"
                letterSpacing="-0.02em"
                lineHeight={1}
              >
                <FormatNumber value={totalCustomers} />
              </Heading>
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                Total de clientes na base
              </Text>
            </VStack>

            <VStack
              align="stretch"
              gap={2}
              w="full"
            >
              <SegmentBar
                segments={[
                  { value: activeCustomers, color: 'green.500' },
                  { value: inactiveCustomers, color: 'gray.400' },
                ]}
                total={totalCustomers}
              />
              <HStack
                color="fg.muted"
                fontSize="xs"
                justify="space-between"
              >
                <HStack gap={1.5}>
                  <Box
                    bg="green.500"
                    borderRadius="full"
                    h="8px"
                    w="8px"
                  />
                  <Text>
                    <Text
                      as="span"
                      color="fg"
                      fontWeight="semibold"
                    >
                      <FormatNumber value={activeCustomers} />
                    </Text>{' '}
                    ativos · {Math.round(activePct)}%
                  </Text>
                </HStack>
                <HStack gap={1.5}>
                  <Box
                    bg="gray.400"
                    borderRadius="full"
                    h="8px"
                    w="8px"
                  />
                  <Text>
                    <Text
                      as="span"
                      color="fg"
                      fontWeight="semibold"
                    >
                      <FormatNumber value={inactiveCustomers} />
                    </Text>{' '}
                    inativos · {Math.round(inactivePct)}%
                  </Text>
                </HStack>
              </HStack>
            </VStack>
          </VStack>

          <VStack
            align="stretch"
            borderBottomWidth={{ base: '1px', lg: 0 }}
            borderColor="border"
            borderRightWidth={{ base: 0, lg: '1px' }}
            flex={1}
            gap={4}
            pl={{ base: 0, lg: 6 }}
            pr={{ base: 0, lg: 6 }}
            py={{ base: 5, lg: 0 }}
          >
            <SectionHeader
              icon={RiBroadcastLine}
              label="Alcançabilidade"
            />
            <VStack
              align="stretch"
              gap={3}
            >
              <MiniStat
                icon={RiBroadcastLine}
                label="Alcançáveis"
                tone="positive"
                value={achievableCustomers}
              />
              <MiniStat
                icon={RiUserForbidLine}
                label="Inalcançáveis"
                tone="muted"
                value={unattainableCustomers}
              />
            </VStack>
            <VStack
              align="stretch"
              gap={1.5}
              mt="auto"
            >
              <SegmentBar
                segments={[
                  { value: achievableCustomers, color: colors.primary },
                  { value: unattainableCustomers, color: 'gray.300' },
                ]}
                total={reachTotal}
              />
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                {reachTotal > 0 ? (
                  <>
                    <Text
                      as="span"
                      color="fg"
                      fontWeight="semibold"
                    >
                      {Math.round(achievablePct)}%
                    </Text>{' '}
                    da base é contatável via canais
                  </>
                ) : (
                  'Sem dados de canais disponíveis'
                )}
              </Text>
            </VStack>
          </VStack>

          <VStack
            align="stretch"
            flex={1}
            gap={4}
            pl={{ base: 0, lg: 6 }}
            pt={{ base: 5, lg: 0 }}
          >
            <SectionHeader
              icon={RiSparkling2Line}
              label="Aquisição"
            />
            <VStack
              align="stretch"
              gap={3}
            >
              <MiniStat
                icon={RiUserAddLine}
                label={`Novos · ${newCustomersPeriodDays}d`}
                tone="accent"
                value={newCustomers}
              />
              <MiniStat
                icon={RiContactsLine}
                label="Leads"
                tone="default"
                value={leads}
              />
            </VStack>
            <Box mt="auto">
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                Captados nos últimos{' '}
                <Text
                  as="span"
                  color="fg"
                  fontWeight="semibold"
                >
                  {newCustomersPeriodDays} dias
                </Text>
              </Text>
            </Box>
          </VStack>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
