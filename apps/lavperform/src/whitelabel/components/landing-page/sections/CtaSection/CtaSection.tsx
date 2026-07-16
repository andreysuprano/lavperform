import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiWhatsappLine } from 'react-icons/ri'

import { Props } from './CtaSection.types'

function CtaSectionBase({ cta }: Props) {
  const whatsappLink = `https://wa.me/${cta.whatsappNumber}`

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
            as="a"
            bg="white"
            color="primary.500"
            href={whatsappLink}
            leftIcon={<RiWhatsappLine />}
            size="lg"
            target="_blank"
            _hover={{ bg: 'whiteAlpha.900' }}
          >
            {cta.buttonText}
          </Button>
        </VStack>
      </Container>
    </Box>
  )
}

const CtaSection = memo(CtaSectionBase) as typeof CtaSectionBase

export { CtaSection, type Props as CtaSectionProps }
