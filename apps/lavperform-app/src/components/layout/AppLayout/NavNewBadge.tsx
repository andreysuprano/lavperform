import { Badge } from '@chakra-ui/react'

interface Props {
  children: string
  fontSize?: string
  testId?: string
}

export function NavNewBadge({ children, fontSize = '11px', testId }: Props) {
  return (
    <Badge
      bg="navNewBadge"
      borderRadius="4px"
      color="white"
      data-testid={testId}
      fontSize={fontSize}
      fontWeight="semibold"
      px="6px"
      py="2px"
    >
      {children}
    </Badge>
  )
}
