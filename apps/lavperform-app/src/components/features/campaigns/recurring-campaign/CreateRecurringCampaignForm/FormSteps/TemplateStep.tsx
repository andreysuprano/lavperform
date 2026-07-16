import {
  Box,
  Field,
  NativeSelect,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Empty, LoadingState } from '@/components'
import { MetaTemplatePreview } from '@/components/features/campaigns/meta-templates/MetaTemplatePreview'
import {
  countTemplateVariables,
  extractComponentText,
  getTemplateDisplayLabel,
} from '@/components/features/campaigns/meta-templates/metaTemplate.utils'
import { useAuth } from '@/context/AuthContext'
import { useMetaTemplatesWithAutoSync } from '@/hooks/queries/useMetaTemplates'
import type { MetaMessageTemplate } from '@/types/metaTemplate.types'
import {
  buildDefaultVariableMappings,
  META_TEMPLATE_VARIABLE_OPTIONS,
  type MetaTemplateVariableMapping,
} from '@/utils/campaigns/metaTemplateVariable.constants'

import type { FormStepsProps } from './FormSteps.types'

function getTemplateBodyText(template: MetaMessageTemplate): string {
  return extractComponentText(template.components, 'BODY') ?? ''
}

export function TemplateStep(props: FormStepsProps) {
  const { formData, id, onSubmit } = props
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  const { data: templates = [], isLoading } = useMetaTemplatesWithAutoSync(
    companyId,
  )

  const approvedTemplates = useMemo(
    () => templates.filter((template) => template.status === 'APPROVED'),
    [templates],
  )

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () => formData?.metaMessageTemplateId ?? '',
  )
  const [mappings, setMappings] = useState<MetaTemplateVariableMapping[]>(
    () => formData?.metaTemplateVariableMappings ?? [],
  )

  const selectedTemplate = useMemo(
    () => approvedTemplates.find((template) => template.id === selectedTemplateId),
    [approvedTemplates, selectedTemplateId],
  )

  const bodyText = selectedTemplate ? getTemplateBodyText(selectedTemplate) : ''
  const variableCount = useMemo(
    () => countTemplateVariables(bodyText),
    [bodyText],
  )

  useEffect(() => {
    if (!selectedTemplate) return

    setMappings((current) => {
      if (
        current.length === variableCount &&
        current.every((mapping) => mapping.index >= 1 && mapping.index <= variableCount)
      ) {
        return current
      }

      const defaults = buildDefaultVariableMappings(variableCount)
      return defaults.map((defaultMapping) => {
        const existing = current.find(
          (mapping) => mapping.index === defaultMapping.index,
        )
        return existing ?? defaultMapping
      })
    })
  }, [selectedTemplate?.id, variableCount])

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

    if (!selectedTemplate) return

    onSubmit?.({
      metaMessageTemplateId: selectedTemplate.id,
      metaTemplateVariableMappings: mappings,
      selectedMetaTemplateLabel: getTemplateDisplayLabel(selectedTemplate),
      messageText: bodyText,
      creatives: [],
    })
  }

  if (isLoading) {
    return <LoadingState title="Carregando templates aprovados..." />
  }

  return (
    <form
      id={`hook-form-${id}`}
      onSubmit={handleSubmit}
    >
      <Stack gap={4}>
        <Text color="fg.muted" fontSize="sm">
          Selecione um template já aprovado pela Meta e informe qual dado
          preencherá cada variável no momento do envio.
        </Text>

        {approvedTemplates.length === 0 ? (
          <Empty
            description="Crie e aguarde a aprovação de templates na aba Templates antes de configurar esta campanha."
            title="Nenhum template aprovado"
          />
        ) : (
          <>
            <Field.Root required>
              <Field.Label>Template aprovado</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  value={selectedTemplateId}
                >
                  <option value="">Selecione um template</option>
                  {approvedTemplates.map((template) => (
                    <option
                      key={template.id}
                      value={template.id}
                    >
                      {getTemplateDisplayLabel(template)}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            {selectedTemplate && variableCount > 0 && (
              <Stack gap={3}>
                <Text fontWeight="semibold">Variáveis do template</Text>
                {Array.from({ length: variableCount }, (_, offset) => {
                  const variableIndex = offset + 1
                  const currentSource =
                    mappings.find((mapping) => mapping.index === variableIndex)
                      ?.source ??
                    META_TEMPLATE_VARIABLE_OPTIONS[0].value

                  return (
                    <Field.Root
                      key={variableIndex}
                      required
                    >
                      <Field.Label>{`{{${variableIndex}}}`}</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          onChange={(event) =>
                            handleMappingChange(
                              variableIndex,
                              event.target.value as MetaTemplateVariableMapping['source'],
                            )
                          }
                          value={currentSource}
                        >
                          {META_TEMPLATE_VARIABLE_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </Field.Root>
                  )
                })}
              </Stack>
            )}

            {selectedTemplate && (
              <Box>
                <Text
                  fontWeight="semibold"
                  mb={2}
                >
                  Prévia
                </Text>
                <MetaTemplatePreview
                  components={selectedTemplate.components}
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
