import {
  Box,
  Container,
  HStack,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiMapPinLine } from 'react-icons/ri'

import { Props } from './FooterSection.types'

function FooterSectionBase({ footer }: Props) {
  return (
    <Box bg="bg.emphasized" borderTopWidth="1px" py={{ base: 8, md: 12 }}>
      <Container maxW="container.xl">
        <Stack
          direction={{ base: 'column', md: 'row' }}
          gap={8}
          justifyContent="space-between"
        >
          <VStack alignItems={{ base: 'center', md: 'flex-start' }} gap={2}>
            <Text color="fg.muted" fontSize="sm" textAlign={{ base: 'center', md: 'left' }}>
              {footer.description}
            </Text>
          </VStack>

          <VStack alignItems={{ base: 'center', md: 'flex-end' }} gap={2}>
            <Text fontWeight="semibold">{footer.locationTitle}</Text>
            <HStack gap={2}>
              <Box color="fg.muted">
                <RiMapPinLine />
              </Box>
              <Text color="fg.muted" fontSize="sm" textAlign={{ base: 'center', md: 'right' }}>
                {footer.address}
              </Text>
            </HStack>
          </VStack>
        </Stack>

        <Box
          borderTopWidth="1px"
          mt={8}
          pt={6}
          textAlign="center"
        >
          <Text color="fg.muted" fontSize="xs">
            {footer.copyright}
          </Text>
        </Box>
      </Container>
    </Box>
  )
}

const FooterSection = memo(FooterSectionBase) as typeof FooterSectionBase

export { FooterSection, type Props as FooterSectionProps }
