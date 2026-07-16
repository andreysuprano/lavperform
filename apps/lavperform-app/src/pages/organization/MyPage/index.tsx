import { HStack } from '@chakra-ui/react'
import { MdOutlineContactPage } from 'react-icons/md'

import {
  AppContentLayout,
  CompanyPageForm,
  CompanyPreviewCard,
} from '@/components'
import { CompanyPageProvider } from '@/context/CompanyPageContext'

export const MyPage = () => {
  return (
    <AppContentLayout
      icon={<MdOutlineContactPage />}
      title="Minha página"
    >
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
    </AppContentLayout>
  )
}
