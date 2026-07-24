import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  Separator,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { LuEye, LuInfo, LuPencil, LuSearch } from 'react-icons/lu'

import { CustomDialog, CustomTable, Empty } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { useMetaTemplatesWithAutoSync } from '@/hooks/queries'
import type { MetaMessageTemplate } from '@/types/metaTemplate.types'
import { formatFullDate } from '@/utils/date'

import {
  canEditMetaTemplate,
  extractComponentText,
  extractHeaderFormat,
  formatMetaTemplateError,
  getMetaTemplateEditBlockedReason,
  getTemplateDisplayLabel,
  META_TEMPLATE_CATEGORY_LABELS,
} from './metaTemplate.utils'
import { MetaTemplatePreview } from './MetaTemplatePreview'
import { MetaTemplateStatusBadge } from './MetaTemplateStatusBadge'
import { MetaTemplateWizard } from './MetaTemplateWizard'

const HEADER_FORMAT_LABELS: Record<string, string> = {
  TEXT: 'Texto',
  IMAGE: 'Imagem',
  VIDEO: 'Vídeo',
  DOCUMENT: 'Documento',
}

function DetailField({
  label,
  mono = false,
  value,
}: {
  label: string
  mono?: boolean
  value: string
}) {
  return (
    <Stack gap={1}>
      <Text
        color="fg.subtle"
        fontSize="2xs"
        fontWeight="semibold"
        letterSpacing="wider"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text
        fontFamily={mono ? 'mono' : undefined}
        fontSize="sm"
        fontWeight="medium"
        lineBreak="anywhere"
      >
        {value}
      </Text>
    </Stack>
  )
}

function ContentField({
  label,
  text,
}: {
  label: string
  text: string
}) {
  return (
    <Stack gap={1}>
      <Text
        color="fg.subtle"
        fontSize="2xs"
        fontWeight="semibold"
        letterSpacing="wider"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text
        fontSize="sm"
        whiteSpace="pre-wrap"
      >
        {text}
      </Text>
    </Stack>
  )
}

