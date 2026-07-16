import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { RiArrowLeftLine, RiFileTextLine } from 'react-icons/ri'
import { useNavigate } from 'react-router-dom'

import { LoadingState, ModuleAccordion, YouTubePlayer } from '@/components'
import { useWhiteLabel } from '@/config'
import { useCourse } from '@/hooks/queries'
import type { Lesson, Module } from '@/types'
import { getYouTubeEmbedUrl } from '@/utils/youtube'

import type { Props } from './AcademyLessonPlayer.types'

function AcademyLessonPlayer({ courseId, lessonId }: Props) {
  const { colorPalette } = useWhiteLabel()

  const navigate = useNavigate()
  const { data: course, isLoading } = useCourse(courseId)

  const currentLesson = useMemo((): Lesson | null => {
    if (!lessonId || !course?.modules) return null

    for (const module of course.modules) {
      const lesson = module.lessons?.find((l) => l.id === lessonId)
      if (lesson) return lesson
    }

    return null
  }, [lessonId, course?.modules])

  const currentModule = useMemo((): Module | null => {
    if (!lessonId || !course?.modules) return null

    for (const module of course.modules) {
      if (module.lessons?.some((l) => l.id === lessonId)) {
        return module
      }
    }

    return null
  }, [lessonId, course?.modules])

  const handleLessonClick = useCallback(
    (newLessonId: string) => {
      navigate(`/academy/${courseId}/lesson/${newLessonId}`)
    },
    [courseId, navigate]
  )

  const handleBackClick = useCallback(() => {
    navigate(`/academy/${courseId}`)
  }, [courseId, navigate])

  const embedUrl = useMemo(
    () =>
      currentLesson?.videoUrl
        ? getYouTubeEmbedUrl(currentLesson.videoUrl)
        : null,
    [currentLesson?.videoUrl]
  )

  if (isLoading) {
    return <LoadingState />
  }

  if (!course) {
    return <Text>O curso solicitado não foi encontrado.</Text>
  }

  if (!currentLesson) {
    return <Text>A aula solicitada não foi encontrada.</Text>
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
          Voltar para o curso
        </Button>
      </Box>

      <Grid
        gap={6}
        templateColumns={{ base: '1fr', xl: '2fr 1fr' }}
      >
        {/* Coluna Esquerda - Vídeo e Detalhes da Aula */}
        <Stack gap={6}>
          {/* Vídeo da Aula */}
          {embedUrl && (
            <YouTubePlayer
              title={currentLesson.title}
              videoUrl={embedUrl}
            />
          )}

          {/* Detalhes da Aula */}
          <Stack
            gap={3}
            maxW="3xl"
          >
            <Heading size="xl">{currentLesson.title}</Heading>
            {currentModule && (
              <Badge
                colorPalette={colorPalette}
                variant="surface"
                width="fit-content"
              >
                {currentModule.title}
              </Badge>
            )}
            {currentLesson.description && (
              <Text
                color="fg.muted"
                fontSize="md"
              >
                {currentLesson.description}
              </Text>
            )}

            {/* Arquivos da Aula */}
            {currentLesson.lessonFiles &&
              currentLesson.lessonFiles.length > 0 && (
                <Card.Root size="sm">
                  <Card.Header>
                    <Heading size="md">Materiais da Aula</Heading>
                  </Card.Header>
                  <Card.Body>
                    <Stack gap={2}>
                      {currentLesson.lessonFiles.map((file) => (
                        <Box
                          _hover={{
                            bg: 'bg.muted',
                            textDecoration: 'none',
                          }}
                          asChild
                          borderColor="border"
                          borderRadius="md"
                          borderWidth={1}
                          key={file.id}
                          p={3}
                        >
                          <a
                            href={file.fileUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <Flex
                              alignItems="center"
                              gap={2}
                            >
                              <RiFileTextLine size={20} />
                              <Text fontSize="sm">{file.name}</Text>
                            </Flex>
                          </a>
                        </Box>
                      ))}
                    </Stack>
                  </Card.Body>
                </Card.Root>
              )}
          </Stack>
        </Stack>

        {/* Coluna Direita - Conteúdo do Curso */}
        {course.modules && course.modules.length > 0 && (
          <Card.Root
            size="sm"
            top={0}
          >
            <Card.Header>
              <Heading size="lg">Conteúdo do Curso</Heading>
            </Card.Header>
            <Card.Body overflowY="auto">
              <ModuleAccordion
                currentLessonId={currentLesson.id}
                defaultOpenModule={currentModule?.id}
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

export { AcademyLessonPlayer, type Props as AcademyLessonPlayerProps }
