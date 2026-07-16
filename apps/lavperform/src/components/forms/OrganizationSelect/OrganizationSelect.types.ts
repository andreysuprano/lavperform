import type { SelectValueChangeDetails } from '@chakra-ui/react'

import type { UserCompany } from '@/types'

export type Props = {
  companies: UserCompany[]
  selectedCompany: UserCompany | null
  onCompanyChange: (details: SelectValueChangeDetails<UserCompany>) => void
  showLabel?: boolean
}
