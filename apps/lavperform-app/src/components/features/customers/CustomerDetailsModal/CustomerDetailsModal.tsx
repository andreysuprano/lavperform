import {
  Avatar,
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  Icon,
  Portal,
  Tabs,
  Text,
  useTabs,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import {
  RiBarChartLine,
  RiCalendarLine,
  RiChat3Line,
  RiHomeLine,
  RiIdCardLine,
  RiMailLine,
  RiPhoneLine,
  RiSaveLine,
  RiShoppingBagLine,
  RiTimeLine,
  RiUserLine,
  RiUserSettingsLine,
  RiWhatsappLine,
} from 'react-icons/ri'

import { getInitials, formatClientSince } from '@/utils/strings'
import { formatTelefone } from '@/utils/mask'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { formatCurrency } from '@/utils/money'
import { useCustomerSummary } from '@/context/CustomerSummaryContext'

import { BehaviorTab } from './components/BehaviorTab'
import { CommunicationTab } from './components/CommunicationTab'
import { ConfigurationsTab } from './components/ConfigurationsTab'
import { HistoryTab } from './components/HistoryTab'
import { SegmentsTab } from './components/SegmentsTab'
import type { Props } from './CustomerDetailsModal.types'

const GENDER_MAP: Record<string, string> = {
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
  masculino: 'Masculino',
  feminino: 'Feminino',
}

const DAY_MAP: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
  '0': 'Domingo',
  '1': 'Segunda-feira',
  '2': 'Terça-feira',
  '3': 'Quarta-feira',
  '4': 'Quinta-feira',
  '5': 'Sexta-feira',
  '6': 'Sábado',
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatBestTime(day?: string | null, hour?: string | null): string {
  const parts: string[] = []
  if (day) {
    const mapped = DAY_MAP[day.toLowerCase()] ?? day
    parts.push(mapped)
  }
  if (hour !== null && hour !== undefined && hour !== '') {
    const h = Number(hour)
    if (!isNaN(h)) {
      parts.push(`${h}h`)
    } else {
      parts.push(String(hour))
    }
  }
  return parts.join(', ')
}

type InfoItemProps = {
  icon: React.ElementType
  label: string
  value: string
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <Flex
      alignItems="flex-start"
      gap={3}
      py={2.5}
    >
      <Box
        alignItems="center"
        bg="yellow.50"
        borderRadius="md"
        color="yellow.600"
        display="flex"
        flexShrink={0}
        h="28px"
        justifyContent="center"
        mt="2px"
        w="28px"
        _dark={{ bg: 'yellow.950', color: 'yellow.400' }}
      >
        <Icon
          as={icon}
          boxSize={3.5}
        />
      </Box>
      <Box
        flex={1}
        minW={0}
      >
        <Text
          color="fg.muted"
          fontSize="xs"
          fontWeight="medium"
          letterSpacing="wide"
          mb={0.5}
          textTransform="uppercase"
        >
          {label}
        </Text>
        <Text
          fontSize="sm"
          fontWeight="medium"
          whiteSpace="pre-line"
          wordBreak="break-word"
        >
          {value}
        </Text>
      </Box>
    </Flex>
  )
}

