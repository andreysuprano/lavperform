import {
  Box,
  createListCollection,
  Field,
  Select,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Empty, LoadingState } from '@/components'
import { toaster } from '@/components/ui/toaster'
import { MetaTemplatePreview } from '@/components/features/campaigns/meta-templates/MetaTemplatePreview'
import {
  extractComponentText,
  getTemplateDisplayLabel,
} from '@/components/features/campaigns/meta-templates/metaTemplate.utils'
import { useAuth } from '@/context/AuthContext'
import { useMetaTemplatesWithAutoSync } from '@/hooks/queries/useMetaTemplates'
import type { MetaMessageTemplate } from '@/types/metaTemplate.types'
import {
  applyTemplateMappingLines,
  automaticFillMessage,
  completeTemplateVariableMappings,
  mappingsForTemplate,
  META_TEMPLATE_VARIABLE_OPTIONS,
  type MetaTemplateVariableMapping,
} from '@/utils/campaigns/metaTemplateVariable.constants'

import { getWizardFormId } from '../../wizardFormId'
import type { FormStepsProps } from './FormSteps.types'

const SELECTABLE_STATUSES = new Set(['APPROVED', 'PENDING', 'IN_APPEAL'])

function getTemplateBodyText(template: MetaMessageTemplate): string {
  return extractComponentText(template.components, 'BODY') ?? ''
}

function statusLabel(status: string) {
  if (status === 'APPROVED') return 'Aprovado'
  if (status === 'PENDING') return 'Pendente'
  if (status === 'IN_APPEAL') return 'Em análise'
  return status
}

const variableSourceCollection = createListCollection({
  items: META_TEMPLATE_VARIABLE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
})

