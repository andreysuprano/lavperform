import { Box, Center, Heading, Icon, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { PiCheckCircle } from 'react-icons/pi'

function SuccessComponent() {
  return (
    <Center
      flexDirection="column"
      minH="400px"
      py={8}
    >
      <Stack
        alignItems="center"
        gap={6}
        textAlign="center"
      >
        <Icon
          color="green.500"
          fontSize="6xl"
        >
          <PiCheckCircle />
        </Icon>
        <Box>
          <Heading
            as="h3"
            fontSize="2xl"
            mb={2}
          >
            Cadastro realizado com sucesso!
          </Heading>
          <Text
            color="fg.muted"
            fontSize="md"
          >
            Em breve você receberá um e-mail com mais informações e um dos
            nossos consultores entrará em contato para ajudar na configuração da
            sua conta.
          </Text>
        </Box>
      </Stack>
    </Center>
  )
}

const Success = memo(SuccessComponent)

export { Success }