export function CustomerDetailsModal({ data, isOpen, onClose }: Props) {
  const tabs = useTabs({
    defaultValue: 'behavior',
  })

  const { customersSummary } = useCustomerSummary()

  const clientSince = useMemo(() => {
    const baseDate = data?.firstOrderDate ?? data?.createdAt
    return formatClientSince(baseDate)
  }, [data?.firstOrderDate, data?.createdAt])

  const initials = useMemo(() => {
    return data?.name ? getInitials(data.name) : '??'
  }, [data?.name])

  const formattedPhone = useMemo(() => {
    return data?.phone ? formatTelefone(data.phone) : ''
  }, [data?.phone])

  const formattedBirthDate = useMemo(() => {
    if (!data?.birthDate) return ''
    return convertISOToDate(data.birthDate, { timeZone: 'UTC' })
  }, [data?.birthDate])

  const whatsappStatus = useMemo(() => {
    if (!data?.whatsappOptin) return { isValid: false, label: 'Inativo' }
    const phoneDigits = data.phone?.replace(/\D/g, '') || ''
    const hasValidPhone = phoneDigits.length >= 10
    return { isValid: hasValidPhone, label: hasValidPhone ? 'Ativo' : 'Inativo' }
  }, [data?.whatsappOptin, data?.phone])

  const rfvSummaryItem = useMemo(() => {
    if (!data?.rfvClassification) return null
    return (
      customersSummary.find((item) => item.segmentation === data.rfvClassification) ?? null
    )
  }, [data?.rfvClassification, customersSummary])

  const formattedAddress = useMemo(() => {
    const addr = data?.address
    if (!addr || typeof addr !== 'object') return ''
    const parts: string[] = []
    if (addr.street) parts.push(addr.street + (addr.number ? `, ${addr.number}` : ''))
    if (addr.complement) parts.push(addr.complement)
    const cityLine: string[] = []
    if (addr.neighborhood) cityLine.push(addr.neighborhood)
    if (addr.city) cityLine.push(addr.city)
    if (addr.state) cityLine.push(addr.state)
    if (cityLine.length > 0) parts.push(cityLine.join(' - '))
    if (addr.zipCode) parts.push(`CEP: ${addr.zipCode}`)
    return parts.join('\n')
  }, [data?.address])

  const genderLabel = useMemo(() => {
    if (!data?.gender) return ''
    return GENDER_MAP[data.gender.toLowerCase()] ?? data.gender
  }, [data?.gender])

  const bestTime = useMemo(() => {
    return formatBestTime(data?.bestOrderDay, data?.bestOrderHour)
  }, [data?.bestOrderDay, data?.bestOrderHour])

  const averageTicketFormatted = useMemo(() => {
    const val = Number(data?.averageTicket)
    if (!val || val === 0) return ''
    return formatCurrency(val)
  }, [data?.averageTicket])

  const [open, setOpen] = useState(isOpen)

  useEffect(() => {
    setOpen(isOpen)
  }, [isOpen])

  useEffect(() => {
    const scrollContainer = document.getElementById('app-scroll-container')
    if (open) {
      document.body.style.overflow = 'hidden'
      if (scrollContainer) scrollContainer.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      if (scrollContainer) scrollContainer.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      if (scrollContainer) scrollContainer.style.overflow = ''
    }
  }, [open])

  const handleOpenChange = (e: { open: boolean }) => {
    setOpen(e.open)
    if (!e.open) onClose()
  }

  if (!data) return null

  return (
    <Dialog.Root
      closeOnInteractOutside={false}
      onOpenChange={handleOpenChange}
      open={open}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            display="flex"
            flexDirection="column"
            maxH="90vh"
            maxW={{ base: '95vw', md: '90vw', lg: '85vw', xl: '1200px' }}
            overflow="hidden"
            position="relative"
            w="full"
          >
            {/* Botão fechar fixo no canto */}
            <Dialog.CloseTrigger asChild>
              <CloseButton
                aria-label="Fechar modal"
                position="absolute"
                right={3}
                top={3}
                variant="subtle"
                zIndex={10}
              />
            </Dialog.CloseTrigger>

            <Tabs.RootProvider
              display="flex"
              flex={1}
              flexDirection="column"
              minH={0}
              overflow="hidden"
              value={tabs}
            >
              <Flex
                flex={1}
                minH={0}
                overflow="hidden"
              >
                {/* Sidebar — perfil do cliente */}
                <Box
                  bg="bg.muted"
                  borderRightWidth="1px"
                  display={{ base: 'none', md: 'flex' }}
                  flexDirection="column"
                  flexShrink={0}
                  overflowY="auto"
                  p={5}
                  w="290px"
                >
                  {/* Avatar + nome + badges */}
                  <Flex
                    alignItems="center"
                    borderBottomWidth="1px"
                    flexDirection="column"
                    gap={2}
                    mb={3}
                    pb={4}
                    textAlign="center"
                  >
                    <Avatar.Root
                      bg="yellow.500"
                      color="white"
                      mb={1}
                      size="2xl"
                    >
                      {data.avatarUrl && (
                        <Avatar.Image
                          alt={data.name}
                          src={data.avatarUrl}
                        />
                      )}
                      <Avatar.Fallback name={data.name}>{initials}</Avatar.Fallback>
                    </Avatar.Root>

                    <Text
                      fontSize="md"
                      fontWeight="bold"
                      lineHeight="short"
                      pr={6}
                    >
                      {data.name}
                    </Text>

                    {clientSince && (
                      <Text
                        color="fg.muted"
                        fontSize="xs"
                      >
                        Cliente desde {clientSince}
                      </Text>
                    )}

                    {/* Badges RFV + status */}
                    <Flex
                      flexWrap="wrap"
                      gap={1.5}
                      justifyContent="center"
                      mt={1}
                    >
                      {rfvSummaryItem && (
                        <Badge
                          bg="bg"
                          borderWidth="1px"
                          colorPalette="gray"
                          display="inline-flex"
                          gap={1.5}
                          px={3}
                          py={1.5}
                          variant="outline"
                        >
                          <Text
                            as="span"
                            fontSize="xs"
                            fontWeight="bold"
                          >
                            {rfvSummaryItem.icon} {rfvSummaryItem.label}
                          </Text>
                        </Badge>
                      )}
                      {!rfvSummaryItem && data.rfvClassification && (
                        <Badge
                          bg="bg"
                          borderWidth="1px"
                          colorPalette="gray"
                          px={3}
                          py={1.5}
                          variant="outline"
                        >
                          <Text
                            as="span"
                            fontSize="xs"
                          >
                            {data.rfvClassification}
                          </Text>
                        </Badge>
                      )}
                      <Badge
                        borderWidth="1px"
                        colorPalette={whatsappStatus.isValid ? 'green' : 'red'}
                        fontSize="xs"
                        variant="subtle"
                      >
                        {whatsappStatus.label}
                      </Badge>
                      {data.whatsappVerified && (
                        <Badge
                          borderWidth="1px"
                          colorPalette="green"
                          fontSize="xs"
                          variant="subtle"
                        >
                          <Icon as={RiWhatsappLine} />
                          Verificado
                        </Badge>
                      )}
                      {data.origin && (
                        <Badge
                          colorPalette="blue"
                          fontSize="xs"
                          variant="subtle"
                        >
                          {data.origin}
                        </Badge>
                      )}
                    </Flex>
                  </Flex>

                  {/* Lista de informações */}
                  <Flex flexDirection="column">
                    {formattedPhone && (
                      <InfoItem
                        icon={RiPhoneLine}
                        label="Telefone"
                        value={formattedPhone}
                      />
                    )}
                    {data.email && (
                      <InfoItem
                        icon={RiMailLine}
                        label="E-mail"
                        value={data.email}
                      />
                    )}
                    {data.cpf && (
                      <InfoItem
                        icon={RiIdCardLine}
                        label="CPF"
                        value={data.cpf}
                      />
                    )}
                    {formattedBirthDate && (
                      <InfoItem
                        icon={RiCalendarLine}
                        label="Nascimento"
                        value={formattedBirthDate}
                      />
                    )}
                    {genderLabel && (
                      <InfoItem
                        icon={RiUserLine}
                        label="Gênero"
                        value={genderLabel}
                      />
                    )}
                    {data.lastOrderDate && (
                      <InfoItem
                        icon={RiShoppingBagLine}
                        label="Último pedido"
                        value={formatShortDate(data.lastOrderDate)}
                      />
                    )}
                    {bestTime && (
                      <InfoItem
                        icon={RiTimeLine}
                        label="Melhor horário"
                        value={bestTime}
                      />
                    )}
                    {averageTicketFormatted && (
                      <InfoItem
                        icon={RiShoppingBagLine}
                        label="Ticket médio"
                        value={averageTicketFormatted}
                      />
                    )}
                    {formattedAddress && (
                      <InfoItem
                        icon={RiHomeLine}
                        label="Endereço"
                        value={formattedAddress}
                      />
                    )}
                  </Flex>

                  {/* Observações */}
                  {data.observations && (
                    <Box
                      bg="yellow.50"
                      borderRadius="md"
                      mt={4}
                      p={3}
                      _dark={{ bg: 'yellow.950' }}
                    >
                      <Text
                        color="fg.muted"
                        fontSize="xs"
                        fontWeight="semibold"
                        letterSpacing="wide"
                        mb={1}
                        textTransform="uppercase"
                      >
                        Observações
                      </Text>
                      <Text fontSize="sm">{data.observations}</Text>
                    </Box>
                  )}
                </Box>

                {/* Área principal: tabs */}
                <Flex
                  flex={1}
                  flexDirection="column"
                  minW={0}
                >
                  {/* Header compacto para mobile */}
                  <Flex
                    alignItems="center"
                    bg="bg.muted"
                    borderBottomWidth="1px"
                    display={{ base: 'flex', md: 'none' }}
                    gap={3}
                    p={4}
                    pr={12}
                  >
                    <Avatar.Root
                      bg="yellow.500"
                      color="white"
                      size="md"
                    >
                      {data.avatarUrl && (
                        <Avatar.Image
                          alt={data.name}
                          src={data.avatarUrl}
                        />
                      )}
                      <Avatar.Fallback name={data.name}>{initials}</Avatar.Fallback>
                    </Avatar.Root>
                    <Box>
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                      >
                        {data.name}
                      </Text>
                      {clientSince && (
                        <Text
                          color="fg.muted"
                          fontSize="xs"
                        >
                          Cliente desde {clientSince}
                        </Text>
                      )}
                    </Box>
                  </Flex>

                  {/* Tab triggers */}
                  <Box
                    bg="bg.muted"
                    borderBottomWidth="1px"
                    flexShrink={0}
                    px={5}
                    pt={3}
                    _dark={{ bg: 'bg.muted' }}
                  >
                    <Tabs.List>
                      <Tabs.Trigger value="behavior">
                        <Icon
                          as={RiBarChartLine}
                          boxSize={3.5}
                        />
                        Comportamento
                      </Tabs.Trigger>
                      <Tabs.Trigger value="configurations">
                        <Icon
                          as={RiUserSettingsLine}
                          boxSize={3.5}
                        />
                        Dados Pessoais
                      </Tabs.Trigger>
                      <Tabs.Trigger value="communication">
                        <Icon
                          as={RiChat3Line}
                          boxSize={3.5}
                        />
                        Comunicação
                      </Tabs.Trigger>
                    </Tabs.List>
                  </Box>

                  {/* Conteúdo da tab ativa */}
                  <Box
                    flex={1}
                    minH={0}
                    overflowY="auto"
                    p={5}
                  >
                    <Tabs.Content value="behavior">
                      <BehaviorTab customer={data} />
                    </Tabs.Content>

                    <Tabs.Content value="communication">
                      <CommunicationTab customer={data} />
                    </Tabs.Content>

                    <Tabs.Content value="segments">
                      <SegmentsTab customerId={data.id} />
                    </Tabs.Content>

                    <Tabs.Content value="history">
                      <HistoryTab customerId={data.id} />
                    </Tabs.Content>

                    <Tabs.Content value="configurations">
                      <ConfigurationsTab customer={data} />
                    </Tabs.Content>
                  </Box>
                </Flex>
              </Flex>

              {/* Rodapé */}
              <Dialog.Footer
                bg="bg.muted"
                borderTopWidth="1px"
                flexShrink={0}
                py={3}
              >
                <Flex
                  gap={2}
                  justifyContent="flex-end"
                  w="100%"
                >
                  {tabs.value === 'configurations' && (
                    <Button
                      colorPalette="black"
                      form="data-form"
                      type="submit"
                    >
                      <RiSaveLine />
                      Salvar Alterações
                    </Button>
                  )}
                </Flex>
              </Dialog.Footer>
            </Tabs.RootProvider>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