export function TemplateStep(props: FormStepsProps) {
  const { formData, id, onSubmit } = props
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  const { data: templates = [], isLoading } = useMetaTemplatesWithAutoSync(
    companyId,
  )

  const selectableTemplates = useMemo(
    () =>
      templates.filter((template) => SELECTABLE_STATUSES.has(template.status)),
    [templates],
  )

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () => formData?.metaMessageTemplateId ?? '',
  )
  const [mappings, setMappings] = useState<MetaTemplateVariableMapping[]>(
    () => formData?.metaTemplateVariableMappings ?? [],
  )

  const selectedTemplate = useMemo(
    () =>
      selectableTemplates.find((template) => template.id === selectedTemplateId),
    [selectableTemplates, selectedTemplateId],
  )

  const templatesCollection = useMemo(
    () =>
      createListCollection({
        items: selectableTemplates.map((template) => ({
          value: template.id,
          label: `${getTemplateDisplayLabel(template)} · ${statusLabel(template.status)}`,
        })),
      }),
    [selectableTemplates],
  )

  const bodyText = selectedTemplate ? getTemplateBodyText(selectedTemplate) : ''
  const variableLines = useMemo(
    () => (selectedTemplate ? mappingsForTemplate(selectedTemplate) : []),
    [selectedTemplate],
  )
  const automaticMessage = automaticFillMessage(variableLines)
  const lastTemplateIdRef = useRef<string | undefined>(
    formData?.metaMessageTemplateId ?? undefined,
  )

  useEffect(() => {
    if (!selectedTemplate) return

    const inheritUnsourced = lastTemplateIdRef.current === selectedTemplate.id
    lastTemplateIdRef.current = selectedTemplate.id

    setMappings((current) =>
      applyTemplateMappingLines(variableLines, current, { inheritUnsourced }),
    )
  }, [selectedTemplate, variableLines])

  const handleMappingChange = useCallback(
    (index: number, source: MetaTemplateVariableMapping['source']) => {
      setMappings((current) => {
        const next = [...current]
        const existingIndex = next.findIndex((mapping) => mapping.index === index)
        const entry = { index, source }

        if (existingIndex >= 0) {
          next[existingIndex] = entry
        } else {
          next.push(entry)
        }

        return next.sort((a, b) => a.index - b.index)
      })
    },
    [],
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedTemplate) {
      toaster.create({
        title: 'Template obrigatório',
        description: 'Selecione um template Meta para continuar.',
        type: 'error',
      })
      return
    }

    const submittedMappings = completeTemplateVariableMappings(
      variableLines,
      mappings,
    )
    if (!submittedMappings) {
      toaster.create({
        title: 'Origem obrigatória',
        description: 'Selecione o dado de cada variável sem origem conhecida.',
        type: 'error',
      })
      return
    }

    onSubmit?.({
      metaMessageTemplateId: selectedTemplate.id,
      metaTemplateVariableMappings: submittedMappings,
      selectedMetaTemplateLabel: getTemplateDisplayLabel(selectedTemplate),
      messageText: bodyText,
      creatives: [],
    })
  }

  if (isLoading) {
    return <LoadingState title="Carregando templates..." />
  }

  return (
    <form
      id={getWizardFormId(props.wizardFormId ?? 'campaign', id ?? 0)}
      onSubmit={handleSubmit}
    >
      <Stack gap={4}>
        <Text color="fg.muted" fontSize="sm">
          Selecione um template aprovado, pendente ou em análise. Variável com
          nome conhecido já traz a origem.
        </Text>

        {selectableTemplates.length === 0 ? (
          <Empty
            description="Crie um template na aba Templates antes de configurar esta campanha."
            title="Nenhum template disponível"
          />
        ) : (
          <>
            <Field.Root required>
              <Field.Label>Template</Field.Label>
              <Select.Root
                collection={templatesCollection}
                onValueChange={({ value }) =>
                  setSelectedTemplateId(value[0] ?? '')
                }
                value={selectedTemplateId ? [selectedTemplateId] : []}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="Selecione um template" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    {templatesCollection.items.map((item) => (
                      <Select.Item item={item} key={item.value}>
                        {item.label}
                        <Select.ItemIndicator />
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </Field.Root>

            {selectedTemplate && variableLines.length > 0 && (
              <Stack gap={3}>
                <Text fontWeight="semibold">Variáveis do template</Text>
                {automaticMessage ? (
                  <Text color="fg.muted" fontSize="sm">
                    {automaticMessage}
                  </Text>
                ) : null}
                {variableLines.map((line) => {
                  const currentSource =
                    mappings.find((mapping) => mapping.index === line.index)
                      ?.source ?? ''
                  const label = line.key ? `{{${line.key}}}` : `{{${line.index}}}`

                  return (
                    <Field.Root key={line.index} required>
                      <Field.Label>{label}</Field.Label>
                      <Select.Root
                        collection={variableSourceCollection}
                        disabled={Boolean(line.source)}
                        onValueChange={({ value }) =>
                          handleMappingChange(
                            line.index,
                            value[0] as MetaTemplateVariableMapping['source'],
                          )
                        }
                        value={currentSource ? [currentSource] : []}
                      >
                        <Select.HiddenSelect />
                        <Select.Control>
                          <Select.Trigger>
                            <Select.ValueText placeholder="Selecione o dado" />
                          </Select.Trigger>
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Control>
                        <Select.Positioner>
                          <Select.Content>
                            {variableSourceCollection.items.map((item) => (
                              <Select.Item item={item} key={item.value}>
                                {item.label}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Select.Root>
                    </Field.Root>
                  )
                })}
              </Stack>
            )}

            {selectedTemplate && (
              <Box>
                <Text fontWeight="semibold" mb={2}>
                  Prévia
                </Text>
                <MetaTemplatePreview
                  components={selectedTemplate.components}
                  headerMediaUrl={selectedTemplate.headerMediaUrl}
                  name={getTemplateDisplayLabel(selectedTemplate)}
                />
              </Box>
            )}
          </>
        )}
      </Stack>
    </form>
  )
}
