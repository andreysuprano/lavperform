import { createListCollection } from '@chakra-ui/react'

export enum CompanyStatesType {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

export const companyStateOptions = createListCollection({
  items: [
    {
      value: CompanyStatesType.ACTIVE,
      label: 'Ativo',
      color: 'green',
    },
    {
      value: CompanyStatesType.INACTIVE,
      label: 'Inativo',
      color: 'red',
    },
    {
      value: CompanyStatesType.PENDING,
      label: 'Pendente',
      color: 'orange',
    },
  ],
})
