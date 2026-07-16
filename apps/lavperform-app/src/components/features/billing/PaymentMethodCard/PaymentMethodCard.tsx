import { Button, Card, Flex, Icon, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { RiBarcodeBoxLine } from 'react-icons/ri'

import { Props } from './PaymentMethodCard.types'

function PaymentMethodCardComponent({
  hasCard,
  subscriptionCard,
  isLoading,
  onAddCard,
}: Props) {
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
            as={RiBarcodeBoxLine}
            boxSize={6}
            color="fg.default"
            mr={3}
          />
          <Text
            fontSize="md"
            fontWeight="medium"
          >
            {subscriptionCard && subscriptionCard !== 'N/A'
              ? subscriptionCard
              : 'Boleto Bancário / Pix'}
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
        {!hasCard && (
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
