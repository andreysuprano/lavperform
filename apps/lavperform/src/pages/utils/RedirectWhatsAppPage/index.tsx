import { Center, Container, VStack } from '@chakra-ui/react'
import { useEffect } from 'react'

import { LoadingState, ThemeImage } from '@/components'
import { useWhiteLabel } from '@/config'

export function RedirectWhatsAppPage() {
  const { texts } = useWhiteLabel()

  useEffect(() => {
    async function handleRedirect() {
      window.location.href = texts.redirectWhatsAppPage
    }

    const time = setTimeout(() => {
      handleRedirect()
    }, 3000)

    return () => {
      clearTimeout(time)
    }
  }, [texts.redirectWhatsAppPage])

  return (
    <Center
      as={Container}
      bg="bg"
      h="100vh"
    >
      <VStack>
        <ThemeImage
          h={16}
          imageKey="logo"
          variant="auto"
        />
        <LoadingState title="Redirecionando para o WhatsApp." />
      </VStack>
    </Center>
  )
}
