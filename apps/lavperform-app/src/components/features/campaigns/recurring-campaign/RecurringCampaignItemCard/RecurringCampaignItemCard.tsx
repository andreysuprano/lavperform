import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  HStack,
  Menu,
  Portal,
  Spinner,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import {
  LuCircleCheck,
  LuCirclePause,
  LuCircleX,
  LuCopy,
  LuEllipsis,
  LuEye,
  LuLoader,
  LuMessageSquare,
  LuPen,
  LuReceipt,
  LuSend,
  LuShoppingCart,
  LuSquareCheckBig,
  LuTrash2,
  LuUsers,
} from 'react-icons/lu'

import {
  DeleteConfirmationDialog,
  DisplaySelectedWeekday,
  toaster,
  ZoomableImage,
} from '@/components'
import {
  CHANNEL_CATALOG,
  type ChannelKey,
} from '@/components/features/channels/channelCatalog.constants'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { convertLinkToResizedImage } from '@/firebase/storage'
import {
  useDeleteCampaign,
  useDuplicateCampaign,
  useToggleCampaign,
} from '@/hooks/queries'
import { useAudiences } from '@/hooks/queries/useAudiences'
import { useCustomSendLists } from '@/hooks/queries/useCustomSendLists'
import { useMetaTemplates } from '@/hooks/queries/useMetaTemplates'
import type { RecurringCampaignStatus } from '@/types'
import { getCampaignDerivedMetrics } from '@/utils/campaigns/campaignMetrics'
import { resolveCampaignPreviewImageUrl } from '@/utils/campaigns/resolveCampaignPreviewImageUrl'
import { resolveCampaignTargetingFromApi } from '@/utils/campaigns/resolveCampaignTargetingFromApi'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { logger } from '@/utils/logger'
import { formatCurrency } from '@/utils/money'

import { campaignTypeItems } from '../constants'
import { Props } from './RecurringCampaignItemCard.types'

type StatusConfig = {
  label: string
  colorScheme: string
  icon: React.ReactNode
  dotColor: string
}

function getStatusConfig(
  status: RecurringCampaignStatus | undefined,
  active: boolean
): StatusConfig {
  if (status === 'PROCESSING') {
    return {
      label: 'Processando',
      colorScheme: 'blue',
      icon: <LuLoader size={11} />,
      dotColor: 'var(--chakra-colors-blue-400)',
    }
  }
  if (status === 'IN_PROGRESS') {
    return {
      label: 'Em andamento',
      colorScheme: 'green',
      icon: <LuCircleCheck size={11} />,
      dotColor: 'var(--chakra-colors-green-400)',
    }
  }
  if (status === 'COMPLETED') {
    return {
      label: 'Concluída',
      colorScheme: 'teal',
      icon: <LuSquareCheckBig size={11} />,
      dotColor: 'var(--chakra-colors-teal-400)',
    }
  }
  if (status === 'FAILED') {
    return {
      label: 'Falhou',
      colorScheme: 'red',
      icon: <LuCircleX size={11} />,
      dotColor: 'var(--chakra-colors-red-400)',
    }
  }
  // Fallback derivado do campo active quando status não vem da API
  if (!active) {
    return {
      label: 'Pausada',
      colorScheme: 'gray',
      icon: <LuCirclePause size={11} />,
      dotColor: 'var(--chakra-colors-gray-400)',
    }
  }
  return {
    label: 'Ativa',
    colorScheme: 'green',
    icon: <LuCircleCheck size={11} />,
    dotColor: 'var(--chakra-colors-green-400)',
  }
}

