import { Box, Stack, Table, Text } from '@chakra-ui/react'

import type { AudienceDefinition, AudiencePreviewCustomer } from '@/types'

import { PreviewBox, StepIntro } from '../CriterionEditor'
import { formatClientType, summarizeAudienceDefinition } from '../audienceCopy'

type Props = {
  name: string
  description: string
  definition: AudienceDefinition
  previewCount?: number
  previewLoading?: boolean
  sample?: AudiencePreviewCustomer[]
}

export function ReviewStep({
  name,
  description,
  definition,
  previewCount,
  previewLoading,
  sample = [],
}: Props) {
  const { includeSummary, excludeSummary } = summarizeAudienceDefinition(definition)

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
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Alguns clientes que entram nessa lista
          </Text>
          <Box overflowX="auto">
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
