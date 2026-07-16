import { Grid, Heading, Stack } from '@chakra-ui/react'
import { PiMonitorPlay } from 'react-icons/pi'

import { AppContentLayout } from '@/components'
import {
  AcademyCarrousel,
  AcademyCourseList,
  AcademyWeekEvents,
} from '@/components/features'

export function AcademyIndexPage() {
  return (
    <AppContentLayout
      icon={<PiMonitorPlay />}
      title="Academy - Cursos"
    >
      <Stack gap={8}>
        <AcademyWeekEvents />
        <Grid
          gap={6}
          templateColumns={{ base: '1fr', lg: '1fr' }}
        >
          <AcademyCarrousel />
        </Grid>
        <Stack gap={4}>
          <Heading size="lg">Todos os Cursos</Heading>
          <AcademyCourseList />
        </Stack>
      </Stack>
    </AppContentLayout>
  )
}
