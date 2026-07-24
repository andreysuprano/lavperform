import {
  Box,
  FormatNumber,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'

import type { CustomerInsightSegment } from '@/types'

type Props = {
  segments: CustomerInsightSegment[]
  totalCustomers: number
}

function safePercent(part: number, total: number): number {
  if (!total || total <= 0) return 0
  return Math.round((part / total) * 100)
}

export function CustomerSegmentBreakdown({
  segments,
  totalCustomers,
}: Props) {
  const ranked = [...segments]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)

  if (ranked.length === 0) return null

  return (
    <Box
      bg="bg.panel"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      p={{ base: 4, md: 5 }}
      w="full"
    >
      <Stack gap={4}>
        <Heading
          fontSize="md"
          fontWeight="semibold"
          letterSpacing="tight"
        >
          Distribuição por segmento RFV
        </Heading>
        <SimpleGrid
          columns={{ base: 1, md: 2, xl: 3 }}
          gap={2}
        >
          {ranked.map((segment) => (
            <HStack
              bg="bg"
              borderColor="border"
              borderRadius="md"
              borderWidth="1px"
              justify="space-between"
              key={segment.segmentation}
              px={3}
              py={2}
            >
              <Text
                fontSize="sm"
                truncate
              >
                {segment.icon} {segment.label}
              </Text>
              <HStack
                flexShrink={0}
                gap={2}
              >
                <Text
                  color="fg.muted"
                  fontSize="xs"
                >
                  {safePercent(segment.count, totalCustomers)}%
                </Text>
                <Text
                  fontSize="sm"
                  fontWeight="semibold"
                >
                  <FormatNumber value={segment.count} />
                </Text>
              </HStack>
            </HStack>
          ))}
        </SimpleGrid>
      </Stack>
    </Box>
  )
}
