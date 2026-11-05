import { Box, Button, Flex, SimpleGrid, Text } from '@chakra-ui/react'
import { LuRefreshCw } from 'react-icons/lu'

import { shellDark } from '@/components/layout/AppLayout/shellPalette'
import { useColorModeValue } from '@/components/ui/color-mode'
import type { ConnectionProvider, SocialConnection } from '@/types'

const COPY: Record<
  ConnectionProvider,
  { title: string; subtitle: string; mark: string; idle: string }
> = {
  META: {
    title: 'Meta',
    subtitle: 'Facebook + Instagram',
    mark: 'f',
    idle: 'Publique na Página e no Instagram da loja.',
  },
  GOOGLE_BUSINESS: {
    title: 'Google Meu Negócio',
    subtitle: 'Seu perfil no Google e no Maps',
    mark: 'G',
    idle: 'Responda avaliações e publique novidades no seu perfil.',
  },
  GOOGLE_ADS: {
    title: 'Google Ads',
    subtitle: 'Anúncios no Google',
    mark: 'A',
    idle: 'Veja impressões, cliques e custo dos últimos 30 dias.',
  },
}

const STATUS = {
  CONNECTED: { label: 'Conectado', dot: '#12B76A', bg: '#ECFDF3', color: '#027A48' },
  DISCONNECTED: { label: 'Não conectado', dot: '#A1A1AA', bg: '#F4F4F5', color: '#3F3F46' },
  CONNECTING: { label: 'Conectando', dot: '#0284C7', bg: '#E0F2FE', color: '#075985' },
  ERROR: { label: 'Precisa de atenção', dot: '#F97316', bg: '#FFF7ED', color: '#C2410C' },
} as const

export function ChannelCards({
  connections,
  busy,
  onConnect,
  onCancel,
  onDisconnect,
  onRetry,
  onSwitch,
}: {
  connections: SocialConnection[]
  busy?: ConnectionProvider | null
  onConnect: (provider: ConnectionProvider) => void
  onCancel: (provider: ConnectionProvider) => void
  onDisconnect: (provider: ConnectionProvider) => void
  onRetry: (provider: ConnectionProvider) => void
  onSwitch: (provider: ConnectionProvider) => void
}) {
  const cardBg = useColorModeValue('white', shellDark.card)
  const border = useColorModeValue('#E4E4E7', shellDark.border)
  const muted = useColorModeValue('#71717A', shellDark.muted)
  const title = useColorModeValue('#18181B', 'gray.100')
  const order: ConnectionProvider[] = ['META', 'GOOGLE_BUSINESS', 'GOOGLE_ADS']

  return (
    <SimpleGrid
      columns={{ base: 1, lg: 3 }}
      gap={4}
    >
      {order.map((provider) => {
        const connection = connections.find((item) => item.provider === provider) ?? {
          provider,
          status: 'DISCONNECTED' as const,
          configured: true,
          sandbox: false,
          accountName: null,
          accountDetail: null,
          lastError: null,
          metrics: null,
        }
        const copy = COPY[provider]
        const badge = STATUS[connection.status]
        return (
          <Flex
            bg={cardBg}
            borderColor={border}
            borderRadius="xl"
            borderWidth="1px"
            data-testid={`channel-card-${provider}`}
            direction="column"
            gap={3}
            key={provider}
            p={4}
          >
            <Flex gap={3}>
              <Flex
                align="center"
                bg="#093A58"
                borderRadius="lg"
                color="white"
                fontSize="xl"
                fontWeight="bold"
                h="44px"
                justify="center"
                w="44px"
              >
                {copy.mark}
              </Flex>
              <Box>
                <Text
                  color={title}
                  fontWeight="semibold"
                >
                  {copy.title}
                </Text>
                <Text
                  color={muted}
                  fontSize="sm"
                >
                  {copy.subtitle}
                </Text>
                <Flex
                  align="center"
                  bg={badge.bg}
                  borderRadius="full"
                  color={badge.color}
                  fontSize="xs"
                  fontWeight="medium"
                  gap={2}
                  mt={2}
                  px={2.5}
                  py={1}
                  w="fit-content"
                >
                  <Box
                    bg={badge.dot}
                    borderRadius="full"
                    boxSize="6px"
                  />
                  {badge.label}
                </Flex>
              </Box>
            </Flex>
            {connection.status === 'CONNECTED' && connection.accountName ? (
              <Box>
                <Text
                  fontSize="sm"
                  fontWeight="medium"
                >
                  {connection.accountName}
                </Text>
                {connection.accountDetail ? (
                  <Text
                    color={muted}
                    fontSize="xs"
                  >
                    {connection.accountDetail}
                  </Text>
                ) : null}
              </Box>
            ) : (
              <Text
                color={muted}
                fontSize="sm"
              >
                {connection.lastError || copy.idle}
              </Text>
            )}
            {connection.metrics?.length ? (
              <SimpleGrid
                columns={3}
                gap={2}
              >
                {connection.metrics.map((metric) => (
                  <Box key={metric.label}>
                    <Text
                      color={muted}
                      fontSize="xs"
                    >
                      {metric.label}
                    </Text>
                    <Text fontWeight="semibold">{metric.value}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            ) : null}
            {connection.status === 'CONNECTED' ? (
              <Flex gap={2}>
                <Button
                  flex={1}
                  onClick={() => onSwitch(provider)}
                  variant="outline"
                >
                  Trocar conta
                </Button>
                <Button
                  flex={1}
                  onClick={() => onDisconnect(provider)}
                  variant="outline"
                >
                  Desconectar
                </Button>
              </Flex>
            ) : null}
            {connection.status === 'DISCONNECTED' ? (
              <Button
                bg="#093A58"
                color="white"
                onClick={() => onConnect(provider)}
              >
                Conectar
              </Button>
            ) : null}
            {connection.status === 'CONNECTING' ? (
              <Button
                onClick={() => onCancel(provider)}
                variant="outline"
              >
                Cancelar
              </Button>
            ) : null}
            {connection.status === 'ERROR' ? (
              <Button
                bg="#093A58"
                color="white"
                loading={busy === provider}
                onClick={() => onRetry(provider)}
              >
                <LuRefreshCw />
                Tentar de novo
              </Button>
            ) : null}
          </Flex>
        )
      })}
    </SimpleGrid>
  )
}
