import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { LuLightbulb } from 'react-icons/lu'

import type { CampaignStrategyInsight } from '@/utils/campaigns/campaignMetrics'

type Props = {
  insights: CampaignStrategyInsight[]
}

export function CampaignStrategyInsights({ insights }: Props) {
  if (insights.length === 0) return null

  return (
    <Box
      bg="bg.panel"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      p={{ base: 4, md: 5 }}
      shadow="xs"
      w="full"
    >
      <Stack gap={3}>
        <Heading
          alignItems="center"
          color="fg"
          display="flex"
          fontSize="md"
          fontWeight="semibold"
          gap={2}
          letterSpacing="tight"
        >
          <LuLightbulb size={18} />
          Sinais para a estratégia
        </Heading>
        <Stack
          as="ul"
          gap={2}
          listStyleType="none"
          m={0}
          p={0}
        >
          {insights.map((insight) => (
            <Box
              as="li"
              bg="bg"
              borderColor="border"
              borderLeftColor="primary"
              borderLeftWidth="3px"
              borderRadius="md"
              borderWidth="1px"
              key={insight.id}
              pl={3}
              pr={3}
              py={2}
            >
              <Text
                color="fg"
                fontSize="sm"
                lineHeight="short"
              >
                {insight.message}
              </Text>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}
