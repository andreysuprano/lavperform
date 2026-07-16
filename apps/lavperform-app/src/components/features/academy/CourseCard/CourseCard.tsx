import { Card, Image } from '@chakra-ui/react'
import { memo } from 'react'

import type { Props } from './CourseCard.types'

function CourseCardBase({ course, onViewCourse }: Props) {
  return (
    <Card.Root
      _hover={{
        cursor: 'pointer',
        filter: 'grayscale(0)',
        transform: 'scale(1.05)',
        zIndex: 100,
      }}
      bg="transparent"
      border="none"
      className="embla__slide"
      filter="grayscale(20%)"
      minW={{ base: '40%', md: '250px' }}
      mr={3}
      onClick={() => onViewCourse(course.id)}
      overflow="hidden"
      p={0}
      size="sm"
      transition="ease-in-out 150ms"
      variant="outline"
      w={{ base: '40%', md: '250px' }}
    >
      {course.coverImageUrl && (
        <Image
          alt={course.title}
          loading="lazy"
          objectFit="cover"
          src={course.coverImageUrl}
          w="100%"
        />
      )}
    </Card.Root>
  )
}

const CourseCard = memo(CourseCardBase) as typeof CourseCardBase

export { CourseCard, type Props as CourseCardProps }
