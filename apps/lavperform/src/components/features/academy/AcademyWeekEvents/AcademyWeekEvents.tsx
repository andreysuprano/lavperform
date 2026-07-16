import { Bleed, Heading, HStack, Stack } from '@chakra-ui/react'
import useEmblaCarousel from 'embla-carousel-react'

import { EventCard, LoadingState } from '@/components'
import { useCurrentWeekEvents } from '@/hooks/queries'
import { formatEventDate, isEventLive } from '@/utils/date'

function AcademyWeekEvents() {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
  })
  const { data: events, isLoading } = useCurrentWeekEvents()

  if (isLoading) {
    return <LoadingState />
  }

  if (!events || events.length === 0) {
    return null
  }

  return (
    <Stack gap={2}>
      <Heading size="md">Eventos da Semana</Heading>
      <Bleed
        className="embla"
        inline={{ base: '4', md: '6' }}
        ref={emblaRef}
      >
        <HStack
          alignItems="stretch"
          className="embla__container"
        >
          {events.map((event) => (
            <EventCard
              coverImage={event.coverImage}
              ctaLabel={event.ctaLabel}
              ctaUrl={event.ctaUrl}
              description={event.description}
              eventDate={event.eventDate}
              isLive={event.isStream && isEventLive(event.eventDate)}
              key={event.id}
              onFormatDate={formatEventDate}
              title={event.title}
            />
          ))}
        </HStack>
      </Bleed>
    </Stack>
  )
}

export { AcademyWeekEvents }
