import type { ChannelKey } from '@/components/features/channels/channelCatalog.constants'
import type { RecurringCampaign, RecurringCampaignStatus } from '@/types'

export type CampaignActiveFilter = 'active' | 'inactive'

export type RecurringCampaignListFilters = {
  active: CampaignActiveFilter[]
  channel: ChannelKey[]
  status: RecurringCampaignStatus[]
}

export const ACTIVE_FILTER_OPTIONS = [
  { value: 'active' as const, label: 'Ativas' },
  { value: 'inactive' as const, label: 'Inativas' },
]

export const STATUS_FILTER_OPTIONS = [
  { value: 'IN_PROGRESS' as const, label: 'Em andamento' },
  { value: 'COMPLETED' as const, label: 'Concluídas' },
  { value: 'PROCESSING' as const, label: 'Processando' },
  { value: 'FAILED' as const, label: 'Falhou' },
]

export function getCampaignChannelKey(
  campaign: RecurringCampaign
): ChannelKey | null {
  if (campaign.channels?.[0]) {
    return campaign.channels[0]
  }

  if (campaign.channel) {
    return campaign.channel.toLowerCase() as ChannelKey
  }

  return null
}

export function resolveCampaignStatus(
  campaign: RecurringCampaign
): RecurringCampaignStatus | null {
  if (campaign.status) return campaign.status
  if (campaign.active) return 'IN_PROGRESS'
  return null
}

export function sortCampaignsByCreatedAtDesc(
  campaigns: RecurringCampaign[]
): RecurringCampaign[] {
  return [...campaigns].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function filterCampaigns(
  campaigns: RecurringCampaign[],
  filters: RecurringCampaignListFilters
): RecurringCampaign[] {
  return campaigns.filter((campaign) => {
    if (filters.active.length > 0) {
      const matchesActive =
        (filters.active.includes('active') && campaign.active) ||
        (filters.active.includes('inactive') && !campaign.active)

      if (!matchesActive) return false
    }

    if (filters.channel.length > 0) {
      const channelKey = getCampaignChannelKey(campaign)
      if (!channelKey || !filters.channel.includes(channelKey)) return false
    }

    if (filters.status.length > 0) {
      const status = resolveCampaignStatus(campaign)
      if (!status || !filters.status.includes(status)) return false
    }

    return true
  })
}

export function createDefaultCampaignFilters(
  campaigns: RecurringCampaign[]
): RecurringCampaignListFilters {
  const hasActiveCampaigns = campaigns.some((campaign) => campaign.active)

  return {
    active: hasActiveCampaigns ? ['active'] : [],
    channel: [],
    status: [],
  }
}

export function hasActiveCampaignFilters(
  filters: RecurringCampaignListFilters
): boolean {
  return (
    filters.active.length > 0 ||
    filters.channel.length > 0 ||
    filters.status.length > 0
  )
}
