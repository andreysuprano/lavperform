import { Bleed, HStack } from '@chakra-ui/react'
import useEmblaCarousel from 'embla-carousel-react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { CourseCard, Empty, LoadingState } from '@/components'
import { useAllCourses } from '@/hooks/queries'

function AcademyCourseList() {
  const [emblaRef] = useEmblaCarousel({})
  const navigate = useNavigate()
  const { data: courses, isLoading } = useAllCourses()

  const handleViewCourse = useCallback(
    (courseId: string) => {
      navigate(`/academy/${courseId}`)
    },
    [navigate]
  )

  if (isLoading) {
    return <LoadingState />
  }

  if (!courses || courses.length === 0) {
    return (
      <Empty
        description="Não há cursos cadastrados no momento. Volte mais tarde!"
        title="Nenhum curso disponível"
      />
    )
  }

  return (
    <Bleed
      className="embla"
      inline={{ base: '4', md: '6' }}
      ref={emblaRef}
    >
      <HStack
        alignItems="stretch"
        className="embla__container"
        py={2}
      >
        {courses.map((course) => (
          <CourseCard
            course={course}
            key={course.id}
            onViewCourse={handleViewCourse}
          />
        ))}
      </HStack>
    </Bleed>
  )
}

export { AcademyCourseList }
