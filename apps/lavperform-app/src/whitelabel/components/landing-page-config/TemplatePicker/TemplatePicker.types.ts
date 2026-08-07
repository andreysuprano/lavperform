import type { LandingPageTemplate } from '../../../types'

export interface Props {
  value: LandingPageTemplate
  onChange: (template: LandingPageTemplate) => void
  onSave: () => void
  isSaving?: boolean
  isDirty?: boolean
}