function RecurringCampaignItemCard({ data, onEdit, onViewDetails }: Props) {
  const { selectedCompany } = useAuth()
  const { colorPalette } = useWhiteLabel()

  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isDuplicateTypeOpen, setIsDuplicateTypeOpen] = useState(false)

  const activeDaysStrings = useMemo(() => {
    const days = data?.daysOfWeek
    return Array.isArray(days) ? (days as string[]) : []
  }, [data])

  const { data: metaTemplates = [] } = useMetaTemplates(selectedCompany?.id)

  const firstImageUrl = useMemo(
    () =>
      resolveCampaignPreviewImageUrl({
        creatives: data.creatives,
        images: data.images,
        metaMessageTemplateId: data.metaMessageTemplateId,
        metaTemplates,
      }),
    [
      data.creatives,
      data.images,
      data.metaMessageTemplateId,
      metaTemplates,
    ],
  )

  const channelKey = data.channel?.toLowerCase() as ChannelKey | undefined
  const channelInfo = CHANNEL_CATALOG.find((c) => c.key === channelKey)
  const ChannelIcon = channelInfo?.icon

  const toggleCampaignMutation = useToggleCampaign()
  const deleteCampaignMutation = useDeleteCampaign()
  const duplicateCampaignMutation = useDuplicateCampaign()
  const { data: audiencesResult } = useAudiences(selectedCompany?.id, {
    page: 1,
    limit: 100,
  })
  const { data: customSendListsResult } = useCustomSendLists(selectedCompany?.id, {
    page: 1,
    limit: 100,
  })

  const isToggling = toggleCampaignMutation.isPending

  const statusConfig = getStatusConfig(data.status, data.active)

  const metric = data.campaignMetric[0]
  const isLegacyType = data.type !== 'RECOGNITION' && data.type !== 'SALES'
  const showSales =
    data.type === 'SALES' && Number(metric?.salesTotalQuantity ?? 0) > 0

  const derivedMetrics = getCampaignDerivedMetrics(
    metric?.totalCost,
    metric?.salesTotalAmount,
    metric?.salesTotalQuantity
  )

  const segmentationBadges = useMemo(() => {
    const targeting = resolveCampaignTargetingFromApi(data)

    if (targeting.targetingMode === 'AUDIENCE') {
      const audienceName = audiencesResult?.data?.find(
        (audience) => audience.id === targeting.audienceId,
      )?.name

      return audienceName ? [audienceName] : []
    }

    if (targeting.targetingMode === 'CUSTOMER_LIST') {
      const listName = customSendListsResult?.data?.find(
        (list) => list.id === targeting.customSendListId,
      )?.name

      return listName ? [listName] : []
    }

    return targeting.segmentation.map(
      (segItem) =>
        clientTypesOptions.items.find((item) => item.value === segItem)?.label ??
        segItem,
    )
  }, [audiencesResult?.data, customSendListsResult?.data, data])

  const campaignTitle = campaignTypeItems.find(
    (item) => item.value === data.type
  )?.title

  const toggleCampaign = async () => {
    if (!selectedCompany?.id || isToggling) return
    try {
      await toggleCampaignMutation.mutateAsync({
        companyId: selectedCompany.id,
        campaignId: data.id,
      })
    } catch {
      alert('Erro ao alterar status da campanha.')
    }
  }

  const deleteCampaign = async () => {
    if (!selectedCompany?.id) return
    try {
      await deleteCampaignMutation.mutateAsync({
        companyId: selectedCompany.id,
        campaignId: data.id,
      })
    } catch {
      alert('Erro ao deletar campanha.')
    }
  }

  const duplicateCampaign = async (
    targetType?: 'RECOGNITION' | 'SALES'
  ) => {
    if (!selectedCompany?.id) return
    if (isDuplicating) return

    setIsDuplicating(true)
    setIsDuplicateTypeOpen(false)

    try {
      const duplicated = await duplicateCampaignMutation.mutateAsync({
        companyId: selectedCompany.id,
        campaignId: data.id,
        targetType,
      })

      logger.info('Campanha automática duplicada', {
        sourceCampaignId: data.id,
        duplicatedCampaignId: (duplicated as { id?: string } | undefined)?.id,
      })

      toaster.create({
        title: 'Campanha duplicada',
        description: 'A campanha foi duplicada com sucesso.',
        type: 'success',
        closable: true,
        duration: 3000,
      })
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } }
        message?: string
      }
      const apiMessage = err?.response?.data?.message
      const errorMessage =
        (Array.isArray(apiMessage) ? apiMessage.join(' ') : apiMessage) ||
        err?.message ||
        'Não foi possível duplicar a campanha.'

      toaster.dismiss()

      toaster.create({
        title: 'Erro ao duplicar campanha',
        description: errorMessage,
        type: 'error',
        closable: true,
        duration: 6000,
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <>
    <Box position="relative">
    <Card.Root
      borderWidth="1px"
      opacity={isToggling ? 0.65 : 1}
      overflow="hidden"
      pointerEvents={isToggling ? 'none' : 'auto'}
      size="sm"
      transition="box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease"
      _hover={{
        boxShadow: isToggling ? undefined : 'md',
        transform: isToggling ? undefined : 'translateY(-1px)',
      }}
    >
      <Card.Header
        alignItems="flex-start"
        gap={2}
        pb={2}
        pt={3}
        px={4}
      >
        {/* Top row: status + actions */}
        <HStack
          justifyContent="space-between"
          w="full"
        >
          <Badge
            alignItems="center"
            colorPalette={statusConfig.colorScheme}
            display="flex"
            fontSize="xs"
            fontWeight="semibold"
            gap={1}
            px={2}
            py={0.5}
            rounded="full"
            variant="subtle"
          >
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>

          <HStack gap={1.5}>
            <HStack gap={1.5}>
              <Text
                color="fg.muted"
                fontSize="xs"
                fontWeight="medium"
              >
                {isToggling ? 'Atualizando...' : data.active ? 'Pausar' : 'Ativar'}
              </Text>
              {isToggling ? (
                <Spinner
                  colorPalette="green"
                  size="sm"
                />
              ) : (
                <Switch.Root
                  checked={data.active}
                  colorPalette="green"
                  m={0}
                  onClick={toggleCampaign}
                  p={0}
                  size="sm"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              )}
            </HStack>

            <Menu.Root
              closeOnSelect={false}
              positioning={{ placement: 'bottom-end' }}
            >
              <Menu.Trigger asChild>
                <Button
                  size="xs"
                  variant="ghost"
                >
                  <LuEllipsis />
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item
                      onClick={onViewDetails}
                      value="view"
                    >
                      <LuEye />
                      <Box flex="1">Ver detalhes</Box>
                    </Menu.Item>
                    <Menu.Item
                      onClick={onEdit}
                      value="edit"
                    >
                      <LuPen />
                      <Box flex="1">Editar</Box>
                    </Menu.Item>
                    <Menu.Item
                      disabled={isDuplicating}
                      onClick={() => {
                        if (isLegacyType) {
                          setIsDuplicateTypeOpen(true)
                          return
                        }
                        void duplicateCampaign()
                      }}
                      value="duplicate"
                    >
                      <LuCopy />
                      <Box flex="1">Duplicar</Box>
                    </Menu.Item>
                    <DeleteConfirmationDialog
                      isLoading={deleteCampaignMutation.isPending}
                      onClick={deleteCampaign}
                      title="Deseja excluir a campanha?"
                      trigger={
                        <Menu.Item
                          _hover={{ bg: 'bg.error', color: 'fg.error' }}
                          color="fg.error"
                          value="delete"
                        >
                          <LuTrash2 />
                          <Box flex="1">Deletar</Box>
                        </Menu.Item>
                      }
                    />
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </HStack>
        </HStack>

        {/* Campaign title + channel */}
        <VStack
          align="flex-start"
          gap={1}
        >
          <Text
            fontSize="md"
            fontWeight="bold"
            lineClamp={1}
            opacity={data.active ? 1 : 0.55}
          >
            {campaignTitle}
          </Text>
          {channelInfo && ChannelIcon && (
            <Badge
              alignItems="center"
              display="flex"
              fontSize="xs"
              fontWeight="semibold"
              gap={1.5}
              px={2}
              py={0.5}
              size="sm"
              variant="subtle"
            >
              <ChannelIcon size={12} />
              {channelInfo.name}
            </Badge>
          )}
        </VStack>
      </Card.Header>

      <Card.Body
        gap={3}
        opacity={data.active ? 1 : 0.6}
        px={4}
        py={2}
      >
        {/* Image + campaign name/message */}
        <HStack
          align="flex-start"
          gap={3}
        >
          {firstImageUrl ? (
            <Box
              borderRadius="lg"
              flexShrink={0}
              overflow="hidden"
            >
              <ZoomableImage
                alt=""
                minBoxSize="72px"
                src={convertLinkToResizedImage(firstImageUrl)}
              />
            </Box>
          ) : (
            <Flex
              align="center"
              bg="bg.muted"
              borderRadius="lg"
              color="fg.subtle"
              flexShrink={0}
              h="72px"
              justify="center"
              w="72px"
            >
              <LuMessageSquare size={20} />
            </Flex>
          )}

          <VStack
            align="flex-start"
            flex={1}
            gap={1}
            minW={0}
          >
            <Text
              fontSize="sm"
              fontWeight="semibold"
              lineClamp={1}
            >
              {data.name}
            </Text>
            <Text
              color="fg.muted"
              fontSize="xs"
              lineClamp={2}
              lineHeight="1.5"
            >
              {data.messageText || 'Sem mensagem configurada'}
            </Text>
          </VStack>
        </HStack>

        {/* Segmentation badges */}
        {segmentationBadges.length > 0 && (
          <HStack
            flexWrap="wrap"
            gap={1}
          >
            {segmentationBadges.map((segItem) => (
              <Badge
                borderRadius="full"
                fontSize="2xs"
                key={segItem}
                px={2.5}
                py={0.5}
                variant="solid"
              >
                {segItem}
              </Badge>
            ))}
          </HStack>
        )}

        {/* Stats row */}
        <Box
          bg="bg.muted"
          borderRadius="xl"
          overflow="hidden"
          px={1}
          py={2}
        >
          <HStack
            gap={0}
            justifyContent="space-around"
          >
            {showSales && (
              <>
                <StatCell
                  icon={<LuShoppingCart size={12} />}
                  label="Vendas"
                  value={metric.salesTotalQuantity}
                />
                <StatDivider />
              </>
            )}
            <StatCell
              icon={<LuUsers size={12} />}
              label="Clientes"
              value={metric.totalCustomers || 0}
            />
            <StatDivider />
            <StatCell
              icon={<LuSend size={12} />}
              label="Enviados"
              value={metric.messagesSent || 0}
            />
            <StatDivider />
            <StatCell
              icon={<LuReceipt size={12} />}
              label="Custo/venda"
              value={derivedMetrics.costPerSaleLabel}
            />
          </HStack>
        </Box>

        {/* Revenue highlight */}
        {(metric.salesTotalAmount ?? 0) > 0 && (
          <HStack
            bg="green.subtle"
            borderColor="green.muted"
            borderRadius="lg"
            borderWidth="1px"
            gap={2}
            px={3}
            py={2}
          >
            <Box
              color="green.fg"
              fontSize="sm"
            >
              💰
            </Box>
            <Text
              color="green.fg"
              fontSize="xs"
              fontWeight="medium"
            >
              Receita Incentivada:
            </Text>
            <Text
              color="green.fg"
              fontSize="sm"
              fontWeight="bold"
              ml="auto"
            >
              {formatCurrency(metric.salesTotalAmount)}
            </Text>
          </HStack>
        )}
      </Card.Body>

      <Card.Footer
        flexDirection="column"
        gap={2}
        opacity={data.active ? 1 : 0.6}
        px={4}
        py={3}
      >
        {/* Days of week */}
        <DisplaySelectedWeekday
          displayItems={activeDaysStrings}
          isCompact={true}
        />

        {/* Date range */}
        {data.startDate && (
          <HStack gap={1}>
            <Text
              color="fg.subtle"
              fontSize="xs"
              fontWeight="medium"
            >
              Período:
            </Text>
            <Text
              color="fg.muted"
              fontSize="xs"
            >
              {convertISOToDate(data.startDate, { timeZone: 'UTC' })}
              {' → '}
              {data.endDate?.trim()
                ? convertISOToDate(data.endDate, { timeZone: 'UTC' })
                : 'Sem data fim'}
            </Text>
          </HStack>
        )}
      </Card.Footer>
    </Card.Root>

    {isToggling && (
      <Flex
        align="center"
        bg="blackAlpha.50"
        borderRadius="inherit"
        inset={0}
        justify="center"
        pointerEvents="none"
        position="absolute"
        zIndex={1}
      >
        <Spinner
          borderWidth="3px"
          colorPalette={colorPalette}
          size="lg"
        />
      </Flex>
    )}
    </Box>

    <Dialog.Root
      onOpenChange={({ open }) => setIsDuplicateTypeOpen(open)}
      open={isDuplicateTypeOpen}
      placement="center"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <Dialog.Title>Escolha o tipo da nova campanha</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted" fontSize="sm">
                Campanhas antigas precisam ser convertidas para Reconhecimento
                ou Venda ao serem duplicadas.
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                onClick={() => setIsDuplicateTypeOpen(false)}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button onClick={() => void duplicateCampaign('RECOGNITION')}>
                Reconhecimento
              </Button>
              <Button onClick={() => void duplicateCampaign('SALES')}>
                Venda
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>

    <Dialog.Root
      closeOnEscape={false}
      closeOnInteractOutside={false}
      open={isDuplicating}
      placement="center"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="sm">
            <Dialog.Body py={10}>
              <VStack gap={4}>
                <Spinner
                  borderWidth="3px"
                  colorPalette={colorPalette}
                  size="xl"
                />
                <Text
                  fontSize="md"
                  fontWeight="medium"
                >
                  Duplicando campanha...
                </Text>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
    </>
  )
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <VStack
      flex={1}
      gap={0.5}
      px={1}
      textAlign="center"
    >
      <HStack
        color="fg.muted"
        gap={0.5}
        justify="center"
      >
        {icon}
      </HStack>
      <Text
        color="fg.subtle"
        fontSize="2xs"
        fontWeight="medium"
        lineClamp={1}
      >
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="bold"
        lineHeight="1.2"
      >
        {value}
      </Text>
    </VStack>
  )
}

function StatDivider() {
  return (
    <Box
      bg="border.muted"
      flexShrink={0}
      h="28px"
      w="1px"
    />
  )
}

export {
  RecurringCampaignItemCard,
  type Props as RecurringCampaignItemCardProps,
}
