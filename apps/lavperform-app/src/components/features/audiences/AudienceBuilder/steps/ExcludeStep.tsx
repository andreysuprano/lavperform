import { Button, Stack, Text } from '@chakra-ui/react'

import type { RuleGroup } from '@/types'

import { PreviewBox, StepIntro } from '../CriterionEditor'
import { RuleGroupEditor } from '../RuleGroupEditor'

type Props = {
  group?: RuleGroup
  onChange: (group: RuleGroup | undefined) => void
  productOptions: string[]
  neighborhoodOptions: string[]
  cityOptions: string[]
  dddOptions: string[]
  previewCount?: number
  previewLoading?: boolean
}

export function ExcludeStep({
  group,
  onChange,
  productOptions,
  neighborhoodOptions,
  cityOptions,
  dddOptions,
  previewCount,
  previewLoading,
}: Props) {
  const enableExclude = () => {
    onChange({
      operator: 'OR',
      rules: [
        {
          type: 'purchased_product',
          operator: 'within_days',
          value: { productName: '', days: 7 },
        },
      ],
    })
  }

  return (
    <Stack gap={4}>
      <StepIntro
        description="Opcional: retire pessoas que não devem receber a campanha, mesmo que entrem nos filtros anteriores."
        title="Alguém deve ficar de fora?"
      />

      {group ? (
        <Stack gap={3}>
          <RuleGroupEditor
            cityOptions={cityOptions}
            dddOptions={dddOptions}
            group={group}
            neighborhoodOptions={neighborhoodOptions}
            onChange={onChange}
            productOptions={productOptions}
          />
          <Button
            alignSelf="flex-start"
            onClick={() => onChange(undefined)}
            size="sm"
            variant="ghost"
          >
            Remover exclusões
          </Button>
        </Stack>
      ) : (
        <Stack gap={3}>
          <Text color="fg.muted">
            Ninguém será excluído. Se quiser, você pode tirar alguns clientes da lista.
          </Text>
          <Button
            alignSelf="flex-start"
            onClick={enableExclude}
            size="sm"
            variant="outline"
          >
            + Definir quem deixar de fora
          </Button>
        </Stack>
      )}

      <PreviewBox
        compact
        count={previewCount}
        isLoading={previewLoading}
      />
    </Stack>
  )
}
