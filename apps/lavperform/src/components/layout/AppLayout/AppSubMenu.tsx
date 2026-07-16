import { Circle, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

import { useWhiteLabel } from '@/config'
import { getLongestPrefixLinkMatch } from '@/utils/menuActiveMatch'

import { PropsSubmenu } from './AppLayout.types'

function AppSubMenuBase({ currentMenuItem, location }: PropsSubmenu) {
  const { colors } = useWhiteLabel()
  const activeSublink = getLongestPrefixLinkMatch(
    currentMenuItem?.links,
    location.pathname
  )

  return (
    <>
      {currentMenuItem?.links && (
        <VStack
          bg="bg"
          borderRightWidth={1}
          display={{ base: 'none', lg: 'flex' }}
          gap={1}
          h={'calc(100vh - 64px)'}
          left={0}
          minW={'260px'}
          position="sticky"
          px={2}
          py={4}
          top={'64px'}
          w={'260px'}
        >
          <HStack
            alignItems="flex-start"
            bg="bg.muted"
            mb={2}
            p={2}
            w="full"
          >
            <Circle
              boxSize={10}
              size={6}
            >
              <Icon as={currentMenuItem.icon} />
            </Circle>
            <Text
              fontWeight="bold"
              textAlign="left"
              w="full"
            >
              {currentMenuItem.label}
            </Text>
          </HStack>
          {currentMenuItem.links.map((link) => (
            <HStack
              _hover={{
                layerStyle: 'fill.subtle',
                bg: colors.primary,
                textDecor: 'none',
                color: { base: 'fg.primary', _dark: 'gray.900' },
              }}
              alignItems="center"
              bg={
                activeSublink?.href === link.href
                  ? colors.primary
                  : 'transparent'
              }
              borderRadius={'lg'}
              color={
                activeSublink?.href === link.href ? 'gray.900' : 'inherit'
              }
              key={link.href}
              px={2}
              py={1}
              w={'full'}
            >
              <NavLink
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  height: '2.5rem',
                  width: '100%',
                  textDecoration: 'none',
                }}
                to={link.href}
              >
                <Circle
                  boxSize={10}
                  size={6}
                >
                  <Icon as={link.icon} />
                </Circle>
                <Text
                  fontSize={'sm'}
                  fontWeight={'medium'}
                >
                  {link.label}
                </Text>
              </NavLink>
            </HStack>
          ))}
        </VStack>
      )}
    </>
  )
}

const AppSubMenu = memo(AppSubMenuBase) as typeof AppSubMenuBase

export { AppSubMenu }
