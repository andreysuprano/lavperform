import {
  Card,
  HStack,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stack,
  VStack,
} from '@chakra-ui/react'

function RecurringCampaignItemCardSkeleton() {
  return (
    <Card.Root
      borderWidth="1px"
      overflow="hidden"
      size="sm"
    >
      <Card.Header
        gap={2}
        pb={2}
        pt={3}
        px={4}
      >
        <HStack justifyContent="space-between">
          <Skeleton
            borderRadius="full"
            h="22px"
            w="88px"
          />
          <HStack gap={2}>
            <Skeleton
              h="16px"
              w="40px"
            />
            <Skeleton
              borderRadius="full"
              h="20px"
              w="36px"
            />
            <SkeletonCircle size="6" />
          </HStack>
        </HStack>
        <VStack
          align="flex-start"
          gap={1.5}
        >
          <Skeleton
            h="20px"
            w="60%"
          />
          <Skeleton
            borderRadius="full"
            h="20px"
            w="80px"
          />
        </VStack>
      </Card.Header>

      <Card.Body
        gap={3}
        px={4}
        py={2}
      >
        <HStack
          align="flex-start"
          gap={3}
        >
          <Skeleton
            borderRadius="lg"
            flexShrink={0}
            h="72px"
            w="72px"
          />
          <Stack
            flex={1}
            gap={2}
          >
            <Skeleton
              h="16px"
              w="70%"
            />
            <SkeletonText
              noOfLines={2}
              gap={1.5}
            />
          </Stack>
        </HStack>

        <HStack gap={1}>
          <Skeleton
            borderRadius="full"
            h="18px"
            w="64px"
          />
          <Skeleton
            borderRadius="full"
            h="18px"
            w="72px"
          />
        </HStack>

        <Skeleton
          borderRadius="xl"
          h="72px"
          w="full"
        />
      </Card.Body>

      <Card.Footer
        flexDirection="column"
        gap={2}
        px={4}
        py={3}
      >
        <Skeleton
          h="20px"
          w="full"
        />
        <Skeleton
          h="14px"
          w="55%"
        />
      </Card.Footer>
    </Card.Root>
  )
}

export { RecurringCampaignItemCardSkeleton }
