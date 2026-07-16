import {
  Box,
  Button,
  Card,
  HStack,
  Icon,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'

import { useWhiteLabel } from '@/config'
import { OPEN_API_DOCS } from '@/utils/constants/appMenuLinks'

type Props = {
  onCtaClick?: () => void
}

function OpenApiDocsCardBase({ onCtaClick }: Props) {
  const { colors, colorPalette } = useWhiteLabel()
  const { icon, label, description, ctaLabel, href } = OPEN_API_DOCS

  return (
    <Card.Root
      overflow="hidden"
      position="relative"
      style={{
        background: '#000',
        border: `1px solid ${colors.primary}40`,
      }}
      w="full"
    >
      <Card.Body px={{ base: 4, md: 6 }} py={4}>
        <HStack
          align="center"
          gap={4}
          justify="space-between"
          wrap="wrap"
        >
          <HStack
            flex={1}
            gap={3}
            minW={{ base: 'full', md: 'auto' }}
          >
            <Box
              borderRadius="lg"
              flexShrink={0}
              lineHeight={0}
              p={2.5}
              style={{
                background: `${colors.primary}25`,
                border: `1px solid ${colors.primary}40`,
              }}
            >
              <Icon
                as={icon}
                color={colors.primary}
                size="md"
              />
            </Box>
            <VStack
              align="flex-start"
              gap={0.5}
            >
              <Text
                color="white"
                fontSize={{ base: 'md', md: 'lg' }}
                fontWeight="bold"
                lineHeight="short"
              >
                {label}
              </Text>
              <Text
                color="whiteAlpha.700"
                fontSize={{ base: 'sm', md: 'md' }}
                lineHeight="short"
              >
                {description}
              </Text>
            </VStack>
          </HStack>

          <Button
            colorPalette={colorPalette}
            flexShrink={0}
            size={{ base: 'sm', md: 'md' }}
            transition="opacity 0.2s ease, transform 0.2s ease"
            variant="solid"
            w={{ base: 'full', md: 'auto' }}
            _hover={{
              opacity: 0.9,
              transform: 'scale(1.02)',
            }}
            {...(onCtaClick
              ? {
                  onClick: onCtaClick,
                  type: 'button' as const,
                }
              : {
                  asChild: true,
                })}
          >
            {onCtaClick ? (
              ctaLabel
            ) : (
              <Link
                aria-label="Acessar a documentação da API Aberta"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
                textDecoration="none"
                _hover={{ textDecoration: 'none' }}
              >
                {ctaLabel}
              </Link>
            )}
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}

const OpenApiDocsCard = memo(OpenApiDocsCardBase)

export { OpenApiDocsCard }
