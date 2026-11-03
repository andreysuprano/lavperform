import { HStack, Stack, Text } from '@chakra-ui/react'
import { MdOutlineContactPage } from 'react-icons/md'

import {
  AppContentLayout,
  CompanyPageForm,
  CompanyPreviewCard,
  MeasurementNotices,
} from '@/components'
import { CompanyPageProvider } from '@/context/CompanyPageContext'

export const MyPage = () => {
  return (
    <AppContentLayout
      icon={<MdOutlineContactPage />}
      title="Minha página"
    >
      <Stack gap={6}>
        <Text>
          Crie páginas para divulgar seus links, promoções e ações de ativação
          com os seus clientes.
        </Text>
        <MeasurementNotices />
        <HStack
          alignItems={'flex-start'}
          flexDirection={{ base: 'column', lg: 'row' }}
          gap={6}
        >
          <CompanyPageProvider>
            <CompanyPageForm />
            <CompanyPreviewCard />
          </CompanyPageProvider>
        </HStack>
      </Stack>
    </AppContentLayout>
  )
}
