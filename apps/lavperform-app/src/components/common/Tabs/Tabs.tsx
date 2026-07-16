import { Box, Button } from '@chakra-ui/react'
import { Fragment, memo, useState } from 'react'

import { Props } from './Tabs.types'

const TabsComponent = ({ data }: Props) => {
  const [page, setPage] = useState(data[0].label)

  return (
    <>
      <Box
        borderBottomColor="gray.200"
        borderBottomWidth={1}
        mb={4}
      >
        {data.map((item, index) => {
          return (
            <Button
              borderBottomColor={item.label === page ? 'gray.900' : ''}
              borderBottomWidth={2}
              color={item.label === page ? 'gray.900' : 'gray.500'}
              key={index}
              onClick={() => setPage(item.label)}
              rounded={0}
              variant="ghost"
            >
              {item.label}
            </Button>
          )
        })}
      </Box>
      {data.map((item, index) => {
        if (item.label === page)
          return <Fragment key={index}>{item.element}</Fragment>
      })}
    </>
  )
}

const Tabs = memo(TabsComponent) as typeof TabsComponent

export { Tabs, type Props as TabsProps }
