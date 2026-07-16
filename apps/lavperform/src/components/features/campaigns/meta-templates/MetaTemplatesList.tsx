import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { LuSearch } from 'react-icons/lu'

import { CustomTable, Empty } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useMetaTemplatesWithAutoSync } from '@/hooks/queries'
import type { MetaMessageTemplate } from '@/types/metaTemplate.types'
import { formatFullDate } from '@/utils/date'

import { MetaTemplatePreview } from './MetaTemplatePreview'
import { MetaTemplateStatusBadge } from './MetaTemplateStatusBadge'
import {
  extractComponentText,
  extractHeaderFormat,
  getTemplateDisplayLabel,
  META_TEMPLATE_CATEGORY_LABELS,
} from './metaTemplate.utils'

function TemplateDetailDrawer({
  template,
  onClose,
}: {
  template: MetaMessageTemplate
  onClose: () => void
}) {
  const bodyText = extractComponentText(template.components, 'BODY')
  const footerText = extractComponentText(template.components, 'FOOTER')
  const headerFormat = extractHeaderFormat(template.components)

  return (
    <Box
      bg="bg"
      borderColor="border"
      borderRadius="xl"
      borderWidth="1px"
      p={5}
    >
      <Flex
        align="start"
        justify="space-between"
        mb={4}
      >
        <Stack gap={1}>
          <Text
            fontSize="lg"
            fontWeight="semibold"
          >
            {getTemplateDisplayLabel(template)}
          </Text>
          <HStack gap={2}>
            <MetaTemplateStatusBadge status={template.status} />
            <Badge variant="outline">
              {META_TEMPLATE_CATEGORY_LABELS[template.category]}
            </Badge>
            <Badge variant="outline">{template.language}</Badge>
          </HStack>
          <Text
            color="fg.muted"
            fontSize="xs"
          >
            ID Meta: {template.name}
          </Text>
        </Stack>
        <Box
          as="button"
          color="fg.muted"
          cursor="pointer"
          fontSize="sm"
          onClick={onClose}
          type="button"
        >
          Fechar
        </Box>
      </Flex>

      <Stack gap={4}>
        <MetaTemplatePreview
          components={template.components}
          name={getTemplateDisplayLabel(template)}
        />

        <Stack gap={1}>
          <Text
            fontSize="sm"
            fontWeight="medium"
          >
            Detalhes
          </Text>
          {headerFormat && (
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Header: {headerFormat}
            </Text>
          )}
          {bodyText && (
            <Text
              color="fg.muted"
              fontSize="sm"
              whiteSpace="pre-wrap"
            >
              Corpo: {bodyText}
            </Text>
          )}
          {footerText && (
            <Text
              color="fg.muted"
              fontSize="sm"
            >
              Rodapé: {footerText}
            </Text>
          )}
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Criado em {formatFullDate(template.createdAt)}
          </Text>
          {template.rejectedReason && (
            <Text
              color="red.500"
              fontSize="sm"
            >
              Motivo: {template.rejectedReason}
            </Text>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}

export function MetaTemplatesList() {
  const { selectedCompany } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] =
    useState<MetaMessageTemplate | null>(null)

  const { data: templates = [], isLoading, isFetching, isSyncing } =
    useMetaTemplatesWithAutoSync(selectedCompany?.id)

  const filteredTemplates = useMemo(() => {
    const active = templates.filter((item) => item.status !== 'DELETED')
    if (!search.trim()) return active
    const query = search.toLowerCase()
    return active.filter(
      (item) =>
        getTemplateDisplayLabel(item).toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    )
  }, [search, templates])

  const handleRowSelect = useCallback((template: MetaMessageTemplate) => {
    setSelectedTemplate(template)
  }, [])

  if (!selectedCompany) return null

  if (selectedTemplate) {
    return (
      <TemplateDetailDrawer
        onClose={() => setSelectedTemplate(null)}
        template={selectedTemplate}
      />
    )
  }

  return (
    <Stack gap={4}>
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap={3}
        justify="space-between"
      >
        <Box position="relative">
          <Icon
            as={LuSearch}
            color="fg.muted"
            left={3}
            pointerEvents="none"
            position="absolute"
            top="50%"
            transform="translateY(-50%)"
            zIndex={1}
          />
          <Input
            onChange={(e) => setSearch(e.target.value)}
            pl={9}
            placeholder="Buscar por nome, status ou categoria"
            value={search}
          />
        </Box>

        {(isFetching || isSyncing) && (
          <HStack
            color="fg.muted"
            fontSize="sm"
            justify={{ base: 'flex-start', md: 'flex-end' }}
          >
            <Spinner size="sm" />
            <Text>Sincronizando com a Meta...</Text>
          </HStack>
        )}
      </Flex>

      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner />
        </Flex>
      ) : filteredTemplates.length === 0 ? (
        <Empty
          description="Crie seu primeiro template para enviar mensagens pela API oficial do WhatsApp."
          title="Nenhum template encontrado"
        />
      ) : (
        <CustomTable<MetaMessageTemplate>
          data={filteredTemplates}
          emptyStateMessage="Nenhum template encontrado"
          header={
            <>
              <Table.ColumnHeader>Nome</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Atualizado</Table.ColumnHeader>
            </>
          }
        >
          {filteredTemplates.map((row) => (
            <Table.Row
              _hover={{ bg: 'bg.muted' }}
              cursor="pointer"
              key={row.id}
              onClick={() => handleRowSelect(row)}
            >
              <Table.Cell>
                <Stack gap={0}>
                  <Text fontWeight="medium">
                    {getTemplateDisplayLabel(row)}
                  </Text>
                  <Text
                    color="fg.muted"
                    fontSize="xs"
                  >
                    {META_TEMPLATE_CATEGORY_LABELS[row.category]} · {row.language}
                  </Text>
                  <Text
                    color="fg.muted"
                    fontSize="2xs"
                  >
                    ID Meta: {row.name}
                  </Text>
                </Stack>
              </Table.Cell>
              <Table.Cell>
                <MetaTemplateStatusBadge status={row.status} />
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="sm">{formatFullDate(row.updatedAt)}</Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </CustomTable>
      )}
    </Stack>
  )
}
