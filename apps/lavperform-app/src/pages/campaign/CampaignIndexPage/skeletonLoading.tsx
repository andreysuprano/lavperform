import { Flex, Grid, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import { GrCycle } from 'react-icons/gr'

import { AppContentLayout } from '@/components'

export function CampaignIndexSkeletonLoading() {
  return (
    <AppContentLayout
      icon={<GrCycle />}
      title="Fidelização e Recorrência"
    >
      <Stack gap={5}>
        <Skeleton
          borderRadius="lg"
          h={{ base: '220px', md: '144px' }}
        />

        <Flex
          align={{ base: 'stretch', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={2}
          justify="space-between"
        >
          <Skeleton
            h="20px"
            w="220px"
          />
          <Skeleton
            h="36px"
            w={{ base: 'full', md: '220px' }}
          />
        </Flex>

        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: 4 }}
          gap={3}
        >
          {[1, 2, 3, 4].map((item) => (
            <Skeleton
              key={item}
              borderRadius="lg"
              h="110px"
            />
          ))}
        </SimpleGrid>

        <SimpleGrid
          columns={{ base: 2, md: 4 }}
          gap={3}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <Skeleton
              key={item}
              borderRadius="lg"
              h="72px"
            />
          ))}
        </SimpleGrid>

        <Skeleton
          borderRadius="lg"
          h="160px"
        />

        <Skeleton
          borderRadius="lg"
          h="100px"
        />

        <Skeleton
          borderRadius="lg"
          h="380px"
        />

        <Grid
          gap={4}
          templateColumns={{ base: '1fr', lg: '1.2fr 1fr' }}
        >
          <Skeleton
            borderRadius="lg"
            h="260px"
          />
          <Skeleton
            borderRadius="lg"
            h="260px"
          />
        </Grid>
      </Stack>
    </AppContentLayout>
  )
}
