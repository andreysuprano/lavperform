import { Flex, Icon, Link, Text } from '@chakra-ui/react'
import { RiErrorWarningFill, RiExternalLinkLine } from 'react-icons/ri'

import { useAuth } from '@/context/AuthContext'
import { useMetaIntegrationAvailability } from '@/hooks/queries'

const META_BILLING_URL =
  'https://business.facebook.com/billing_hub/payment_settings'

export function MetaPaymentIssueBanner() {
  const { selectedCompany } = useAuth()
  const { data: metaAvailability } = useMetaIntegrationAvailability(
    selectedCompany?.id,
  )

  if (!metaAvailability?.metaPaymentIssue) return null

  return (
    <Flex
      align="center"
      bg="red.600"
      color="white"
      gap={3}
      mb={4}
      px={4}
      py={2}
      role="alert"
      rounded="md"
    >
      <Icon as={RiErrorWarningFill} boxSize={5} flexShrink={0} />
      <Text flex={1} fontSize="sm" minW={0}>
        A Meta está recusando os envios por pendência de pagamento na conta do
        WhatsApp.
      </Text>
      <Link
        alignItems="center"
        color="white"
        display="inline-flex"
        fontSize="sm"
        fontWeight="semibold"
        gap={1}
        href={META_BILLING_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        Resolver pagamento
        <Icon as={RiExternalLinkLine} boxSize={4} />
      </Link>
    </Flex>
  )
}
