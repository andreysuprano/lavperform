import {
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Link,
  Separator,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, type ReactNode } from 'react'
import {
  LuCalendarDays,
  LuCircleDollarSign,
  LuClock,
  LuGift,
  LuImage,
  LuLayoutGrid,
  LuLink,
  LuMapPin,
  LuMegaphone,
  LuPercent,
  LuSend,
  LuSparkles,
  LuTarget,
} from 'react-icons/lu'

import { DisplaySelectedWeekday, LazyImage } from '@/components'
import { useWhiteLabel } from '@/config'
import {
  CHANNEL_CATALOG,
  type ChannelKey,
} from '@/components/features/channels/channelCatalog.constants'
import { convertLinkToResizedImage } from '@/firebase/storage'
import type { RecurringCampaign } from '@/types'
import { clientTypesOptions } from '@/utils/constants/clientType'
import { convertISOToDate } from '@/utils/convertISOToDate'
import { formatCurrency } from '@/utils/money'

import { discountTypeItems, incitationItems } from '../constants'
import { formatSendScheduleLabel } from '../sendSchedule.utils'

interface Props {
  campaign: RecurringCampaign
  hasDelivery: boolean
  activeDaysStrings: string[]
}

interface SectionHeaderProps {
  eyebrow: string
  title: string
  description?: string
}

function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  const { colorPalette } = useWhiteLabel()

  return (
    <Stack gap={1}>
      <Text
        color={`${colorPalette}.fg`}
        fontSize="2xs"
        fontWeight="bold"
        letterSpacing="0.15em"
        textTransform="uppercase"
      >
        {eyebrow}
      </Text>
      <Heading
        fontSize={{ base: 'md', md: 'lg' }}
        fontWeight="semibold"
        letterSpacing="tight"
      >
        {title}
      </Heading>
      {description && (
        <Text
          color="fg.muted"
          fontSize="sm"
          lineHeight="1.5"
        >
          {description}
        </Text>
      )}
    </Stack>
  )
}

interface StatRowProps {
  icon: ReactNode
  label: string
  value: ReactNode
  accent?: boolean
}

function StatRow({ icon, label, value, accent = false }: StatRowProps) {
  return (
    <HStack
      align="center"
      gap={3}
      py={2.5}
    >
      <Flex
        align="center"
        bg={accent ? 'colorPalette.solid' : 'bg.muted'}
        borderRadius="md"
        color={accent ? 'colorPalette.contrast' : 'fg.muted'}
        flexShrink={0}
        h={9}
        justify="center"
        w={9}
      >
        {icon}
      </Flex>
      <Stack
        flex={1}
        gap={0}
        minW={0}
      >
        <Text
          color="fg.muted"
          fontSize="2xs"
          fontWeight="semibold"
          letterSpacing="wider"
          textTransform="uppercase"
        >
          {label}
        </Text>
        <Box
          color="fg"
          fontSize="sm"
          fontWeight="semibold"
        >
          {value}
        </Box>
      </Stack>
    </HStack>
  )
}

