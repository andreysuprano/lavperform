import { Badge, Button, Card, Heading, Stack, Text } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { trafficService } from '@/services'
import {
  gtmMeasurementNotice,
  noticeFromQuery,
  pixelMeasurementNotice,
  type MeasurementNotice,
} from '@/utils/tracking/measurement-notices'
import { companyHasTrafficRead } from '@/utils/tracking/traffic-access'

function NoticeCard({ notice }: { notice: MeasurementNotice }) {
  return (
    <Card.Root size="sm">
      <Card.Body>
        <Stack gap={2}>
          {notice.badge && (
            <Badge
              colorPalette={notice.badgeTone === 'green' ? 'green' : 'gray'}
              width="fit-content"
            >
              {notice.badge}
            </Badge>
          )}
          {notice.title && <Heading size="md">{notice.title}</Heading>}
          <Text>{notice.text}</Text>
          {notice.href &&
            (notice.title ? (
              <Button
                asChild
                width="fit-content"
              >
                <RouterLink to={notice.href}>{notice.actionLabel}</RouterLink>
              </Button>
            ) : (
              <RouterLink to={notice.href}>{notice.actionLabel}</RouterLink>
            ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

function MeasurementNotices() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id
  const canConfigure = companyHasTrafficRead(selectedCompany?.permissions)

  const pixelQuery = useQuery({
    queryKey: queryKeys.traffic.pixel(companyId ?? ''),
    queryFn: () => trafficService.getPixel(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })
  const gtmQuery = useQuery({
    queryKey: queryKeys.traffic.gtm(companyId ?? ''),
    queryFn: () => trafficService.getGtm(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })

  const pixel = noticeFromQuery(pixelQuery, (data) =>
    pixelMeasurementNotice(data, canConfigure)
  )
  const gtm = noticeFromQuery(gtmQuery, (data) =>
    gtmMeasurementNotice(data, canConfigure)
  )

  if (!pixel && !gtm) return null

  return (
    <Stack gap={3}>
      {pixel && <NoticeCard notice={pixel} />}
      {gtm && <NoticeCard notice={gtm} />}
    </Stack>
  )
}

export { MeasurementNotices }
