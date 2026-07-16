import { Flex, Skeleton, Stack } from '@chakra-ui/react'
import { Fragment } from 'react'
import { GrCycle } from 'react-icons/gr'

import { AppContentLayout, GridLayout } from '@/components'

export function CampaignIndexSkeletonLoading() {
  return (
    <AppContentLayout
      icon={<GrCycle />}
      title="Fidelização e Recorrência"
    >
      <Stack gap={4}>
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
            w="140px"
          />
          <Skeleton
            h="36px"
            w={{ base: 'full', md: '220px' }}
          />
        </Flex>

        <GridLayout
          columns={{ base: 1, sm: 2, lg: 4 }}
          items={[1, 2, 3, 4]}
          renderItem={(item) => (
            <Fragment key={item}>
              <Skeleton
                borderRadius="lg"
                h="96px"
              />
            </Fragment>
          )}
        />

        <Skeleton
          borderRadius="lg"
          h="380px"
        />
      </Stack>
    </AppContentLayout>
  )
}
