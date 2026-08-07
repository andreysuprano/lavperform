import {
  Box,
  Button,
  Card,
  HStack,
  Icon,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'
import { FaWhatsapp } from 'react-icons/fa'

import { getPreviewBrandColors } from '../../shared'

import { Props } from './CtaPreviewCard.types'

function CtaPreviewCardBase({ data, branding }: Props) {
  const colors = getPreviewBrandColors(branding)

  return (
    <Card.Root
      overflow="hidden"
      position={{ base: 'relative', lg: 'sticky' }}
      top={{ base: 0, lg: 6 }}
      variant="elevated"
    >
      <Box
        p={4}
        style={{
          backgroundImage: `linear-gradient(${colors.tertiary}, ${colors.secondary})`,
        }}
      >
        <Stack
          bg="whiteAlpha.50"
          borderRadius="xl"
          gap={4}
          p={5}
          shadow="lg"
        >
          <Stack gap={2}>
            <Text color="white" fontSize="xl" fontWeight="bold" lineHeight="shorter">
              {data.title || 'Pronto para Experimentar?'}
            </Text>
            {data.description ? (
              <Text color="whiteAlpha.900" fontSize="sm">
                {data.description}
              </Text>
            ) : null}
          </Stack>

          <Button
            bg="white"
            pointerEvents="none"
            rounded="full"
            size="md"
            style={{ color: colors.primary }}
            w="full"
          >
            <HStack gap={2}>
              <Icon as={FaWhatsapp} />
              <Text fontWeight="bold">
                {data.buttonText || 'Solicitar Atendimento'}
              </Text>
            </HStack>
          </Button>
        </Stack>
      </Box>
    </Card.Root>
  )
}

const CtaPreviewCard = memo(CtaPreviewCardBase) as typeof CtaPreviewCardBase

export { CtaPreviewCard, type Props as CtaPreviewCardProps }
