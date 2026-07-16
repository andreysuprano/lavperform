import { Box } from '@chakra-ui/react'

import { EditCustomerForm } from '../../EditCustomerForm/EditCustomerForm'
import type { Props } from './ConfigurationsTab.types'

export function ConfigurationsTab({ customer }: Props) {
  const handleClose = () => {
    // No-op: o modal pai gerencia o fechamento
    // Esta função é necessária para a interface do EditCustomerForm
  }

  return (
    <Box>
      <EditCustomerForm
        data={customer}
        onClose={handleClose}
      />
    </Box>
  )
}
