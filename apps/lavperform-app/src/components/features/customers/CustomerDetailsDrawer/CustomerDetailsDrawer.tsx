import { Badge, Button, Tabs, Text, useTabs } from '@chakra-ui/react'
import { useState } from 'react'
import { RiSaveLine } from 'react-icons/ri'

import { CustomDrawer } from '@/components'
import { getCustomerCategoryLabel } from '@/utils/customers/customerCategory'

import { CustomerOrderList } from '../CustomerOrderList/CustomerOrderList'
import { EditCustomerForm } from '../EditCustomerForm/EditCustomerForm'
import { Props } from './CustomerDetailsDrawer.types'

function CustomerDetailsDrawer({ data, onClose }: Props) {
  const [isOpen, setIsOpen] = useState(!!data)

  const tabs = useTabs({
    defaultValue: 'data',
  })

  const handleClose = () => {
    onClose()

    setIsOpen(false)
  }

  if (!data) {
    return null
  }

  return (
    <CustomDrawer
      footer={
        tabs.value === 'data' && (
          <Button
            form="data-form"
            type="submit"
          >
            <RiSaveLine />
            Salvar
          </Button>
        )
      }
      isOpen={isOpen}
      onExitComplete={handleClose}
      title={
        <Text>
          Cliente: {data.name}{' '}
          <Badge variant="solid">
            {getCustomerCategoryLabel(data)}
          </Badge>
        </Text>
      }
    >
      <Tabs.RootProvider value={tabs}>
        <Tabs.List>
          <Tabs.Trigger value="data">Dados do Cliente</Tabs.Trigger>
          <Tabs.Trigger value="orders">Vendas</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="data">
          <EditCustomerForm
            data={data}
            onClose={handleClose}
          />
        </Tabs.Content>
        <Tabs.Content value="orders">
          <CustomerOrderList customerId={data.id} />
        </Tabs.Content>
      </Tabs.RootProvider>
    </CustomDrawer>
  )
}

export { CustomerDetailsDrawer, type Props as CustomerDetailsDrawerProps }
