import { Box, Card, Flex } from '@chakra-ui/react'

import { DashboardWelcomeCard } from '@/components'
import { useWhiteLabel } from '@/config'
import { useAuth } from '@/context/AuthContext'
import { ACADEMY_MENU_ITEM } from '@/utils/constants/appMenuLinks'

export function DashboardWelcome() {
  const { colors, texts } = useWhiteLabel()

  const { user } = useAuth()

  return (
    <Flex
      flexDirection={{ base: 'column', lg: 'row' }}
      gap={4}
    >
      <DashboardWelcomeCard>
        <Card.Title
          color={{ base: 'fg.inverted', _dark: 'fg' }}
          fontSize="3xl"
          textAlign="center"
        >
          Bem vindo de volta,{'\n'}
          <Box
            as="span"
            color={colors.primary}
            fontWeight="bold"
          >
            {user?.userName}
          </Box>
          !
        </Card.Title>
      </DashboardWelcomeCard>
      <DashboardWelcomeCard href={ACADEMY_MENU_ITEM.href}>
        <Card.Title
          color={{ base: 'fg.inverted', _dark: 'fg' }}
          fontSize={{ base: 'lg', md: '2xl' }}
          textAlign="center"
        >
          Aprenda como performar com{'\n'}
          <Box
            as="span"
            color={colors.primary}
            fontWeight="bold"
          >
            {texts.appShortName}
          </Box>
          !
        </Card.Title>
        <Card.Description
          color={{ base: 'fg.subtle', _dark: 'fg.muted' }}
          fontSize={{ base: 'md', lg: 'lg' }}
          textAlign="center"
        >
          Conheça a Academy e entenda como vender muito mais todos os meses!
        </Card.Description>
      </DashboardWelcomeCard>
    </Flex>
  )
}
