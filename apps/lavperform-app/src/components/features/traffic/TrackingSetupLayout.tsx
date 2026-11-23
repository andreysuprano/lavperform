import { Card, Flex, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export type TrackingGuideGroup = {
  title: string
  steps: ReactNode[]
}

type GuideProps = {
  title: string
  groups: TrackingGuideGroup[]
}

type LayoutProps = {
  intro: string
  form: ReactNode
  guide: GuideProps
}

function TrackingGuide({ title, groups }: GuideProps) {
  const offsets = groups.reduce<number[]>((acc, _group, index) => {
    acc.push(index === 0 ? 0 : acc[index - 1] + groups[index - 1].steps.length)
    return acc
  }, [])

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Body>
        <Stack gap={6}>
          {groups.map((group, groupIndex) => (
            <Stack
              gap={3}
              key={group.title}
            >
              <Text
                fontSize="sm"
                fontWeight="semibold"
              >
                {group.title}
              </Text>
              <Stack
                as="ol"
                gap={3}
                listStyle="none"
                m={0}
                p={0}
              >
                {group.steps.map((step, stepIndex) => (
                  <Flex
                    as="li"
                    gap={3}
                    key={stepIndex}
                  >
                    <Flex
                      align="center"
                      bg="bg.muted"
                      borderRadius="full"
                      borderWidth="1px"
                      boxSize={6}
                      color="fg.muted"
                      flexShrink={0}
                      fontSize="xs"
                      fontWeight="semibold"
                      justify="center"
                    >
                      {offsets[groupIndex] + stepIndex + 1}
                    </Flex>
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                      lineHeight="tall"
                    >
                      {step}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

function TrackingSetupLayout({ intro, form, guide }: LayoutProps) {
  return (
    <Stack gap={6}>
      <Text
        color="fg.muted"
        maxW="65ch"
      >
        {intro}
      </Text>
      <SimpleGrid
        alignItems="start"
        columns={{ base: 1, lg: 2 }}
        gap={6}
      >
        {form}
        <TrackingGuide {...guide} />
      </SimpleGrid>
    </Stack>
  )
}

export { TrackingGuide, TrackingSetupLayout }
