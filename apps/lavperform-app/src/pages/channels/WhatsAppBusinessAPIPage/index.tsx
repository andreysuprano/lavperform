import {
  Badge,
  Box,
  Button,
  Card,
  HStack,
  Icon,
  Separator,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuArrowLeft,
  LuCalendar,
  LuChartBar,
  LuCircleCheck,
  LuCircleX,
  LuClock3,
  LuFingerprint,
  LuHash,
  LuPhone,
  LuShield,
  LuSparkles,
  LuZap,
} from 'react-icons/lu'
import { TbBrandMeta } from 'react-icons/tb'
import { Link } from 'react-router-dom'

import { AppContentLayout, DeleteConfirmationDialog, LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useMetaIntegration } from '@/hooks/queries'
import { queryKeys } from '@/lib/react-query'
import { metaIntegrationService } from '@/services'

type FacebookAuthResponse = {
  code?: string
  accessToken?: string
  tokenType?: string
  userID?: string
}

type FacebookLoginResponse = {
  authResponse?: FacebookAuthResponse
  status?: string
}

const COMPLETED_SIGNUP_EVENTS = new Set([
  'FINISH',
  'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
])

type WaSignupData = {
  phone_number_id?: string
  waba_id?: string
  business_id?: string
  phone_number?: string
  display_phone_number?: string
  event?: string
}

type WaSignupMessage = {
  type?: string
  event?: string
  data?: Omit<WaSignupData, 'event'>
}

type FacebookSdk = {
  init: (options: {
    appId: string
    autoLogAppEvents: boolean
    xfbml: boolean
    version: string
  }) => void
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options?: Record<string, unknown>
  ) => void
}

declare global {
  interface Window {
    FB?: FacebookSdk
    fbAsyncInit?: () => void
  }
}

function getStatusColor(status: string | null | undefined) {
  if (status === 'ACTIVE') return 'green'
  if (status === 'PENDING') return 'orange'
  return 'gray'
}

function getQualityColor(qualityRating: string | null | undefined) {
  if (qualityRating === 'GREEN') return 'green'
  if (qualityRating === 'YELLOW') return 'yellow'
  if (qualityRating === 'RED') return 'red'
  return 'gray'
}

function formatValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return 'Não informado'
  }
  return String(value)
}


function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Não informado'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Não informado'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function isFacebookOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com'))
    )
  } catch {
    return false
  }
}

type InfoCardProps = {
  label: string
  value: number | string | null | undefined
  mono?: boolean
  icon?: React.ElementType
}