function CampaignDetailsTabComponent({
  campaign,
  hasDelivery,
  activeDaysStrings,
}: Props) {
  const { colorPalette } = useWhiteLabel()

  const segmentationItems = campaign.segmentation
    ? campaign.segmentation
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const imageList = campaign.images
    ? campaign.images.split(', ').filter(Boolean)
    : []

  const channelKey = campaign.channel?.toLowerCase() as ChannelKey | undefined
  const channelInfo = CHANNEL_CATALOG.find((c) => c.key === channelKey)
  const ChannelIcon = channelInfo?.icon

  const hasCreatives = (campaign.creatives?.length ?? 0) > 0

  const gift = campaign.gifts?.[0]
  const incitation = gift?.type
    ? incitationItems.find((item) => item.value === gift.type)
    : null
  const discountType = gift?.unit
    ? discountTypeItems.find((item) => item.value === gift.unit)
    : null
  const showIncentive =
    !!incitation?.title && !(gift?.type === 'tax' && !hasDelivery)

  const incentiveValue =
    gift?.type === 'tax'
      ? `${gift.value} KM`
      : gift?.type === 'discount' && gift.unit === 'percent'
        ? `${gift.value}%`
        : gift?.type === 'discount' && gift.unit === 'currency'
          ? formatCurrency(gift.value)
          : null

  const incentiveSubtitle =
    gift?.type === 'tax'
      ? 'Raio de entrega grátis'
      : gift?.type === 'discount'
        ? (discountType?.title ?? 'Desconto')
        : null

  return (
    <Box
      h="100%"
      maxW="7xl"
      mx="auto"
      overflowY="auto"
      p={{ base: 4, md: 6, lg: 8 }}
      w="full"
    >
      <Stack gap={{ base: 6, md: 8 }}>
        <Grid
          gap={{ base: 5, lg: 6 }}
          templateColumns={{
            base: '1fr',
            lg: 'minmax(0, 1.1fr) minmax(0, 1fr)',
          }}
        >
          <GridItem>
            <Stack gap={4}>
              <SectionHeader
                description="Texto que será disparado para os clientes selecionados."
                eyebrow="Mensagem"
                title="Comunicação da campanha"
              />
              <Box
                bg="bg.panel"
                borderColor="border.muted"
                borderRadius="xl"
                borderWidth="1px"
                overflow="hidden"
                shadow="xs"
              >
                <HStack
                  bg="bg.subtle"
                  borderBottomColor="border.muted"
                  borderBottomWidth="1px"
                  gap={2.5}
                  px={{ base: 4, md: 5 }}
                  py={3}
                >
                  <Flex
                    align="center"
                    bg={`${colorPalette}.subtle`}
                    borderRadius="md"
                    color={`${colorPalette}.fg`}
                    h={8}
                    justify="center"
                    w={8}
                  >
                    <LuMegaphone size={16} />
                  </Flex>
                  <Stack gap={0}>
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                    >
                      Texto da mensagem
                    </Text>
                    <Text
                      color="fg.muted"
                      fontSize="xs"
                    >
                      {campaign.messageText
                        ? `${campaign.messageText.length} caracteres`
                        : 'Sem texto'}
                    </Text>
                  </Stack>
                </HStack>
                <Box
                  borderLeftColor={`${colorPalette}.solid`}
                  borderLeftWidth="3px"
                  m={{ base: 4, md: 5 }}
                  pl={4}
                >
                  {campaign.messageText ? (
                    <Text
                      color="fg"
                      fontSize="sm"
                      lineHeight="1.65"
                      whiteSpace="pre-wrap"
                      wordBreak="break-word"
                    >
                      {campaign.messageText}
                    </Text>
                  ) : (
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                      fontStyle="italic"
                    >
                      Nenhuma mensagem configurada
                    </Text>
                  )}
                </Box>
              </Box>
            </Stack>
          </GridItem>

          <GridItem>
            <Stack
              gap={5}
              h="full"
            >
              <SectionHeader
                description="Informações operacionais do disparo recorrente."
                eyebrow="Configuração"
                title="Dados da campanha"
              />
              <Box
                bg="bg.panel"
                borderColor="border.muted"
                borderRadius="xl"
                borderWidth="1px"
                p={{ base: 4, md: 5 }}
                shadow="xs"
              >
                <StatRow
                  accent
                  icon={<LuCalendarDays size={16} />}
                  label="Período"
                  value={
                    <HStack
                      flexWrap="wrap"
                      gap={1.5}
                    >
                      <Text
                        as="span"
                        fontSize="sm"
                        fontWeight="semibold"
                      >
                        {convertISOToDate(campaign.startDate, {
                          timeZone: 'UTC',
                        })}
                      </Text>
                      <Text
                        as="span"
                        color="fg.muted"
                      >
                        →
                      </Text>
                      <Text
                        as="span"
                        fontSize="sm"
                        fontWeight="semibold"
                      >
                        {convertISOToDate(campaign.endDate, {
                          timeZone: 'UTC',
                        })}
                      </Text>
                    </HStack>
                  }
                />
                <Separator />
                {campaign.maxDailySends != null && (
                  <>
                    <StatRow
                      icon={<LuSend size={16} />}
                      label="Limite diário"
                      value={
                        <HStack
                          align="baseline"
                          gap={1}
                        >
                          <Text
                            as="span"
                            fontSize="xl"
                            fontWeight="bold"
                          >
                            {campaign.maxDailySends}
                          </Text>
                          <Text
                            as="span"
                            color="fg.muted"
                            fontSize="xs"
                          >
                            envios / dia
                          </Text>
                        </HStack>
                      }
                    />
                    <Separator />
                  </>
                )}
                <StatRow
                  icon={<LuClock size={16} />}
                  label="Horário de envio"
                  value={
                    <Text
                      as="span"
                      fontSize="sm"
                      fontWeight="semibold"
                    >
                      {formatSendScheduleLabel(
                        campaign.sendTimeStart,
                        campaign.sendTimeEnd,
                      )}
                    </Text>
                  }
                />
                <Separator />
                {channelInfo && ChannelIcon && (
                  <>
                    <StatRow
                      icon={<ChannelIcon size={16} />}
                      label="Canal de comunicação"
                      value={
                        <HStack gap={2}>
                          <Text
                            as="span"
                            fontSize="sm"
                            fontWeight="semibold"
                          >
                            {channelInfo.name}
                          </Text>
                          {channelInfo.badgeLabel && (
                            <Badge
                              colorPalette={
                                channelInfo.badgeColorPalette ?? 'gray'
                              }
                              fontSize="2xs"
                              variant="subtle"
                            >
                              {channelInfo.badgeLabel}
                            </Badge>
                          )}
                        </HStack>
                      }
                    />
                  </>
                )}
                <Separator />
                <StatRow
                  icon={<LuTarget size={16} />}
                  label="Público selecionado"
                  value={
                    segmentationItems.length > 0 ? (
                      <Flex
                        gap={1.5}
                        mt={1}
                        wrap="wrap"
                      >
                        {segmentationItems.map((segmentationItem) => (
                          <Badge
                            fontSize="2xs"
                            fontWeight="semibold"
                            key={segmentationItem}
                            px={2.5}
                            py={0.5}
                            rounded="full"
                            variant="subtle"
                          >
                            {clientTypesOptions.items.find(
                              (item) => item.value === segmentationItem
                            )?.label ?? segmentationItem}
                          </Badge>
                        ))}
                      </Flex>
                    ) : (
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                      >
                        Nenhum segmento definido
                      </Text>
                    )
                  }
                />
              </Box>

              {showIncentive && (
                <Box
                  bg={`${colorPalette}.subtle`}
                  borderColor={`${colorPalette}.muted`}
                  borderRadius="xl"
                  borderWidth="1px"
                  overflow="hidden"
                  position="relative"
                >
                  <Box
                    bg={`${colorPalette}.solid`}
                    h={1}
                    w="full"
                  />
                  <HStack
                    align="flex-start"
                    gap={4}
                    p={{ base: 4, md: 5 }}
                  >
                    <Flex
                      align="center"
                      bg={`${colorPalette}.solid`}
                      borderRadius="lg"
                      color={`${colorPalette}.contrast`}
                      flexShrink={0}
                      h={12}
                      justify="center"
                      w={12}
                    >
                      {gift?.type === 'tax' ? (
                        <LuMapPin size={22} />
                      ) : gift?.unit === 'percent' ? (
                        <LuPercent size={22} />
                      ) : gift?.unit === 'currency' ? (
                        <LuCircleDollarSign size={22} />
                      ) : (
                        <LuGift size={22} />
                      )}
                    </Flex>
                    <Stack
                      flex={1}
                      gap={1}
                      minW={0}
                    >
                      <HStack
                        color={`${colorPalette}.fg`}
                        fontSize="2xs"
                        fontWeight="bold"
                        gap={1.5}
                        letterSpacing="wider"
                        textTransform="uppercase"
                      >
                        <LuSparkles size={12} />
                        <Text as="span">Incentivo</Text>
                      </HStack>
                      <Heading
                        fontSize="md"
                        fontWeight="semibold"
                      >
                        {incitation?.title}
                      </Heading>
                      {incentiveSubtitle && (
                        <Text
                          color="fg.muted"
                          fontSize="xs"
                        >
                          {incentiveSubtitle}
                        </Text>
                      )}
                    </Stack>
                    {incentiveValue && (
                      <Flex
                        align="center"
                        bg="bg.panel"
                        borderColor="border.muted"
                        borderRadius="lg"
                        borderWidth="1px"
                        flexShrink={0}
                        fontSize="lg"
                        fontWeight="bold"
                        px={3}
                        py={2}
                      >
                        {incentiveValue}
                      </Flex>
                    )}
                  </HStack>
                </Box>
              )}
            </Stack>
          </GridItem>
        </Grid>

        {hasCreatives && (
          <Box
            bg="bg.panel"
            borderColor="border.muted"
            borderRadius="xl"
            borderWidth="1px"
            p={{ base: 4, md: 6 }}
            shadow="xs"
          >
            <HStack
              align="center"
              gap={3}
              mb={5}
            >
              <Flex
                align="center"
                bg={`${colorPalette}.subtle`}
                borderRadius="lg"
                color={`${colorPalette}.fg`}
                h={9}
                justify="center"
                w={9}
              >
                <LuLayoutGrid size={18} />
              </Flex>
              <Stack gap={0}>
                <Heading
                  fontSize="sm"
                  fontWeight="semibold"
                  letterSpacing="tight"
                >
                  Criativos da campanha
                </Heading>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  {campaign.creatives!.length}{' '}
                  {campaign.creatives!.length === 1
                    ? 'criativo configurado'
                    : 'criativos configurados'}
                </Text>
              </Stack>
            </HStack>
            <SimpleGrid
              columns={{ base: 1, sm: 2, md: 3, xl: 4 }}
              gap={4}
            >
              {campaign.creatives!.map((creative, index) => {
                const previewImages = (creative.imageUrls ?? []).filter(
                  (u): u is string => typeof u === 'string' && u.trim().length > 0
                )
                const hasText =
                  creative.title || creative.message || creative.link
                return (
                  <Box
                    bg="bg.subtle"
                    borderColor="border.muted"
                    borderRadius="xl"
                    borderWidth="1px"
                    key={creative.id ?? index}
                    overflow="hidden"
                    transition="transform 180ms ease, box-shadow 180ms ease"
                    _hover={{
                      transform: 'translateY(-2px)',
                      shadow: 'md',
                    }}
                  >
                    {previewImages.length > 0 ? (
                      previewImages.length === 1 ? (
                        <Box
                          aspectRatio={4 / 3}
                          overflow="hidden"
                        >
                          <LazyImage
                            alt={creative.title ?? `Criativo ${index + 1}`}
                            fit="cover"
                            h="100%"
                            src={convertLinkToResizedImage(previewImages[0])}
                            w="100%"
                          />
                        </Box>
                      ) : (
                        <SimpleGrid
                          columns={2}
                          gap={0.5}
                        >
                          {previewImages.slice(0, 4).map((url, imgIdx) => (
                            <Box
                              aspectRatio={1}
                              key={imgIdx}
                              overflow="hidden"
                            >
                              <LazyImage
                                alt={`Imagem ${imgIdx + 1}`}
                                fit="cover"
                                h="100%"
                                src={convertLinkToResizedImage(url)}
                                w="100%"
                              />
                            </Box>
                          ))}
                        </SimpleGrid>
                      )
                    ) : (
                      <Flex
                        align="center"
                        aspectRatio={4 / 3}
                        bg="bg.muted"
                        color="fg.subtle"
                        fontSize="xs"
                        justify="center"
                      >
                        <Stack
                          align="center"
                          gap={1}
                        >
                          <LuImage size={20} />
                          <Text>Sem imagem</Text>
                        </Stack>
                      </Flex>
                    )}

                    {hasText && (
                      <Stack
                        gap={1.5}
                        p={3}
                      >
                        {creative.title && (
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            lineClamp={1}
                          >
                            {creative.title}
                          </Text>
                        )}
                        {creative.message && (
                          <Text
                            color="fg.muted"
                            fontSize="xs"
                            lineClamp={3}
                          >
                            {creative.message}
                          </Text>
                        )}
                        {creative.link && (
                          <HStack gap={1}>
                            <LuLink
                              color="var(--chakra-colors-fg-info)"
                              size={12}
                            />
                            <Link
                              color="fg.info"
                              fontSize="xs"
                              href={creative.link}
                              lineClamp={1}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {creative.link}
                            </Link>
                          </HStack>
                        )}
                      </Stack>
                    )}
                  </Box>
                )
              })}
            </SimpleGrid>
          </Box>
        )}

        {!hasCreatives && imageList.length > 0 && (
          <Box
            bg="bg.panel"
            borderColor="border.muted"
            borderRadius="xl"
            borderWidth="1px"
            p={{ base: 4, md: 6 }}
            shadow="xs"
          >
            <HStack
              align="center"
              gap={3}
              mb={4}
            >
              <Flex
                align="center"
                bg={`${colorPalette}.subtle`}
                borderRadius="lg"
                color={`${colorPalette}.fg`}
                h={9}
                justify="center"
                w={9}
              >
                <LuImage size={18} />
              </Flex>
              <Stack gap={0}>
                <Heading
                  fontSize="sm"
                  fontWeight="semibold"
                  letterSpacing="tight"
                >
                  Imagens da campanha
                </Heading>
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  {imageList.length}{' '}
                  {imageList.length === 1
                    ? 'imagem anexada'
                    : 'imagens anexadas'}
                </Text>
              </Stack>
            </HStack>
            <SimpleGrid
              columns={{ base: 1, sm: 2, md: 3, xl: 4 }}
              gap={4}
            >
              {imageList.map((item, index) => (
                <Box
                  aspectRatio={4 / 3}
                  bg="bg.subtle"
                  borderColor="border.muted"
                  borderRadius="lg"
                  borderWidth="1px"
                  key={index}
                  overflow="hidden"
                  transition="transform 180ms ease, box-shadow 180ms ease"
                  _hover={{
                    transform: 'translateY(-2px)',
                    shadow: 'md',
                  }}
                >
                  <LazyImage
                    alt={`Imagem ${index + 1} da campanha`}
                    fit="cover"
                    h="100%"
                    src={convertLinkToResizedImage(item)}
                    w="100%"
                  />
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        <Box
          bg="bg.panel"
          borderColor="border.muted"
          borderRadius="xl"
          borderWidth="1px"
          p={{ base: 4, md: 6 }}
          shadow="xs"
        >
          <HStack
            align="center"
            gap={3}
            mb={4}
          >
            <Flex
              align="center"
              bg={`${colorPalette}.subtle`}
              borderRadius="lg"
              color={`${colorPalette}.fg`}
              h={9}
              justify="center"
              w={9}
            >
              <LuClock size={18} />
            </Flex>
            <Stack gap={0}>
              <Heading
                fontSize="sm"
                fontWeight="semibold"
                letterSpacing="tight"
              >
                Disponibilidade semanal
              </Heading>
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                Dias da semana liberados para disparo
              </Text>
            </Stack>
          </HStack>
          <DisplaySelectedWeekday
            displayItems={activeDaysStrings}
            label=""
          />
        </Box>
      </Stack>
    </Box>
  )
}

const CampaignDetailsTab = memo(CampaignDetailsTabComponent)

export { CampaignDetailsTab }
