import { Stack } from '@chakra-ui/react'

import type { RuleGroup } from '@/types'

import { PreviewBox, StepIntro } from '../CriterionEditor'
import { RuleGroupEditor } from '../RuleGroupEditor'

type Props = {
  group: RuleGroup
  onChange: (group: RuleGroup) => void
  productOptions: string[]
  neighborhoodOptions: string[]
  cityOptions: string[]
  previewCount?: number
  previewLoading?: boolean
}

export function IncludeStep({
  group,
  onChange,
  productOptions,
  neighborhoodOptions,
  cityOptions,
  previewCount,
  previewLoading,
}: Props) {
  return (
    <Stack gap={4}>
      <StepIntro
        description="Escolha quem entra nessa lista. Você pode combinar vários filtros."
        title="Quem você quer incluir?"
      />

      <RuleGroupEditor
        cityOptions={cityOptions}
        group={group}
        neighborhoodOptions={neighborhoodOptions}
        onChange={onChange}
        productOptions={productOptions}
      />

      <PreviewBox
        compact
        count={previewCount}
        isLoading={previewLoading}
      />
    </Stack>
  )
}
