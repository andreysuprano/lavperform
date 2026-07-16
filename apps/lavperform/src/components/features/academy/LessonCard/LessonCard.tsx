import { Box, Button, Flex, Heading, Image, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { RiFileTextLine, RiVideoLine } from 'react-icons/ri'

import { useWhiteLabel } from '@/config'

import type { Props } from './LessonCard.types'

function LessonCardBase({
  lesson,
  lessonNumber,
  isActive = false,
  onClick,
  showThumbnail = true,
}: Props) {
  const { colorPalette } = useWhiteLabel()

  return (
    <Button
      _hover={{
        bg: `${colorPalette}.200`,
        _dark: { bg: `${colorPalette}.800` },
      }}
      as={Box}
      bg={{
        base: isActive ? `${colorPalette}.100` : 'bg.panel',
        _dark: isActive ? `${colorPalette}.900` : 'bg.panel',
      }}
      colorPalette={colorPalette}
      h="auto"
      onClick={onClick}
      p={3}
      variant="surface"
      width="100%"
    >
      <Flex
        alignItems="start"
        flexDirection={{ base: 'column', lg: 'row' }}
        gap={3}
      >
        {showThumbnail && lesson.thumbnailUrl && (
          <Image
            alt={lesson.title}
            borderRadius="md"
            flexShrink={0}
            h="60px"
            objectFit="cover"
            src={lesson.thumbnailUrl}
            w="100px"
          />
        )}
        <Box flex={1}>
          <Flex
            alignItems="center"
            gap={2}
            mb={1}
          >
            <Box flexShrink={0}>
              <RiVideoLine />
            </Box>
            <Heading
              fontWeight="bold"
              lineClamp={2}
              size="sm"
            >
              Aula {lessonNumber}: {lesson.title}
            </Heading>
          </Flex>
          {lesson.description && (
            <Text
              color="fg.muted"
              fontSize="sm"
              lineClamp={3}
              mt={1}
            >
              {lesson.description}
            </Text>
          )}
          {lesson.lessonFiles && lesson.lessonFiles.length > 0 && (
            <Flex
              alignItems="center"
              gap={2}
              mt={2}
            >
              <RiFileTextLine size={14} />
              <Text
                color="fg.muted"
                fontSize="xs"
              >
                {lesson.lessonFiles.length}{' '}
                {lesson.lessonFiles.length === 1 ? 'arquivo' : 'arquivos'}{' '}
                disponível{lesson.lessonFiles.length === 1 ? '' : 'is'}
              </Text>
            </Flex>
          )}
        </Box>
      </Flex>
    </Button>
  )
}

const LessonCard = memo(LessonCardBase) as typeof LessonCardBase

export { LessonCard, type Props as LessonCardProps }
