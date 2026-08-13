import {
  Box,
  ButtonGroup,
  Flex,
  IconButton,
  Pagination,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'

import type {
  AudienceDefinition,
  AudiencePreviewCustomer,
  AudiencePreviewResponse,
} from '@/types'

import { PreviewBox, StepIntro } from '../CriterionEditor'
import { formatClientType, summarizeAudienceDefinition } from '../audienceCopy'

type Props = {
  name: string
  description: string
  definition: AudienceDefinition
  previewCount?: number
  previewLoading?: boolean
  sample?: AudiencePreviewCustomer[]
  previewMeta?: AudiencePreviewResponse['meta']
  onPreviewPageChange?: (page: number) => void
}

export function ReviewStep({
  name,
  description,
  definition,
  previewCount,
  previewLoading,
  sample = [],
  previewMeta,
  onPreviewPageChange,
}: Props) {
  const { includeSummary, excludeSummary } = summarizeAudienceDefinition(definition)
  const showPagination = Boolean(
    previewMeta && previewMeta.totalPages > 1 && onPreviewPageChange,
  )

  return (
    <Stack gap={4}>
      <StepIntro
        description="Confira se a lista ficou do jeito que você quer antes de salvar."
        title="Tudo certo para salvar?"
      />

      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={4}
      >
        <Stack gap={3}>
          <Stack gap={1}>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Nome
            </Text>
            <Text fontWeight="semibold">{name}</Text>
            {description ? (
              <Text
                color="fg.muted"
                fontSize="sm"
              >
                {description}
              </Text>
            ) : null}
          </Stack>

          <Stack gap={1}>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Quem entra
            </Text>
            <Text>Inclui clientes que: {includeSummary}.</Text>
          </Stack>

          <Stack gap={1}>
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Quem fica de fora
            </Text>
            <Text>
              {excludeSummary
                ? `Não inclui quem: ${excludeSummary}.`
                : 'Ninguém será excluído.'}
            </Text>
          </Stack>
        </Stack>
      </Box>

      <PreviewBox
        count={previewCount}
        isLoading={previewLoading}
      />

      {sample.length ? (
        <Stack gap={2}>
          <Flex
            align="center"
            gap={2}
            justify="space-between"
            wrap="wrap"
          >
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Clientes nesta lista
              {previewMeta
                ? ` — página ${previewMeta.page} de ${previewMeta.totalPages}`
                : null}
            </Text>
            {showPagination && previewMeta && onPreviewPageChange ? (
              <Flex
                align="center"
                flexShrink={0}
                gap={2}
                justify="flex-end"
              >
                <Pagination.Root
                  count={previewMeta.total}
                  onPageChange={(details) => onPreviewPageChange(details.page)}
                  page={previewMeta.page}
                  pageSize={previewMeta.limit}
                  siblingCount={0}
                >
                  <ButtonGroup
                    attached
                    size="sm"
                    variant="outline"
                  >
                    <Pagination.PrevTrigger asChild>
                      <IconButton
                        aria-label="Página anterior"
                        disabled={!previewMeta.hasPreviousPage}
                        variant="ghost"
                      >
                        <RiArrowLeftSLine />
                      </IconButton>
                    </Pagination.PrevTrigger>
                    <Pagination.NextTrigger asChild>
                      <IconButton
                        aria-label="Próxima página"
                        disabled={!previewMeta.hasNextPage}
                        variant="ghost"
                      >
                        <RiArrowRightSLine />
                      </IconButton>
                    </Pagination.NextTrigger>
                  </ButtonGroup>
                </Pagination.Root>
              </Flex>
            ) : null}
          </Flex>
          <Box
            maxH="360px"
            overflowX="auto"
            overflowY="auto"
          >
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Nome</Table.ColumnHeader>
                  <Table.ColumnHeader>Telefone</Table.ColumnHeader>
                  <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                  <Table.ColumnHeader>Bairro</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sample.map((customer) => (
                  <Table.Row key={customer.id}>
                    <Table.Cell>{customer.name}</Table.Cell>
                    <Table.Cell>{customer.phone ?? '-'}</Table.Cell>
                    <Table.Cell>
                      {customer.rfvClassification
                        ? formatClientType(customer.rfvClassification)
                        : '-'}
                    </Table.Cell>
                    <Table.Cell>{customer.address?.neighborhood ?? '-'}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        </Stack>
      ) : null}
    </Stack>
  )
}
