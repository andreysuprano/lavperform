import {
  Flex,
  Heading,
  SimpleGrid,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { RiDashboardLine } from 'react-icons/ri'

export function SkeletonLoading() {
  return (
    <Stack
      gap={6}
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
          Início
        </Flex>
      </Heading>

      <Skeleton
        borderRadius="xl"
        height="180px"
        w="full"
      />

      <Stack gap={3}>
        <Skeleton
          height="28px"
          w="200px"
        />
        <SimpleGrid
          columns={{ base: 1, sm: 2, md: 3, xl: 6 }}
          gap={4}
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton
              height="96px"
              key={idx}
            />
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap={3}>
        <Skeleton
          height="28px"
          w="120px"
        />
        <SimpleGrid
          columns={{ base: 2, md: 3, xl: 6 }}
          gap={3}
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton
              borderRadius="md"
              height="120px"
              key={idx}
            />
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap={3}>
        <Skeleton
          height="28px"
          w="220px"
        />
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton
            borderRadius="lg"
            height="72px"
            key={idx}
          />
        ))}
      </Stack>
    </Stack>
  )
}
