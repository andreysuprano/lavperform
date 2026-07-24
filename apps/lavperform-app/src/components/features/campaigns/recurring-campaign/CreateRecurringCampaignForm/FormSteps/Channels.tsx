import { Badge, Box, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'

import { CHANNEL_CATALOG, type ChannelCatalogItem, type ChannelKey } from '@/components/features/channels/channelCatalog.constants'
import { useWhiteLabel } from '@/config'

import { getWizardFormId } from '../../wizardFormId'
import { FormStepsProps } from './FormSteps.types'

type ChannelCardProps = {
  channel: ChannelCatalogItem
  selected?: boolean
  onSelect?: (key: ChannelKey) => void
}

function ChannelSelectCardBase({ channel, selected, onSelect }: ChannelCardProps) {
  const { colors } = useWhiteLabel()
  const disabled = !channel.isAvailable

  const handleClick = useCallback(() => {
    if (disabled) return
    onSelect?.(channel.key)
  }, [channel.key, disabled, onSelect])

  return (
    <HStack
      borderColor={selected ? colors.primary : 'border'}
      borderRadius="md"
      borderWidth="1px"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      gap={3}
      onClick={handleClick}
      opacity={disabled ? 0.45 : 1}
      px={3}
      py={3}
      transition="background 0.15s, border-color 0.15s, opacity 0.15s"
      w="full"
      _hover={
        disabled
          ? {}
          : { bg: 'bg.subtle', borderColor: selected ? colors.primary : 'border.emphasized' }
      }
    >
      <Box
        alignItems="center"
        bg="bg.muted"
        borderRadius="md"
        color="fg.muted"
        display="flex"
        flexShrink={0}
        fontSize="lg"
        h={10}
        justifyContent="center"
        w={10}
      >
        <channel.icon />
      </Box>
      <Stack flex={1} gap={0.5}>
        <Text fontSize="sm" fontWeight="medium">
          {channel.name}
        </Text>
        {disabled && channel.badgeLabel ? (
          <Badge
            colorPalette={channel.badgeColorPalette ?? 'gray'}
            size="sm"
            variant="subtle"
            w="fit-content"
          >
            {channel.badgeLabel}
          </Badge>
        ) : null}
      </Stack>
      <Box
        alignItems="center"
        borderColor={selected ? colors.primary : 'border'}
        borderRadius="full"
        borderWidth="1px"
        display="flex"
        flexShrink={0}
        h={5}
        justifyContent="center"
        w={5}
      >
        {selected ? (
          <Box
            bg={colors.primary}
            borderRadius="full"
            h={3}
            w={3}
          />
        ) : null}
      </Box>
    </HStack>
  )
}

const ChannelSelectCard = memo(ChannelSelectCardBase) as typeof ChannelSelectCardBase

const SORTED_CHANNELS = [
  ...CHANNEL_CATALOG.filter((c) => c.isAvailable),
  ...CHANNEL_CATALOG.filter((c) => !c.isAvailable),
]

function normalizeSingleChannel(channels: ChannelKey[] | undefined): ChannelKey[] {
  if (!Array.isArray(channels) || channels.length < 1) return []
  return [channels[0]]
}

export function Channels(props: FormStepsProps) {
  const initialSelected = useMemo<ChannelKey[]>(
    () => normalizeSingleChannel(props.formData?.channels),
    [props.formData?.channels]
  )

  const [selected, setSelected] = useState<ChannelKey[]>(initialSelected)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSelected(normalizeSingleChannel(props.formData?.channels))
    setError(null)
  }, [props.formData?.channels])

  const selectChannel = useCallback((key: ChannelKey) => {
    setSelected([key])
  }, [])

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (selected.length < 1) {
        setError('Selecione um canal para iniciar a campanha.')
        return
      }

      setError(null)
      props.onSubmit?.({ channels: selected })
    },
    [props, selected]
  )

  return (
    <Stack
      as="form"
      gap={4}
      id={getWizardFormId(props.wizardFormId ?? 'campaign', props.id ?? 0)}
      onSubmit={onSubmit}
    >
      <Stack gap={1}>
        <Text fontWeight="semibold">
          {props.wizardContext === 'edit'
            ? 'Canal da campanha'
            : 'Selecione o canal'}
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
        {SORTED_CHANNELS.map((c) => (
          <ChannelSelectCard
            channel={c}
            key={c.key}
            onSelect={selectChannel}
            selected={selected.includes(c.key)}
          />
        ))}
      </SimpleGrid>

      {error ? (
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      ) : null}
    </Stack>
  )
}
