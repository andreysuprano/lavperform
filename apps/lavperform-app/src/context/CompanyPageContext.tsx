import { createContext, PropsWithChildren, useState } from 'react'

import { OrganizationPage } from '@/types/organization-page.types'

interface CompanyPageContextData {
  data: Partial<OrganizationPage>
  updateData: (data: Partial<OrganizationPage>) => void
}

const CompanyPageContext = createContext({} as CompanyPageContextData)

export function CompanyPageProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<Partial<OrganizationPage>>({
    bgColor: '',
    biography: '',
    coverImage: '',
    whatsappMessage: '',
    links: [],
    galleries: [],
  })

  function updateData(data: Partial<OrganizationPage>) {
    setData((prev) => ({ ...prev, ...data }))
  }

  return (
    <CompanyPageContext.Provider
      value={{
        data,
        updateData,
      }}
    >
      {children}
    </CompanyPageContext.Provider>
  )
}

export { CompanyPageContext, type CompanyPageContextData }
