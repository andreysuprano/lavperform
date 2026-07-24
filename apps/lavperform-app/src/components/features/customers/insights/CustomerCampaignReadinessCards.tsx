import { SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { LuCake, LuMail, LuMessageCircle, LuPhone } from 'react-icons/lu'

import { MetricCard } from '@/components/features/dashboard/MetricCard/MetricCard'
import type { CustomerCampaignReadiness } from '@/types'

type Props = {
  readiness: CustomerCampaignReadiness
}

export function CustomerCampaignReadinessCards({ readiness }: Props) {
  return (
    <Stack gap={2}>
      <Text
        color="fg.muted"
        fontSize="xs"
        fontWeight="medium"
        letterSpacing="0.08em"
        textTransform="uppercase"
      >
        Dados para campanhas
      </Text>
      <Text
        color="fg.muted"
        fontSize="sm"
      >
        Informações importantes para personalizar e criar campanhas mais
        eficazes.
      </Text>
      <SimpleGrid
        columns={{ base: 2, md: 4 }}
        gap={3}
      >
        <MetricCard
          icon={LuMail}
          label={`Com e-mail · ${readiness.withEmailRate}%`}
          size="sm"
          value={readiness.withEmail}
        />
        <MetricCard
          icon={LuCake}
          label={`Com aniversário · ${readiness.withBirthDateRate}%`}
          size="sm"
          value={readiness.withBirthDate}
        />
        <MetricCard
          icon={LuPhone}
          label={`Com telefone · ${readiness.withPhoneRate}%`}
          size="sm"
          value={readiness.withPhone}
        />
        <MetricCard
          icon={LuMessageCircle}
          label={`Opt-in WhatsApp · ${readiness.withWhatsappOptinRate}%`}
          size="sm"
          value={readiness.withWhatsappOptin}
        />
      </SimpleGrid>
    </Stack>
  )
}
