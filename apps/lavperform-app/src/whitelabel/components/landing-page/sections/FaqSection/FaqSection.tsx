import {
  Accordion,
  Box,
  Container,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'

import { Props } from './FaqSection.types'

function FaqSectionBase({ faq }: Props) {
  return (
    <Box bg="bg.subtle" id="faq" py={{ base: 12, md: 20 }}>
      <Container maxW="container.xl">
        <VStack gap={8}>
          <VStack gap={4} textAlign="center">
            <Heading fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold">
              {faq.title}
            </Heading>
            <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="2xl">
              {faq.description}
            </Text>
          </VStack>

          <Box maxW="3xl" w="full">
            <Accordion.Root collapsible variant="enclosed" w="full">
              {faq.items.map((item) => (
                <Accordion.Item key={item.value} value={item.value}>
                  <Accordion.ItemTrigger>
                    <Heading fontSize="md" fontWeight="semibold" textAlign="left">
                      {item.title}
                    </Heading>
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <Text
                      dangerouslySetInnerHTML={{ __html: item.text }}
                      fontSize="sm"
                      lineHeight="1.8"
                      whiteSpace="pre-wrap"
                    />
                  </Accordion.ItemContent>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}

const FaqSection = memo(FaqSectionBase) as typeof FaqSectionBase

export { FaqSection, type Props as FaqSectionProps }
