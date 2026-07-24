import { Badge, Box, Button, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { LuArrowRight, LuLightbulb } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'

import type {
  CrmInsightPriority,
  CustomerCrmInsight,
} from '@/utils/customers/customerCrmInsights'

type Props = {
  insights: CustomerCrmInsight[]
}

const PRIORITY_LABEL: Record<CrmInsightPriority, string> = {
  high: 'Urgente',
  medium: 'Atenção',
  opportunity: 'Oportunidade',
}

const PRIORITY_PALETTE: Record<CrmInsightPriority, string> = {
  high: 'red',
  medium: 'orange',
  opportunity: 'green',
}

export function CustomerCrmInsightsList({ insights }: Props) {
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
      <Stack gap={4}>
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
          Sinais para o negócio
        </Heading>

        <Stack
          as="ul"
          gap={3}
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
              px={4}
              py={3}
            >
              <Stack gap={2}>
                <HStack
                  align="flex-start"
                  justify="space-between"
                  gap={3}
                >
                  <Text
                    color="fg"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    {insight.title}
                  </Text>
                  <Badge
                    colorPalette={PRIORITY_PALETTE[insight.priority]}
                    flexShrink={0}
                    size="sm"
                    variant="subtle"
                  >
                    {PRIORITY_LABEL[insight.priority]}
                  </Badge>
                </HStack>
                <Text
                  color="fg.muted"
                  fontSize="sm"
                  lineHeight="short"
                >
                  {insight.message}
                </Text>
                {insight.action && (
                  <Button
                    asChild
                    alignSelf="flex-start"
                    size="xs"
                    variant="outline"
                  >
                    <RouterLink to={insight.action.href}>
                      {insight.action.label}
                      <LuArrowRight />
                    </RouterLink>
                  </Button>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  )
}
