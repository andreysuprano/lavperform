import { Box, Container, Flex, HStack, Image, Link } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './Navigation.types'

function NavigationBase({ navigation, branding }: Props) {
  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <Box
      bg="bg"
      borderBottomWidth="1px"
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Container maxW="container.xl" py={4}>
        <Flex alignItems="center" justifyContent="space-between">
          <HStack gap={4}>
            {branding.logo && (
              <Image
                alt={branding.name}
                h="40px"
                objectFit="contain"
                src={branding.logo}
              />
            )}
            <Box fontWeight="bold" fontSize="xl">
              {branding.name}
            </Box>
          </HStack>

          <HStack gap={6} display={{ base: 'none', md: 'flex' }}>
            {navigation.map((item) => (
              <Link
                key={item.href}
                _hover={{ color: 'primary.500' }}
                color="fg"
                cursor="pointer"
                onClick={() => handleNavClick(item.href)}
                textDecoration="none"
              >
                {item.label}
              </Link>
            ))}
          </HStack>
        </Flex>
      </Container>
    </Box>
  )
}

const Navigation = memo(NavigationBase) as typeof NavigationBase

export { Navigation, type Props as NavigationProps }
