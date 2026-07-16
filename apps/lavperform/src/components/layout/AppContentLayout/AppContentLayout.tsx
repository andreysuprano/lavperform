import { Flex, Heading, Icon, Stack } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from '../AppContentLayout/AppContentLayout.types'

function AppContentLayoutBase({ action, children, icon, title }: Props) {
  return (
    <Stack gap={4}>
      <Flex
        alignItems="center"
        flexWrap="wrap"
        gap={3}
        w="full"
      >
        <Heading
          fontWeight="bold"
          size="2xl"
        >
          <Flex
            alignItems="center"
            gap="2"
          >
            <Icon
              boxSize={6}
              color="fg"
            >
              {icon}
            </Icon>
            {title}
          </Flex>
        </Heading>
        {action}
      </Flex>
      {children}
    </Stack>
  )
}

const AppContentLayout = memo(
  AppContentLayoutBase
) as typeof AppContentLayoutBase

export { AppContentLayout, type Props as AppContentLayoutProps }
