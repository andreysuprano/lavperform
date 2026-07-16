import {
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { Fragment } from 'react/jsx-runtime'
import { RiDashboardLine } from 'react-icons/ri'

import { GridLayout } from '@/components'

export function SkeletonLoading() {
  return (
    <Stack
      gap={4}
      mb={4}
    >
      <Heading
        fontWeight="bold"
        size="2xl"
      >
        <Flex
          alignItems="center"
          gap="2"
        >
          <RiDashboardLine />
          Dashboard
        </Flex>
      </Heading>
      <HStack
        gap="4"
        width="full"
      >
        <Skeleton
          flex={1}
          height="250px"
        />
        <Skeleton
          flex={1}
          height="250px"
        />
      </HStack>
      <Heading
        fontWeight="bold"
        size="2xl"
      >
        Sua base
      </Heading>
      <GridLayout
        columns={{ base: 1, md: 2, xl: 4 }}
        items={[1, 2, 3, 4]}
        renderItem={(item) => (
          <Fragment key={item}>
            <Skeleton height="100px" />
          </Fragment>
        )}
      />
      <Heading
        fontWeight="bold"
        size="2xl"
      >
        Performance
      </Heading>
      <SimpleGrid
        alignItems="stretch"
        columns={{ base: 1, xl: 2 }}
        gap={6}
      >
        <Stack gap={4}>
          <SimpleGrid
            columns={{ base: 1, md: 2 }}
            gap={4}
          >
            <Skeleton height="96px" />
            <Skeleton height="96px" />
          </SimpleGrid>
          <Skeleton height="380px" />
        </Stack>
        <Stack gap={2}>
          <Skeleton height="24px" />
          <Skeleton height="16px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
          <Skeleton height="56px" />
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}
