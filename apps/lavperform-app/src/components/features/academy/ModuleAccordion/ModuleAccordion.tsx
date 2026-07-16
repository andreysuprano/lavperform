import {
  Accordion,
  Badge,
  Box,
  Flex,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo } from 'react'

import { LessonCard } from '@/components'
import { useWhiteLabel } from '@/config'
import type { Lesson } from '@/types'

import type { Props } from './ModuleAccordion.types'

function ModuleAccordionBase({
  modules,
  currentLessonId,
  onLessonClick,
  defaultOpenModule,
}: Props) {
  const { colorPalette } = useWhiteLabel()

  const sortedModules = [...modules].sort((a, b) => a.order - b.order)

  return (
    <Accordion.Root
      collapsible
      defaultValue={defaultOpenModule ? [defaultOpenModule] : undefined}
      variant="enclosed"
    >
      {sortedModules.map((module, moduleIndex) => (
        <Accordion.Item
          key={module.id}
          value={module.id}
        >
          <Accordion.ItemTrigger
            cursor="pointer"
            px={4}
            py={3}
          >
            <Flex
              alignItems="flex-start"
              flex={1}
              gap={3}
              justifyContent="space-between"
            >
              <Flex
                alignItems="flex-start"
                gap={3}
              >
                <Badge
                  colorPalette={colorPalette}
                  variant="solid"
                >
                  {moduleIndex + 1}
                </Badge>
                <Box textAlign="left">
                  <Heading
                    lineClamp={2}
                    size="sm"
                  >
                    {module.title}
                  </Heading>
                  {module.description && (
                    <Text
                      color="fg.muted"
                      fontSize="sm"
                      lineClamp={2}
                    >
                      {module.description}
                    </Text>
                  )}
                </Box>
              </Flex>
              <Badge
                colorPalette="green"
                variant="surface"
              >
                {module.lessons?.length || 0}{' '}
                {module.lessons?.length === 1 ? 'aula' : 'aulas'}
              </Badge>
            </Flex>
          </Accordion.ItemTrigger>
          <Accordion.ItemContent p={4}>
            <Stack gap={3}>
              {module.lessons && module.lessons.length > 0 ? (
                module.lessons.map((lesson: Lesson, lessonIndex: number) => (
                  <LessonCard
                    isActive={currentLessonId === lesson.id}
                    key={lesson.id}
                    lesson={lesson}
                    lessonNumber={lessonIndex + 1}
                    onClick={() => onLessonClick(lesson.id)}
                  />
                ))
              ) : (
                <Text
                  color="fg.muted"
                  fontSize="sm"
                >
                  Nenhuma aula disponível neste módulo.
                </Text>
              )}
            </Stack>
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}

const ModuleAccordion = memo(ModuleAccordionBase) as typeof ModuleAccordionBase

export { ModuleAccordion, type Props as ModuleAccordionProps }
