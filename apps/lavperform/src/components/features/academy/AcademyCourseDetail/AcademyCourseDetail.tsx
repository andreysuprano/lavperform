import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Image,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { RiArrowLeftLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'

import { Empty, LoadingState, ModuleAccordion } from '@/components'
import { useWhiteLabel } from '@/config'
import { useCourse } from '@/hooks/queries'

import type { Props } from './AcademyCourseDetail.types'

function AcademyCourseDetail({ courseId }: Props) {
  const { colorPalette } = useWhiteLabel()

  const navigate = useNavigate()
  const { data: course, isLoading } = useCourse(courseId)

  const totalLessons = useMemo(() => {
    if (!course?.modules) return 0
    return course.modules.reduce(
      (acc, module) => acc + (module.lessons?.length || 0),
      0
    )
  }, [course?.modules])

  const firstLesson = useMemo(() => {
    if (!course?.modules || course.modules.length === 0) return null
    const firstModule = [...course.modules].sort((a, b) => a.order - b.order)[0]
    if (!firstModule.lessons || firstModule.lessons.length === 0) return null
    return firstModule.lessons[0]
  }, [course?.modules])

  const handleStartCourse = useCallback(() => {
    if (firstLesson) {
      navigate(`/academy/${courseId}/lesson/${firstLesson.id}`)
    }
  }, [firstLesson, courseId, navigate])

  const handleLessonClick = useCallback(
    (lessonId: string) => {
      navigate(`/academy/${courseId}/lesson/${lessonId}`)
    },
    [courseId, navigate]
  )

  const handleBackClick = useCallback(() => {
    navigate('/academy')
  }, [navigate])

  if (isLoading) {
    return <LoadingState />
  }

  if (!course) {
    return (
      <Empty
        description="O curso solicitado não foi encontrado."
        title="Curso não encontrado"
      />
    )
  }

  return (
    <Stack gap={6}>
      {/* Botão Voltar */}
      <Box>
        <Button
          onClick={handleBackClick}
          size="sm"
          variant="outline"
        >
          <RiArrowLeftLine />
          Voltar para cursos
        </Button>
      </Box>

      <Grid
        gap={6}
        templateColumns={{ base: '1fr', xl: '2fr 1fr' }}
      >
        <Stack gap={6}>
          {course.bannerUrl && (
            <Box
              bg="bg.muted"
              borderRadius="md"
              overflow="hidden"
            >
              <Image
                alt={course.title}
                h="400px"
                objectFit="cover"
                src={course.bannerUrl}
                w="100%"
              />
            </Box>
          )}

          <Stack
            flex={2}
            gap={3}
            maxW="3xl"
          >
            <Heading size="xl">{course.title}</Heading>
            <Text
              color="fg.muted"
              fontSize="md"
            >
              {course.description}
            </Text>
            <Flex
              flexWrap="wrap"
              gap={2}
            >
              {course.modules && (
                <>
                  <Badge
                    colorPalette="green"
                    variant="surface"
                  >
                    {course.modules.length}{' '}
                    {course.modules.length === 1 ? 'Módulo' : 'Módulos'}
                  </Badge>
                  <Badge
                    colorPalette={colorPalette}
                    variant="surface"
                  >
                    {totalLessons} {totalLessons === 1 ? 'Aula' : 'Aulas'}
                  </Badge>
                </>
              )}
            </Flex>
            {firstLesson && (
              <Box flex={1}>
                <Button
                  colorPalette={colorPalette}
                  onClick={handleStartCourse}
                  size="lg"
                  variant="solid"
                >
                  Iniciar Curso
                </Button>
              </Box>
            )}
          </Stack>
        </Stack>
        {course.modules && course.modules.length > 0 && (
          <Card.Root size="sm">
            <Card.Header>
              <Heading size="lg">Conteúdo do Curso</Heading>
            </Card.Header>
            <Card.Body overflowY="auto">
              <ModuleAccordion
                defaultOpenModule={course.modules[0]?.id}
                modules={course.modules}
                onLessonClick={handleLessonClick}
              />
            </Card.Body>
          </Card.Root>
        )}
      </Grid>
    </Stack>
  )
}

export { AcademyCourseDetail, type Props as AcademyCourseDetailProps }
