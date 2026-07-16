export type Props = {
  title: string
  description: string
  eventDate: string
  coverImage?: string
  ctaLabel: string
  ctaUrl: string
  isLive?: boolean
  onFormatDate: (dateString: string) => string
}
