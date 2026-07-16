import { Flex, Input, Table, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  CourseDetailsDrawer,
  CreateCourseForm,
  CustomTable,
} from '@/components'
import { useAllCourses } from '@/hooks/queries'
import type { Course } from '@/types'
import { tableStickyStyles } from '@/utils/tableStickyStyles'

function CourseList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [params, setParams] = useState({
    page: 1,
    limit: 20,
  })

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)

  const queryParams = useMemo(
    () => ({
      ...params,
      ...(debouncedSearchQuery && { title: debouncedSearchQuery }),
    }),
    [params, debouncedSearchQuery]
  )

  const { data, isLoading } = useAllCourses(queryParams)

  const courses = Array.isArray(data) ? data : []

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Debounce do searchQuery
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 500)

    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Atualiza params quando o searchQuery debounced muda
  useEffect(() => {
    setParams((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearchQuery])

  const handleLimitChange = useCallback((limit: number) => {
    setParams((prev) => ({ ...prev, limit, page: 1 }))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }))
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleSearch(e.target.value)
    },
    [handleSearch]
  )

  const handleCourseSelect = useCallback((course: any) => {
    setSelectedCourse(course)
  }, [])

  const handleCourseClose = useCallback(() => {
    setSelectedCourse(null)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <>
      <Flex
        alignItems="center"
        flexDirection={{ base: 'column', md: 'row' }}
        gap={2}
      >
        <Input
          bg="bg"
          onChange={handleSearchChange}
          placeholder="Pesquisar curso..."
          value={searchQuery}
        />
        <CreateCourseForm />
      </Flex>
      <CustomTable<Course>
        css={tableStickyStyles}
        data={courses}
        emptyStateMessage="Nenhum curso encontrado"
        handleLimitChange={handleLimitChange}
        handlePageChange={handlePageChange}
        header={
          <>
            <Table.ColumnHeader>Título</Table.ColumnHeader>
            <Table.ColumnHeader>Descrição</Table.ColumnHeader>
            <Table.ColumnHeader>Data de Criação</Table.ColumnHeader>
          </>
        }
        isLoading={isLoading}
      >
        {courses.map((item) => (
          <Table.Row
            cursor="pointer"
            key={item.id}
            onClick={() => handleCourseSelect(item)}
          >
            <Table.Cell minW={200}>
              <Text lineClamp={1}>{item.title}</Text>
            </Table.Cell>
            <Table.Cell minW={300}>
              <Text lineClamp={2}>{item.description}</Text>
            </Table.Cell>
            <Table.Cell minW={150}>
              <Text>{formatDate(item.createdAt)}</Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </CustomTable>
      {selectedCourse && (
        <CourseDetailsDrawer
          courseId={selectedCourse.id}
          onClose={handleCourseClose}
        />
      )}
    </>
  )
}

export { CourseList }