function InfoCard({ label, value, mono = false, icon: IconComponent }: InfoCardProps) {
  return (
    <Card.Root>
      <Card.Body>
        <Stack gap={2}>
          <HStack gap={1.5}>
            {IconComponent && (
              <Icon
                as={IconComponent}
                boxSize={3}
                color="fg.subtle"
              />
            )}
            <Text
              color="fg.subtle"
              fontSize="2xs"
              fontWeight="semibold"
              letterSpacing="wider"
              textTransform="uppercase"
            >
              {label}
            </Text>
          </HStack>
          <Text
            color="fg"
            fontFamily={mono ? 'mono' : undefined}
            fontSize={mono ? 'xs' : 'sm'}
            fontWeight="medium"
            lineBreak="anywhere"
          >
            {formatValue(value)}
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

type SectionHeaderProps = {
  icon: React.ElementType
  title: string
  description?: string
}

function SectionHeader({ icon: IconComponent, title, description }: SectionHeaderProps) {
  return (
    <HStack gap={3}>
      <Box
        alignItems="center"
        bg="bg.subtle"
        borderRadius="md"
        display="flex"
        flexShrink={0}
        h={8}
        justifyContent="center"
        w={8}
      >
        <Icon
          as={IconComponent}
          boxSize={4}
          color="fg.muted"
        />
      </Box>
      <Stack gap={0}>
        <Text
          fontSize="sm"
          fontWeight="semibold"
        >
          {title}
        </Text>
        {description && (
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            {description}
          </Text>
        )}
      </Stack>
    </HStack>
  )
}

type StatusIndicatorCardProps = {
  icon: React.ElementType
  title: string
  description: string
  isOk: boolean
}

function StatusIndicatorCard({ icon: IconComponent, title, description, isOk }: StatusIndicatorCardProps) {
  return (
    <Card.Root
      borderLeftColor={isOk ? 'green.500' : 'orange.400'}
      borderLeftWidth="3px"
    >
      <Card.Body py={3}>
        <HStack gap={3}>
          <Icon
            as={IconComponent}
            boxSize={4.5}
            color={isOk ? 'green.500' : 'orange.400'}
            flexShrink={0}
          />
          <Stack gap={0.5}>
            <Text
              fontSize="sm"
              fontWeight="semibold"
            >
              {title}
            </Text>
            <Text
              color="fg.muted"
              fontSize="xs"
            >
              {description}
            </Text>
          </Stack>
          <Badge
            colorPalette={isOk ? 'green' : 'orange'}
            ml="auto"
            size="sm"
            variant="subtle"
          >
            {isOk ? 'OK' : 'Pendente'}
          </Badge>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}


export const WhatsAppBusinessAPIPage = () => {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()
  const [isStartingIntegration, setIsStartingIntegration] = useState(false)
  const [isMetaSdkReady, setIsMetaSdkReady] = useState(false)
  const [metaSdkError, setMetaSdkError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const waSignupDataRef = useRef<WaSignupData>({})
  const signupWaitersRef = useRef<Array<(data: WaSignupData) => void>>([])
  const { data: integration, isLoading } = useMetaIntegration(selectedCompany?.id)
  const metaAppId = import.meta.env.VITE_META_APP_ID as string | undefined
  const metaConfigId = import.meta.env.VITE_META_CONFIG_ID as string | undefined

  const publishSignupData = useCallback((data: WaSignupData) => {
    waSignupDataRef.current = data
    const waiters = signupWaitersRef.current
    signupWaitersRef.current = []
    waiters.forEach((waiter) => waiter(data))
  }, [])

  const waitForSignupData = useCallback(() => {
    const current = waSignupDataRef.current
    if (current.waba_id || current.phone_number_id) {
      return Promise.resolve(current)
    }

    return new Promise<WaSignupData>((resolve) => {
      const timeoutId = window.setTimeout(() => {
        signupWaitersRef.current = signupWaitersRef.current.filter(
          (waiter) => waiter !== onData,
        )
        resolve(waSignupDataRef.current)
      }, 4000)

      const onData = (data: WaSignupData) => {
        window.clearTimeout(timeoutId)
        resolve(data)
      }

      signupWaitersRef.current.push(onData)
    })
  }, [])

  useEffect(() => {
    if (!isStartingIntegration || !metaAppId) {
      return
    }

    if (window.FB) {
      window.FB.init({
        appId: metaAppId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v25.0',
      })
      setIsMetaSdkReady(true)
      return
    }

    window.fbAsyncInit = function initFacebookSdk() {
      window.FB?.init({
        appId: metaAppId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v25.0',
      })
      setIsMetaSdkReady(true)
    }

    if (document.getElementById('facebook-jssdk')) {
      const intervalId = window.setInterval(() => {
        if (!window.FB) return
        window.FB.init({
          appId: metaAppId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v25.0',
        })
        setIsMetaSdkReady(true)
        window.clearInterval(intervalId)
      }, 200)
      return () => window.clearInterval(intervalId)
    }

    const firstScript = document.getElementsByTagName('script')[0]
    const sdkScript = document.createElement('script')
    sdkScript.id = 'facebook-jssdk'
    sdkScript.src = 'https://connect.facebook.net/en_US/sdk.js'
    sdkScript.async = true
    sdkScript.defer = true
    sdkScript.onerror = () => {
      setMetaSdkError('Não foi possível carregar o SDK da Meta.')
    }
    firstScript.parentNode?.insertBefore(sdkScript, firstScript)
  }, [isStartingIntegration, metaAppId])

  useEffect(() => {
    if (!isStartingIntegration) return

    const handleMessage = (event: MessageEvent) => {
      if (!isFacebookOrigin(event.origin)) return
      try {
        const parsed = (
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        ) as WaSignupMessage
        if (
          parsed.type === 'WA_EMBEDDED_SIGNUP' &&
          parsed.event &&
          COMPLETED_SIGNUP_EVENTS.has(parsed.event)
        ) {
          publishSignupData({
            ...(parsed.data ?? {}),
            event: parsed.event,
          })
        }
      } catch {
        // Mensagens do SDK que não são JSON do Embedded Signup.
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isStartingIntegration, publishSignupData])

  const resetWizard = useCallback(() => {
    setIsStartingIntegration(false)
    setMetaSdkError(null)
    setConnectError(null)
    waSignupDataRef.current = {}
    signupWaitersRef.current = []
  }, [])

  const handleStartIntegration = useCallback(() => {
    setIsStartingIntegration(true)
  }, [])

  const handleCancelStart = useCallback(() => {
    resetWizard()
  }, [resetWizard])

  const handleDisconnect = useCallback(async () => {
    if (!selectedCompany?.id) return
    setIsDisconnecting(true)
    try {
      await metaIntegrationService.disconnect(selectedCompany.id)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.whatsappBusinessApi.detail(selectedCompany.id),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.whatsappBusinessApi.availability(selectedCompany.id),
      })
    } finally {
      setIsDisconnecting(false)
    }
  }, [selectedCompany, queryClient])

  const handleOpenMetaDialog = useCallback(() => {
    if (!window.FB || !selectedCompany?.id || !metaConfigId) return

    setConnectError(null)
    waSignupDataRef.current = {}

    window.FB.login(
      (response) => {
        void (async () => {
          const auth = response.authResponse
          const token = auth?.code ?? auth?.accessToken

          if (!token || response.status !== 'connected') {
            setConnectError(
              'A autenticação com a Meta não foi concluída. Tente novamente.',
            )
            return
          }

          const signup = await waitForSignupData()
          const selectedPhoneNumber =
            signup.display_phone_number ?? signup.phone_number

          if (!signup.waba_id) {
            setConnectError(
              'O cadastro do número na Meta não foi finalizado corretamente. Conclua todas as etapas do fluxo e tente novamente.',
            )
            return
          }

          setIsConnecting(true)

          try {
            await metaIntegrationService.connect(selectedCompany.id, {
              ...(selectedPhoneNumber ? { number: selectedPhoneNumber } : {}),
              access_token: token,
              token_type: auth?.tokenType ?? 'bearer',
              ...(signup.phone_number_id
                ? { phone_number_id: signup.phone_number_id }
                : {}),
              waba_id: signup.waba_id,
              ...(signup.business_id ? { business_id: signup.business_id } : {}),
              ...(signup.event ? { signup_event: signup.event } : {}),
            })
            void queryClient.invalidateQueries({
              queryKey: queryKeys.channels.whatsappBusinessApi.detail(
                selectedCompany.id,
              ),
            })
            void queryClient.invalidateQueries({
              queryKey: queryKeys.channels.whatsappBusinessApi.availability(
                selectedCompany.id,
              ),
            })
            resetWizard()
          } catch {
            setConnectError(
              'Não foi possível finalizar a integração. Verifique os dados e tente novamente.',
            )
          } finally {
            setIsConnecting(false)
          }
        })()
      },
      {
        config_id: metaConfigId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
          version: 'v4',
        },
      },
    )
  }, [metaConfigId, queryClient, resetWizard, selectedCompany, waitForSignupData])

  return (
    <AppContentLayout
      action={
        <Button
          asChild
          size="sm"
          variant="outline"
        >
          <Link to="/channels">
            <LuArrowLeft />
            Todos os canais
          </Link>
        </Button>
      }
      icon={<TbBrandMeta />}
      title="WhatsApp Business API"
    >
      {isLoading ? (
        <LoadingState />
      ) : integration ? (
        <Stack gap={4}>
          {/* Hero card com identidade e status */}
          <Card.Root>
            <Card.Body>
              <Stack gap={5}>
                <HStack
                  align="start"
                  gap={4}
                  justify="space-between"
                >
                  <HStack
                    align="center"
                    gap={4}
                  >
                    <Box
                      alignItems="center"
                      bg="bg.subtle"
                      borderRadius="xl"
                      borderWidth="1px"
                      display="flex"
                      flexShrink={0}
                      h={14}
                      justifyContent="center"
                      w={14}
                    >
                      <Icon
                        as={TbBrandMeta}
                        boxSize={7}
                        color="blue.500"
                      />
                    </Box>
                    <Stack gap={0.5}>
                      <HStack gap={2}>
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                        >
                          {integration.displayName ?? 'WhatsApp Business API'}
                        </Text>
                        <Badge
                          colorPalette={getStatusColor(integration.status)}
                          size="sm"
                          variant="subtle"
                        >
                          {integration.status ?? 'Desconhecido'}
                        </Badge>
                      </HStack>
                      {integration.phoneNumber && (
                        <HStack gap={1.5}>
                          <Icon
                            as={LuPhone}
                            boxSize={3.5}
                            color="fg.muted"
                          />
                          <Text
                            color="fg.muted"
                            fontFamily="mono"
                            fontSize="sm"
                          >
                            {integration.phoneNumber}
                          </Text>
                        </HStack>
                      )}
                    </Stack>
                  </HStack>
                  <DeleteConfirmationDialog
                    confirmButton={<>Desconectar</>}
                    description="A integração com a API Oficial do WhatsApp será removida. Você poderá reconectar a qualquer momento."
                    isLoading={isDisconnecting}
                    onClick={handleDisconnect}
                    title="Desconectar integração Meta?"
                    trigger={
                      <Button
                        colorPalette="red"
                        size="sm"
                        variant="outline"
                      >
                        Desconectar
                      </Button>
                    }
                  />
                </HStack>

                <Separator />

                {/* Cards de status de ativação */}
                <Stack gap={3}>
                  <SectionHeader
                    description="Requisitos necessários para envio de mensagens"
                    icon={LuShield}
                    title="Status de ativação"
                  />
                  <SimpleGrid
                    columns={{ base: 1, md: 2 }}
                    gap={3}
                  >
                    <StatusIndicatorCard
                      description={
                        integration.webhooksSubscribed
                          ? 'Webhooks inscritos com sucesso   eventos serão recebidos.'
                          : 'Webhooks ainda não inscritos na plataforma da Meta.'
                      }
                      icon={integration.webhooksSubscribed ? LuCircleCheck : LuCircleX}
                      isOk={integration.webhooksSubscribed}
                      title="Webhooks"
                    />
                    <StatusIndicatorCard
                      description={
                        integration.phoneNumberRegistered
                          ? 'Número registrado e pronto para envio de mensagens.'
                          : 'Número ainda não registrado para envio.'
                      }
                      icon={integration.phoneNumberRegistered ? LuCircleCheck : LuClock3}
                      isOk={integration.phoneNumberRegistered}
                      title="Número de telefone"
                    />
                  </SimpleGrid>
                </Stack>
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Identificadores técnicos */}
          <Card.Root>
            <Card.Body>
              <Stack gap={4}>
                <SectionHeader
                  description="IDs utilizados na comunicação com a API da Meta"
                  icon={LuFingerprint}
                  title="Identificadores técnicos"
                />
                <SimpleGrid
                  columns={{ base: 1, md: 3 }}
                  gap={3}
                >
                  <InfoCard
                    icon={LuHash}
                    label="Phone Number ID"
                    mono
                    value={integration.phoneNumberId}
                  />
                  <InfoCard
                    icon={LuHash}
                    label="WABA ID"
                    mono
                    value={integration.wabaId}
                  />
                  <InfoCard
                    icon={LuHash}
                    label="Business ID"
                    mono
                    value={integration.businessId}
                  />
                </SimpleGrid>
              </Stack>
            </Card.Body>
          </Card.Root>

          {/* Métricas e qualidade */}
          <Card.Root>
            <Card.Body>
              <Stack gap={4}>
                <SectionHeader
                  description="Qualidade do número e limites de envio na plataforma Meta"
                  icon={LuChartBar}
                  title="Métricas e qualidade"
                />
                <SimpleGrid
                  columns={{ base: 1, md: 2, xl: 4 }}
                  gap={3}
                >
                  <Card.Root>
                    <Card.Body>
                      <Stack gap={2}>
                        <HStack gap={1.5}>
                          <Icon
                            as={LuSparkles}
                            boxSize={3}
                            color="fg.subtle"
                          />
                          <Text
                            color="fg.subtle"
                            fontSize="2xs"
                            fontWeight="semibold"
                            letterSpacing="wider"
                            textTransform="uppercase"
                          >
                            Qualidade
                          </Text>
                        </HStack>
                        <Badge
                          colorPalette={getQualityColor(integration.qualityRating)}
                          size="sm"
                          variant="subtle"
                          w="fit-content"
                        >
                          {formatValue(integration.qualityRating)}
                        </Badge>
                      </Stack>
                    </Card.Body>
                  </Card.Root>
                  <InfoCard
                    icon={LuZap}
                    label="Limite de mensagens"
                    value={integration.messagingLimitTier}
                  />
                  <InfoCard
                    icon={LuCalendar}
                    label="Criado em"
                    value={formatDateTime(integration.createdAt)}
                  />
                  <InfoCard
                    icon={LuCalendar}
                    label="Atualizado em"
                    value={formatDateTime(integration.updatedAt)}
                  />
                </SimpleGrid>
              </Stack>
            </Card.Body>
          </Card.Root>
        </Stack>
      ) : isStartingIntegration ? (
        <Card.Root>
          <Card.Body>
            <Stack gap={4}>
              <HStack
                align="start"
                justify="space-between"
                gap={4}
              >
                <Stack gap={1}>
                  <Text
                    fontSize="lg"
                    fontWeight="semibold"
                  >
                    Iniciar integração oficial
                  </Text>
                  <Text
                    color="fg.muted"
                    fontSize="sm"
                  >
                    A Meta pergunta se o número é novo ou se já está no
                    WhatsApp Business. Os dois caminhos seguem neste cadastro.
                  </Text>
                </Stack>
                <Button
                  onClick={handleCancelStart}
                  size="sm"
                  variant="outline"
                >
                  Cancelar
                </Button>
              </HStack>

              {!metaAppId && (
                <Text color="orange.fg" fontSize="sm">
                  Configure VITE_META_APP_ID no ambiente para habilitar o botão
                  da Meta.
                </Text>
              )}

              {!metaConfigId && (
                <Text color="orange.fg" fontSize="sm">
                  Configure VITE_META_CONFIG_ID no ambiente para habilitar o
                  botão da Meta.
                </Text>
              )}

              {metaSdkError && (
                <Text color="red.fg" fontSize="sm">
                  {metaSdkError}
                </Text>
              )}

              {connectError && (
                <Text color="red.fg" fontSize="sm">
                  {connectError}
                </Text>
              )}

              <Button
                alignSelf="flex-start"
                disabled={!metaAppId || !metaConfigId || !isMetaSdkReady}
                loading={
                  isConnecting || (!!metaAppId && !isMetaSdkReady && !metaSdkError)
                }
                loadingText={isConnecting ? 'Conectando...' : 'Carregando Meta...'}
                onClick={handleOpenMetaDialog}
              >
                <TbBrandMeta />
                Continuar com a Meta
              </Button>
            </Stack>
          </Card.Body>
        </Card.Root>
      ) : (
        <Card.Root>
          <Card.Body py={16}>
            <VStack
              gap={5}
              maxW="420px"
              mx="auto"
              textAlign="center"
            >
              <Box
                alignItems="center"
                bg="bg.subtle"
                borderRadius="2xl"
                borderWidth="1px"
                display="flex"
                h={20}
                justifyContent="center"
                w={20}
              >
                <Icon
                  as={TbBrandMeta}
                  boxSize={10}
                  color="blue.500"
                  opacity={0.7}
                />
              </Box>
              <Stack gap={2}>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                >
                  Nenhuma integração configurada
                </Text>
                <Text
                  color="fg.muted"
                  fontSize="sm"
                  lineHeight="tall"
                >
                  Conecte a API Oficial do WhatsApp Business para enviar
                  mensagens em escala, usar templates aprovados e acompanhar
                  métricas de qualidade.
                </Text>
              </Stack>
              <Button
                onClick={handleStartIntegration}
                size="lg"
              >
                <TbBrandMeta />
                Iniciar integração
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      )}
    </AppContentLayout>
  )
}
