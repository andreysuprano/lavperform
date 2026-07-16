import {
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Image,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiWhatsappLine } from 'react-icons/ri'

import { Props } from './HeroSection.types'

function HeroSectionBase({ hero, branding }: Props) {
  const titleParts = hero.title.split(hero.highlightWord)

  return (
    <Box
      bgImage={hero.backgroundImage ? `url(${hero.backgroundImage})` : undefined}
      bgPosition="center"
      bgRepeat="no-repeat"
      bgSize="cover"
      minH={{ base: '500px', md: '600px' }}
      position="relative"
    >
      {/* Overlay escuro para melhorar legibilidade */}
      <Box
        bg="blackAlpha.600"
        bottom={0}
        left={0}
        position="absolute"
        right={0}
        top={0}
      />

      <Container
        maxW="container.xl"
        position="relative"
        py={{ base: 12, md: 20 }}
        zIndex={1}
      >
        <VStack
          alignItems={{ base: 'flex-start', md: 'center' }}
          gap={6}
          textAlign={{ base: 'left', md: 'center' }}
        >
          <Heading
            color="white"
            fontSize={{ base: '3xl', md: '5xl' }}
            fontWeight="bold"
            lineHeight="1.2"
          >
            {titleParts[0]}
            <Text as="span" color="primary.400">
              {hero.highlightWord}
            </Text>
            {titleParts[1]}
          </Heading>

          <Text color="whiteAlpha.900" fontSize={{ base: 'lg', md: 'xl' }}>
            {hero.subtitle}
          </Text>

          <Stack
            direction={{ base: 'column', md: 'row' }}
            gap={4}
            mt={4}
            w={{ base: 'full', md: 'auto' }}
          >
            <HStack gap={2}>
              <Text color="whiteAlpha.800" fontSize="sm">
                {hero.hours.label}
              </Text>
            </HStack>
            <HStack gap={2}>
              <Text color="whiteAlpha.800" fontSize="sm">
                {hero.payment.label}
              </Text>
            </HStack>
          </Stack>

          <Button
            as="a"
            colorScheme="whatsapp"
            href={hero.ctaLink}
            leftIcon={<RiWhatsappLine />}
            size="lg"
            target="_blank"
          >
            {hero.ctaText}
          </Button>
        </VStack>
      </Container>
    </Box>
  )
}

const HeroSection = memo(HeroSectionBase) as typeof HeroSectionBase

export { HeroSection, type Props as HeroSectionProps }
