import { Flex, Heading, Icon, Stack } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from '../AppContentLayout/AppContentLayout.types'

function AppContentLayoutBase({
  action,
  children,
  icon,
  iconBg,
  title,
}: Props) {
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
            <Flex
              align="center"
              bg={iconBg}
              borderRadius="md"
              boxSize={iconBg ? 9 : undefined}
              justify="center"
            >
              <Icon
                boxSize={6}
                color={iconBg ? '#093A58' : 'fg'}
              >
                {icon}
              </Icon>
            </Flex>
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
