import { Box, Card, Image, Stack, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'

import { getPreviewBrandColors } from '../../shared'

import { Props } from './FooterPreviewCard.types'

function FooterPreviewCardBase({ data, branding }: Props) {
  const colors = getPreviewBrandColors(branding)

  return (
    <Card.Root
      overflow="hidden"
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ base: 0, lg: 6 }}
      variant="elevated"
    >
      <Box color="white" p={6} style={{ background: colors.primary }}>
        <VStack gap={4} textAlign="center">
          <Stack align="center" direction="row" gap={3}>
            {branding?.logo ? (
              <Image
                alt={branding.name || 'Logo'}
                h="48px"
                maxW="140px"
                objectFit="contain"
                src={branding.logo}
              />
            ) : null}
            <Stack align="flex-start" gap={0}>
              <Text fontSize="lg" fontWeight="black">
                {branding?.name || 'Nome da marca'}
              </Text>
              {branding?.slogan ? (
                <Text fontSize="sm" opacity={0.95}>
                  {branding.slogan}
                </Text>
              ) : null}
            </Stack>
          </Stack>

          {data.description ? (
            <Text fontSize="sm" maxW="320px">
              {data.description}
            </Text>
          ) : null}

          <Stack gap={1}>
            {data.locationTitle ? (
              <Text fontSize="sm" fontWeight="bold">
                {data.locationTitle}
              </Text>
            ) : null}
            {data.address ? (
              <Text fontSize="xs" opacity={0.95}>
                {data.address}
              </Text>
            ) : null}
          </Stack>

          {data.copyright ? (
            <Text fontSize="xs" opacity={0.9}>
              {data.copyright}
            </Text>
          ) : null}
        </VStack>
      </Box>
    </Card.Root>
  )
}

const FooterPreviewCard = memo(
  FooterPreviewCardBase
) as typeof FooterPreviewCardBase

export { FooterPreviewCard, type Props as FooterPreviewCardProps }
