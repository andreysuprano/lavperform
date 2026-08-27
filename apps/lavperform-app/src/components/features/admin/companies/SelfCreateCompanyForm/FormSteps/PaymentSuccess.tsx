import { Box, Button, Center, Heading, Icon, Link, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { PiCheckCircle, PiClockCountdown } from 'react-icons/pi'
import { Link as RouterLink } from 'react-router-dom'

import { OnboardingSuccessState } from './FormSteps.types'
import { useWhiteLabel } from '@/config'

interface PaymentSuccessProps {
  successState?: OnboardingSuccessState
}

function PaymentSuccessComponent({ successState }: PaymentSuccessProps) {
  const { texts } = useWhiteLabel()
  const accountActivated = successState?.accountActivated ?? false

  return (
    <Center
      flexDirection="column"
      minH={{ base: 'auto', md: '320px' }}
      py={{ base: 6, md: 8 }}
    >
      <Stack
        alignItems="center"
        gap={6}
        textAlign="center"
      >
        <Icon
          color={accountActivated ? 'green.500' : 'orange.500'}
          fontSize="6xl"
        >
          {accountActivated ? <PiCheckCircle /> : <PiClockCountdown />}
        </Icon>
        <Box>
          <Heading
            as="h3"
            fontSize="2xl"
            mb={2}
          >
            {accountActivated
              ? 'Conta ativada com sucesso!'
              : 'Cadastro realizado!'}
          </Heading>
          <Text
            color="fg.muted"
            fontSize="md"
          >
            {accountActivated
              ? `Seu pagamento foi confirmado e sua conta já está liberada. Faça login para começar a usar o ${texts.appName}.`
              : 'Seu cadastro foi criado, mas o pagamento ainda está sendo processado. Assim que for confirmado, sua conta será liberada automaticamente.'}
          </Text>
          {!accountActivated && successState?.invoiceUrl && (
            <Text
              fontSize="sm"
              mt={3}
            >
              <Link
                href={successState.invoiceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Concluir confirmação do pagamento
              </Link>
            </Text>
          )}
        </Box>
        <Button
          asChild
          colorPalette="green"
        >
          <RouterLink to="/login">
            {accountActivated ? 'Acessar minha conta' : 'Ir para o login'}
          </RouterLink>
        </Button>
      </Stack>
    </Center>
  )
}

const PaymentSuccess = memo(PaymentSuccessComponent)

export { PaymentSuccess }
