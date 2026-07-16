import { Box, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'
import {
  LuCircleCheck,
  LuCirclePause,
  LuCircleX,
  LuLoader,
  LuRadio,
  LuSquareCheckBig,
} from 'react-icons/lu'

import {
  CHANNEL_CATALOG,
  type ChannelKey,
} from '@/components/features/channels/channelCatalog.constants'
import type { RecurringCampaign, RecurringCampaignStatus } from '@/types'

import { MultiSelectFilter } from '../RecurringCampaignDetailsView/MultiSelectFilter'
import {
  ACTIVE_FILTER_OPTIONS,
  hasActiveCampaignFilters,
  type CampaignActiveFilter,
  type RecurringCampaignListFilters,
  STATUS_FILTER_OPTIONS,
  getCampaignChannelKey,
} from './recurringCampaignList.utils'

type Props = {
  campaigns: RecurringCampaign[]
  filters: RecurringCampaignListFilters
  onChange: (next: RecurringCampaignListFilters) => void
}

const STATUS_ICONS: Record<RecurringCampaignStatus, React.ReactNode> = {
  IN_PROGRESS: <LuCircleCheck size={14} />,
  COMPLETED: <LuSquareCheckBig size={14} />,
  PROCESSING: <LuLoader size={14} />,
  FAILED: <LuCircleX size={14} />,
}

function RecurringCampaignListFilters({ campaigns, filters, onChange }: Props) {
  const channelOptions = useMemo(() => {
    const keys = new Set<ChannelKey>()

    for (const campaign of campaigns) {
      const key = getCampaignChannelKey(campaign)
      if (key) keys.add(key)
    }

    return Array.from(keys)
      .map((key) => {
        const channel = CHANNEL_CATALOG.find((item) => item.key === key)
        const Icon = channel?.icon

        return {
          value: key,
          label: channel?.name ?? key,
          icon: Icon ? <Icon size={14} /> : undefined,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [campaigns])

  const activeOptions = useMemo(
    () =>
      ACTIVE_FILTER_OPTIONS.map((option) => ({
        ...option,
        icon:
          option.value === 'active' ? (
            <LuCircleCheck size={14} />
          ) : (
            <LuCirclePause size={14} />
          ),
      })),
    []
  )

  const statusOptions = useMemo(
    () =>
      STATUS_FILTER_OPTIONS.map((option) => ({
        ...option,
        icon: STATUS_ICONS[option.value],
      })),
    []
  )

  const handleActiveChange = (active: CampaignActiveFilter[]) => {
    onChange({ ...filters, active })
  }

  const handleChannelChange = (channel: ChannelKey[]) => {
    onChange({ ...filters, channel })
  }

  const handleStatusChange = (status: RecurringCampaignStatus[]) => {
    onChange({ ...filters, status })
  }

  const handleClearFilters = () => {
    onChange({
      active: [],
      channel: [],
      status: [],
    })
  }

  const showClearFilters = hasActiveCampaignFilters(filters)

  return (
    <Flex
      align="center"
      gap={2}
      wrap="wrap"
    >
      <MultiSelectFilter
        icon={<LuRadio size={14} />}
        label="Situação"
        onChange={handleActiveChange}
        options={activeOptions}
        placeholder="Todas"
        value={filters.active}
      />

      {channelOptions.length > 0 && (
        <MultiSelectFilter
          label="Canal"
          onChange={handleChannelChange}
          options={channelOptions}
          placeholder="Todos"
          value={filters.channel}
        />
      )}

      <MultiSelectFilter
        label="Status"
        onChange={handleStatusChange}
        options={statusOptions}
        placeholder="Todos"
        value={filters.status}
      />

      {showClearFilters && (
        <Box
          _hover={{ color: 'fg' }}
          as="button"
          color="fg.muted"
          fontSize="xs"
          fontWeight="medium"
          onClick={handleClearFilters}
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
  )
}

export { RecurringCampaignListFilters }