function TemplateErrorInfo({ rejectedReason }: { rejectedReason: string }) {
  const error = formatMetaTemplateError(rejectedReason)
  if (!error) return null

  return (
    <Tooltip.Root openDelay={100}>
      <Tooltip.Trigger asChild>
        <IconButton
          aria-label="Ver motivo da recusa"
          color="red.500"
          onClick={(event) => event.stopPropagation()}
          size="xs"
          variant="ghost"
        >
          <Icon as={LuInfo} />
        </IconButton>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content maxW="320px">
          <Stack gap={1}>
            {error.title && (
              <Text
                fontSize="xs"
                fontWeight="bold"
              >
                {error.title}
              </Text>
            )}
            <Text fontSize="xs">{error.message}</Text>
          </Stack>
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}

function TemplateDetailContent({
  onEdit,
  template,
}: {
  onEdit?: (template: MetaMessageTemplate) => void
  template: MetaMessageTemplate
}) {
  const bodyText = extractComponentText(template.components, 'BODY')
  const footerText = extractComponentText(template.components, 'FOOTER')
  const headerFormat = extractHeaderFormat(template.components)
  const headerText =
    headerFormat === 'TEXT' ? extractComponentText(template.components, 'HEADER') : null
  const editBlockedReason = getMetaTemplateEditBlockedReason(template)
  const canEdit = canEditMetaTemplate(template)

  return (
    <Stack
      gap={5}
      p={6}
    >
      <Flex
        align={{ base: 'stretch', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        gap={3}
        justify="space-between"
      >
        <HStack
          gap={2}
          wrap="wrap"
        >
          <MetaTemplateStatusBadge status={template.status} />
          <Badge variant="outline">
            {META_TEMPLATE_CATEGORY_LABELS[template.category]}
          </Badge>
          <Badge variant="outline">{template.language}</Badge>
        </HStack>

        {onEdit && (
          <Tooltip.Root disabled={canEdit}>
            <Tooltip.Trigger asChild>
              <Button
                disabled={!canEdit}
                onClick={() => onEdit(template)}
                size="sm"
                variant="outline"
              >
                <Icon as={LuPencil} />
                Editar template
              </Button>
            </Tooltip.Trigger>
            {editBlockedReason && (
              <Tooltip.Positioner>
                <Tooltip.Content>{editBlockedReason}</Tooltip.Content>
              </Tooltip.Positioner>
            )}
          </Tooltip.Root>
        )}
      </Flex>

      {(template.status === 'REJECTED' || template.status === 'ERROR') &&
        template.rejectedReason &&
        (() => {
          const error = formatMetaTemplateError(template.rejectedReason)
          if (!error) return null
          return (
            <Alert.Root
              borderRadius="md"
              status="error"
              variant="surface"
            >
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>
                  {error.title ||
                    (template.status === 'ERROR'
                      ? 'Erro ao enviar o template para a Meta'
                      : 'Template rejeitado pela Meta')}
                </Alert.Title>
                <Alert.Description>{error.message}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )
        })()}

      <Grid
        alignItems="start"
        gap={5}
        templateColumns={{ base: '1fr', lg: '0.85fr 1.15fr' }}
      >
        <MetaTemplatePreview
          components={template.components}
          headerMediaUrl={template.headerMediaUrl}
          name={getTemplateDisplayLabel(template)}
        />

        <Stack gap={4}>
          <Card.Root size="sm">
            <Card.Body>
              <SimpleGrid
                columns={{ base: 1, sm: 2 }}
                gap={4}
              >
                <DetailField
                  label="Nome técnico"
                  mono
                  value={template.name}
                />
                <DetailField
                  label="Criado em"
                  value={formatFullDate(template.createdAt)}
                />
                <DetailField
                  label="Atualizado em"
                  value={formatFullDate(template.updatedAt)}
                />
                {headerFormat && (
                  <DetailField
                    label={headerFormat === 'TEXT' ? 'Título' : 'Formato da mídia'}
                    value={HEADER_FORMAT_LABELS[headerFormat] ?? headerFormat}
                  />
                )}
              </SimpleGrid>
            </Card.Body>
          </Card.Root>

          {(headerText || bodyText || footerText) && (
            <Card.Root size="sm">
              <Card.Header>
                <Card.Title fontSize="sm">Conteúdo da mensagem</Card.Title>
              </Card.Header>
              <Card.Body>
                <Stack gap={4}>
                  {headerText && (
                    <>
                      <ContentField
                        label="Título"
                        text={headerText}
                      />
                      <Separator />
                    </>
                  )}
                  {bodyText && (
                    <ContentField
                      label="Corpo"
                      text={bodyText}
                    />
                  )}
                  {footerText && (
                    <>
                      <Separator />
                      <ContentField
                        label="Rodapé"
                        text={footerText}
                      />
                    </>
                  )}
                </Stack>
              </Card.Body>
            </Card.Root>
          )}
        </Stack>
      </Grid>
    </Stack>
  )
}

export function MetaTemplatesList() {
  const { selectedCompany } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] =
    useState<MetaMessageTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] =
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
        item.category.toLowerCase().includes(query) ||
        item.language.toLowerCase().includes(query)
    )
  }, [search, templates])

  const handleRowSelect = useCallback((template: MetaMessageTemplate) => {
    setSelectedTemplate(template)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedTemplate(null)
  }, [])

  const handleOpenEdit = useCallback((template: MetaMessageTemplate) => {
    setSelectedTemplate(null)
    setEditingTemplate(template)
  }, [])

  const handleCloseEdit = useCallback(() => {
    setEditingTemplate(null)
  }, [])

  const handleEditSuccess = useCallback(() => {
    setEditingTemplate(null)
  }, [])

  const handleEditFromDetail = useCallback(
    (template: MetaMessageTemplate) => {
      setSelectedTemplate(null)
      setEditingTemplate(template)
    },
    []
  )

  if (!selectedCompany) return null

  return (
    <>
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
              <Table.ColumnHeader minW={240}>Nome</Table.ColumnHeader>
              <Table.ColumnHeader minW={120}>Categoria</Table.ColumnHeader>
              <Table.ColumnHeader minW={90}>Idioma</Table.ColumnHeader>
              <Table.ColumnHeader minW={120}>Status</Table.ColumnHeader>
              <Table.ColumnHeader minW={160}>Atualizado</Table.ColumnHeader>
              <Table.ColumnHeader minW={120} textAlign="end">
                Ações
              </Table.ColumnHeader>
            </>
          }
        >
          {filteredTemplates.map((row) => {
            const canEdit = canEditMetaTemplate(row)
            const editBlockedReason = getMetaTemplateEditBlockedReason(row)

            return (
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
                      fontFamily="mono"
                      fontSize="2xs"
                      lineClamp={1}
                    >
                      {row.name}
                    </Text>
                  </Stack>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">
                    {META_TEMPLATE_CATEGORY_LABELS[row.category]}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">{row.language}</Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    <MetaTemplateStatusBadge status={row.status} />
                    {(row.status === 'REJECTED' || row.status === 'ERROR') &&
                      row.rejectedReason && (
                        <TemplateErrorInfo rejectedReason={row.rejectedReason} />
                      )}
                  </HStack>
                </Table.Cell>
                <Table.Cell>
                  <Text fontSize="sm">{formatFullDate(row.updatedAt)}</Text>
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <HStack
                    gap={1}
                    justify="flex-end"
                  >
                    <IconButton
                      aria-label="Ver detalhes"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleRowSelect(row)
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Icon as={LuEye} />
                    </IconButton>
                    <Tooltip.Root disabled={canEdit}>
                      <Tooltip.Trigger asChild>
                        <IconButton
                          aria-label="Editar template"
                          disabled={!canEdit}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (canEdit) handleOpenEdit(row)
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <Icon as={LuPencil} />
                        </IconButton>
                      </Tooltip.Trigger>
                      {editBlockedReason && (
                        <Tooltip.Positioner>
                          <Tooltip.Content>{editBlockedReason}</Tooltip.Content>
                        </Tooltip.Positioner>
                      )}
                    </Tooltip.Root>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </CustomTable>
      )}
      </Stack>

      {selectedTemplate && (
        <CustomDialog
          closeOnInteractOutside
          content={
            <TemplateDetailContent
              onEdit={handleEditFromDetail}
              template={selectedTemplate}
            />
          }
          contentMaxW="5xl"
          isOpen
          onOpenChange={(details) => {
            if (!details.open) handleCloseDetail()
          }}
          title={getTemplateDisplayLabel(selectedTemplate)}
        />
      )}

      {editingTemplate && (
        <CustomDialog
          closeOnInteractOutside
          content={
            <Box p={6}>
              <MetaTemplateWizard
                onCancel={handleCloseEdit}
                onSuccess={handleEditSuccess}
                template={editingTemplate}
              />
            </Box>
          }
          contentMaxW="6xl"
          isOpen
          onOpenChange={(details) => {
            if (!details.open) handleCloseEdit()
          }}
          title={`Editar: ${getTemplateDisplayLabel(editingTemplate)}`}
        />
      )}
    </>
  )
}
