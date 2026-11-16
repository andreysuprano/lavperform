import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiWhatsappLine } from 'react-icons/ri'

import { buildWhatsappUrl } from '@/whitelabel/utils'

import { Props } from './CtaSection.types'

function CtaSectionBase({ cta }: Props) {
  const whatsappLink =
    buildWhatsappUrl(cta.whatsappNumber, cta.whatsappMessage) ??
    `https://wa.me/${cta.whatsappNumber}`

  return (
    <Box bg="primary.500" py={{ base: 12, md: 20 }}>
      <Container maxW="container.xl">
        <VStack gap={6} textAlign="center">
          <Heading
            color="white"
            fontSize={{ base: '2xl', md: '4xl' }}
            fontWeight="bold"
          >
            {cta.title}
          </Heading>
          <Text
            color="whiteAlpha.900"
            fontSize={{ base: 'md', md: 'lg' }}
            maxW="2xl"
          >
            {cta.description}
          </Text>
          <Button
            asChild
            bg="white"
            color="primary.500"
            size="lg"
            _hover={{ bg: 'whiteAlpha.900' }}
          >
            <a href={whatsappLink} rel="noopener noreferrer" target="_blank">
              <RiWhatsappLine />
              {cta.buttonText}
            </a>
          </Button>
        </VStack>
      </Container>
    </Box>
  )
}

const CtaSection = memo(CtaSectionBase) as typeof CtaSectionBase

export { CtaSection, type Props as CtaSectionProps }
