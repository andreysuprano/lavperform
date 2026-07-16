import { Box, Heading, Text } from '@chakra-ui/react'
import { RiAdminLine } from 'react-icons/ri'

import { AppContentLayout } from '@/components'

export function AdminIndexPage() {
  return (
    <AppContentLayout
      icon={<RiAdminLine />}
      title="Administração"
    >
      <Box>
        <Heading>Área de administração do sistema.</Heading>
        <Text>Selecione o módulo desejado na barra lateral.</Text>
      </Box>
    </AppContentLayout>
  )
}
