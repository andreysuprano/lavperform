import {
  Accordion,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Link,
  Separator,
  Stack,
  Text,
} from '@chakra-ui/react'
import { RiFileTextLine, RiVideoLine } from 'react-icons/ri'

import { CustomDrawer, LoadingState } from '@/components'
import { useWhiteLabel } from '@/config'
import { useCourse } from '@/hooks/queries'
import type { Lesson, Module } from '@/types'

import { CreateModuleForm } from '../CreateModuleForm/CreateModuleForm'

interface CourseDetailsDrawerProps {
  courseId: string
  onClose: () => void
}

export function CourseDetailsDrawer({
  courseId,
  onClose,
}: CourseDetailsDrawerProps) {
  const { colorPalette } = useWhiteLabel()

  const { data: course, isLoading } = useCourse(courseId)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalLessons = course?.modules?.reduce(
    (acc, module) => acc + (module.lessons?.length || 0),
    0
  )

  return (
    <CustomDrawer
      isOpen={true}
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      size="lg"
      title="Detalhes do Curso"
    >
      {isLoading ? (
        <LoadingState />
      ) : course ? (
        <Stack gap={6}>
          {/* Imagem de Capa */}
          {course.coverImageUrl && (
            <Box
              borderRadius="md"
              overflow="hidden"
            >
              <Image
                alt={course.title}
                h="200px"
                objectFit="contain"
                src={course.coverImageUrl}
                w="100%"
              />
            </Box>
          )}

          {/* Informações Básicas */}
          <Stack gap={3}>
            <Heading size="lg">{course.title}</Heading>
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
              <Badge
                colorPalette={colorPalette}
                variant="subtle"
              >
                Criado em: {formatDate(course.createdAt)}
              </Badge>
              {course.updatedAt !== course.createdAt && (
                <Badge
                  colorPalette="gray"
                  variant="subtle"
                >
                  Atualizado em: {formatDate(course.updatedAt)}
                </Badge>
              )}
              {course.modules && (
                <>
                  <Badge
                    colorPalette="green"
                    variant="solid"
                  >
                    {course.modules.length}{' '}
                    {course.modules.length === 1 ? 'Módulo' : 'Módulos'}
                  </Badge>
                  <Badge
                    colorPalette="purple"
                    variant="solid"
                  >
                    {totalLessons} {totalLessons === 1 ? 'Aula' : 'Aulas'}
                  </Badge>
                </>
              )}
            </Flex>
          </Stack>

          <Separator />

          {/* Módulos e Aulas */}
          <Stack gap={4}>
            <Flex
              alignItems="center"
              justifyContent="space-between"
            >
              <Heading size="md">Conteúdo do Curso</Heading>
              <CreateModuleForm courseId={courseId} />
            </Flex>

            {course.modules && course.modules.length > 0 ? (
              <Accordion.Root
                collapsible
                defaultValue={[course.modules[0]?.id]}
                multiple
              >
                {course.modules
                  .sort((a, b) => a.order - b.order)
                  .map((module: Module, moduleIndex: number) => (
                    <Accordion.Item
                      key={module.id}
                      value={module.id}
                    >
                      <Accordion.ItemTrigger
                        cursor="pointer"
                        p={4}
                      >
                        <Flex
                          alignItems="center"
                          gap={3}
                          w="100%"
                        >
                          <Badge
                            colorPalette="gray"
                            size="lg"
                            variant="solid"
                          >
                            {moduleIndex + 1}
                          </Badge>
                          <Stack
                            flex={1}
                            gap={1}
                          >
                            <Text
                              fontWeight="semibold"
                              textAlign="left"
                            >
                              {module.title}
                            </Text>
                            {module.description && (
                              <Text
                                color="fg.muted"
                                fontSize="sm"
                                textAlign="left"
                              >
                                {module.description}
                              </Text>
                            )}
                          </Stack>
                          <Flex
                            gap={2}
                            shrink={0}
                          >
                            <Badge
                              colorPalette="purple"
                              size="sm"
                            >
                              {module.lessons?.length || 0}{' '}
                              {module.lessons?.length === 1 ? 'aula' : 'aulas'}
                            </Badge>
                          </Flex>
                        </Flex>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent p={4}>
                        <Stack gap={3}>
                          {module.lessons && module.lessons.length > 0 ? (
                            <Stack gap={3}>
                              {module.lessons.map(
                                (lesson: Lesson, lessonIndex: number) => (
                                  <Box
                                    bg="bg.muted"
                                    borderColor="bg.emphasized"
                                    borderRadius="md"
                                    borderWidth="1px"
                                    key={lesson.id}
                                    p={4}
                                  >
                                    <Flex
                                      alignItems="start"
                                      gap={3}
                                    >
                                      <Badge
                                        colorPalette={colorPalette}
                                        size="sm"
                                        variant="solid"
                                      >
                                        {lessonIndex + 1}
                                      </Badge>
                                      <Stack
                                        flex={1}
                                        gap={2}
                                      >
                                        <Flex
                                          alignItems="start"
                                          gap={2}
                                        >
                                          <RiVideoLine
                                            size={20}
                                            style={{
                                              flexShrink: 0,
                                              marginTop: 2,
                                            }}
                                          />
                                          <Text
                                            fontSize="md"
                                            fontWeight="semibold"
                                          >
                                            {lesson.title}
                                          </Text>
                                        </Flex>
                                        {lesson.description && (
                                          <Text
                                            color="fg.muted"
                                            fontSize="sm"
                                          >
                                            {lesson.description}
                                          </Text>
                                        )}
                                        <Flex
                                          flexWrap="wrap"
                                          gap={2}
                                        >
                                          {lesson.videoUrl && (
                                            <Button
                                              asChild
                                              colorPalette={colorPalette}
                                              size="xs"
                                            >
                                              <Link
                                                href={lesson.videoUrl}
                                                target="_blank"
                                                unstyled
                                              >
                                                <RiVideoLine />
                                                Assistir vídeo
                                              </Link>
                                            </Button>
                                          )}
                                          {lesson.thumbnailUrl && (
                                            <Button
                                              asChild
                                              colorPalette="gray"
                                              size="xs"
                                              variant="surface"
                                            >
                                              <Link
                                                href={lesson.thumbnailUrl}
                                                target="_blank"
                                                unstyled
                                              >
                                                Ver thumbnail
                                              </Link>
                                            </Button>
                                          )}
                                        </Flex>

                                        {/* Arquivos da Aula */}
                                        {lesson.lessonFiles &&
                                          lesson.lessonFiles.length > 0 && (
                                            <Box
                                              bg="bg.emphasized"
                                              borderRadius="md"
                                              mt={2}
                                              p={3}
                                            >
                                              <Text
                                                color="fg.muted"
                                                fontSize="xs"
                                                fontWeight="semibold"
                                                mb={2}
                                                textTransform="uppercase"
                                              >
                                                📎 Materiais de apoio (
                                                {lesson.lessonFiles.length})
                                              </Text>
                                              <Stack gap={1}>
                                                {lesson.lessonFiles.map(
                                                  (file) => (
                                                    <Link
                                                      _hover={{
                                                        textDecoration:
                                                          'underline',
                                                      }}
                                                      color="blue.600"
                                                      display="flex"
                                                      fontSize="sm"
                                                      gap={2}
                                                      href={file.fileUrl}
                                                      key={file.id}
                                                      target="_blank"
                                                    >
                                                      <RiFileTextLine
                                                        size={16}
                                                      />
                                                      {file.name}
                                                    </Link>
                                                  )
                                                )}
                                              </Stack>
                                            </Box>
                                          )}

                                        {/* Metadados */}
                                        <Flex
                                          color="fg.muted"
                                          fontSize="xs"
                                          gap={3}
                                          mt={1}
                                        >
                                          <Text>
                                            Criado em:{' '}
                                            {formatDate(lesson.createdAt)}
                                          </Text>
                                          {lesson.updatedAt !==
                                            lesson.createdAt && (
                                            <Text>
                                              Atualizado em:{' '}
                                              {formatDate(lesson.updatedAt)}
                                            </Text>
                                          )}
                                        </Flex>
                                      </Stack>
                                    </Flex>
                                  </Box>
                                )
                              )}
                            </Stack>
                          ) : (
                            <Box
                              bg="bg.muted"
                              borderRadius="md"
                              p={4}
                              textAlign="center"
                            >
                              <Text
                                color="fg.muted"
                                fontSize="sm"
                              >
                                Nenhuma aula cadastrada neste módulo
                              </Text>
                            </Box>
                          )}
                        </Stack>
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  ))}
              </Accordion.Root>
            ) : (
              <Box
                bg="bg.muted"
                borderRadius="md"
                p={6}
                textAlign="center"
              >
                <Text
                  color="fg.muted"
                  mb={3}
                >
                  Este curso ainda não possui módulos cadastrados
                </Text>
                <CreateModuleForm courseId={courseId} />
              </Box>
            )}
          </Stack>
        </Stack>
      ) : (
        <Text>Curso não encontrado</Text>
      )}
    </CustomDrawer>
  )
}
