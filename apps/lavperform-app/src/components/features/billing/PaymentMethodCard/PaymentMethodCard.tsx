import { Button, Card, Flex, Icon, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { RiBankCardLine, RiBarcodeBoxLine } from 'react-icons/ri'

import { Props } from './PaymentMethodCard.types'

function getPaymentMethodLabel({
  hasCard,
  subscriptionCard,
  planAllowsAlternativePayments,
  alternativePaymentLabel,
}: Pick<
  Props,
  | 'hasCard'
  | 'subscriptionCard'
  | 'planAllowsAlternativePayments'
  | 'alternativePaymentLabel'
>) {
  if (hasCard && subscriptionCard && subscriptionCard !== 'N/A') {
    return subscriptionCard
  }

  if (planAllowsAlternativePayments) {
    return alternativePaymentLabel || 'Boleto Bancário / Pix'
  }

  return 'Cartão de crédito'
}

function PaymentMethodCardComponent({
  hasCard,
  subscriptionCard,
  isLoading,
  onAddCard,
  planAllowsAlternativePayments = false,
  alternativePaymentLabel,
}: Props) {
  const paymentLabel = getPaymentMethodLabel({
    hasCard,
    subscriptionCard,
    planAllowsAlternativePayments,
    alternativePaymentLabel,
  })

  return (
    <Card.Root
      borderRadius="lg"
      variant="elevated"
    >
      <Card.Header pb={4}>
        <Text
          fontSize="lg"
          fontWeight="semibold"
        >
          Forma de pagamento
        </Text>
      </Card.Header>
      <Card.Body pt={0}>
        <Flex
          align="center"
          bg="bg.muted"
          borderRadius="md"
          mb={4}
          p={4}
        >
          <Icon
            as={hasCard ? RiBankCardLine : RiBarcodeBoxLine}
            boxSize={6}
            color="fg.default"
            mr={3}
          />
          <Text
            fontSize="md"
            fontWeight="medium"
          >
            {paymentLabel}
          </Text>
        </Flex>
        {hasCard && (
          <Text
            color="fg.muted"
            fontSize="sm"
            lineHeight="tall"
          >
            Você já possui um cartão cadastrado. Não é necessário se preocupar
            com seus pagamentos.
          </Text>
        )}
        {!hasCard && planAllowsAlternativePayments && (
          <Stack gap={2}>
            <Text
              color="fg.muted"
              fontSize="sm"
              lineHeight="tall"
            >
              Não se preocupe mais em lembrar de pagar o boleto, habilite o
              pagamento por cartão de crédito.
            </Text>
            <Text
              color="fg.subtle"
              fontSize="xs"
            >
              Você poderá voltar para o boleto quando quiser.
            </Text>
          </Stack>
        )}
        {!hasCard && !planAllowsAlternativePayments && (
          <Text
            color="fg.muted"
            fontSize="sm"
            lineHeight="tall"
          >
            Cadastre um cartão de crédito para ativar os pagamentos recorrentes
            do seu plano.
          </Text>
        )}
      </Card.Body>
      <Card.Footer>
        <Button
          colorScheme="green"
          disabled={hasCard || isLoading}
          onClick={onAddCard}
          size="md"
          w="full"
        >
          {hasCard ? 'Cartão cadastrado' : 'Adicionar Cartão'}
        </Button>
      </Card.Footer>
    </Card.Root>
  )
}

const PaymentMethodCard = memo(
  PaymentMethodCardComponent
) as typeof PaymentMethodCardComponent

export { PaymentMethodCard, type Props as PaymentMethodCardProps }
