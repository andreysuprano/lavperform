import { Card, Flex } from '@chakra-ui/react'
import { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

export function DashboardWelcomeCard({
  children,
  href = '',
}: PropsWithChildren<{ href?: string }>) {
  return (
    <Flex
      as={href ? Link : 'div'}
      flex={1}
      {...(href ? { to: href } : {})}
    >
      <Card.Root
        bg={{ base: 'bg.inverted', _dark: 'bg.panel' }}
        flex={1}
        minH={220}
        py={6}
      >
        <Card.Body
          alignItems="center"
          gap={2}
          justifyContent="center"
        >
          {children}
        </Card.Body>
      </Card.Root>
    </Flex>
  )
}
