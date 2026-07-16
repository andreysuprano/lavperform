import {
  Box,
  Card,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { memo } from 'react'
import { RiStarFill } from 'react-icons/ri'

import { Carousel } from '@/components/common'
import type { CarouselItem } from '@/components/common/Carousel/Carousel.types'

import { Props } from './TestimonialsSection.types'

interface TestimonialCarouselItem extends CarouselItem {
  quote: string
  author: string
}

function TestimonialsSectionBase({ testimonials }: Props) {
  const carouselItems: TestimonialCarouselItem[] = testimonials.items.map(
    (item, index) => ({
      id: `testimonial-${index}`,
      quote: item.quote,
      author: item.author,
      order: index,
    })
  )

  return (
    <Box bg="bg" id="avaliacoes" py={{ base: 12, md: 20 }}>
      <Container maxW="container.xl">
        <VStack gap={8}>
          <VStack gap={4} textAlign="center">
            <Heading fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold">
              {testimonials.title}
            </Heading>
            <Text color="fg.muted" fontSize={{ base: 'md', md: 'lg' }} maxW="2xl">
              {testimonials.description}
            </Text>
          </VStack>

          <Box maxW="4xl" w="full">
            <Carousel
              autoPlayInterval={5000}
              height={{ base: '250px', md: '300px' }}
              items={carouselItems}
              renderItem={(item) => (
                <Card.Root h="full">
                  <Card.Body p={6}>
                    <VStack alignItems="flex-start" gap={4} h="full">
                      <Stack direction="row" gap={1}>
                        {[...Array(5)].map((_, i) => (
                          <Box color="yellow.400" key={i}>
                            <RiStarFill />
                          </Box>
                        ))}
                      </Stack>
                      <Text
                        flex={1}
                        fontSize={{ base: 'md', md: 'lg' }}
                        fontStyle="italic"
                        lineHeight="1.8"
                      >
                        "{item.quote}"
                      </Text>
                      <Text
                        color="fg.muted"
                        fontSize="sm"
                        fontWeight="semibold"
                      >
                          {item.author}
                      </Text>
                    </VStack>
                  </Card.Body>
                </Card.Root>
              )}
              showControls
              showIndicators
            />
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}

const TestimonialsSection = memo(
  TestimonialsSectionBase
) as typeof TestimonialsSectionBase

export { TestimonialsSection, type Props as TestimonialsSectionProps }
