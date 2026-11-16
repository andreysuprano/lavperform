export type ConnectionProvider = 'META' | 'GOOGLE_BUSINESS' | 'GOOGLE_ADS'

export type ConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'

export type PublishChannel = 'FACEBOOK' | 'INSTAGRAM' | 'GOOGLE_BUSINESS'

export type PostStatus =
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED'

export type SocialConnection = {
  provider: ConnectionProvider
  status: ConnectionStatus
  configured: boolean
  sandbox: boolean
  accountName: string | null
  accountDetail: string | null
  lastError: string | null
  metrics: Array<{ label: string; value: string }> | null
}

export type ConnectionsOverview = {
  sandbox: boolean
  metaConfigured: boolean
  googleConfigured: boolean
  googleAdsConfigured: boolean
  connections: SocialConnection[]
}

export type ConnectStart = {
  sandbox: boolean
  configured: boolean
  authorizationUrl: string | null
  message: string | null
  status: ConnectionStatus
}

export type MetaAssets = {
  pages: Array<{
    id: string
    name: string
    followers: number
    instagram: { id: string; username: string } | null
  }>
  adAccounts: Array<{ id: string; name: string; accountId: string }>
}

export type GoogleAssets = {
  locations: Array<{ id: string; name: string; address: string }>
  adAccounts: Array<{ id: string; name: string; customerId: string }>
}

export type ScheduledPost = {
  id: string
  companyId: string
  draftId: string | null
  variationId: string | null
  channels: PublishChannel[]
  caption: string
  headline: string | null
  scheduledAt: string
  status: PostStatus
  publishedAt: string | null
  attemptCount: number
  maxAttempts: number
  lastError: string | null
  sandbox: boolean
}

export type ScheduleSlot = {
  id: string
  label: string
  at: string
  best: boolean
}

export type GoogleReview = {
  id: string
  author: string
  rating: number
  comment: string
  reply: string | null
}

export type GoogleProfileView = {
  connected: boolean
  profile: {
    name: string | null
    address: string | null
    hours: string | null
    rating: number
    reviewCount: number
    mapsUrl: string
    insights: Array<{ label: string; value: string; delta: string }>
  } | null
  reviews: GoogleReview[]
  posts: Array<{
    id: string
    headline: string | null
    caption: string
    status: PostStatus
    scheduledAt: string
    channels: string[]
  }>
}
