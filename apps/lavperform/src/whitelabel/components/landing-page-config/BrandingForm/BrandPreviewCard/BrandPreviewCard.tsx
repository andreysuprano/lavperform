import { Avatar, Card, Stack, Text } from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './BrandPreviewCard.types'

function BrandPreviewCardBase({ logo, name, slogan }: Props) {
  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card.Root
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ base: 0, lg: 6 }}
      variant="elevated"
    >
      <Card.Body
        alignItems="center"
        display="flex"
        flexDirection="column"
        gap={4}
        py={8}
      >
        <Avatar.Root size="xl">
          {logo ? (
            <Avatar.Image
              alt={name}
              src={logo}
            />
          ) : null}
          <Avatar.Fallback
            bg="primary"
            color="white"
            fontSize="2xl"
            fontWeight="bold"
          >
            {name ? getInitials(name) : 'LO'}
          </Avatar.Fallback>
        </Avatar.Root>

        <Stack
          gap={1}
          textAlign="center"
        >
          <Text
            fontSize="lg"
            fontWeight="semibold"
          >
            {name || 'Nome da marca'}
          </Text>
          {slogan && (
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              {slogan}
            </Text>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

const BrandPreviewCard = memo(BrandPreviewCardBase) as typeof BrandPreviewCardBase

export { BrandPreviewCard, type Props as BrandPreviewCardProps }
