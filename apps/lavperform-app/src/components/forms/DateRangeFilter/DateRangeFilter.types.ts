export type DateRangePreset = 1 | 7 | 14 | 30

export type DateRangeValue =
  | { kind: 'preset'; days: DateRangePreset }
  | { kind: 'custom'; startDate: string; endDate: string }

export type DateRangeFilterProps = {
  value?: DateRangeValue
  defaultValue?: DateRangeValue
  onChange?: (value: DateRangeValue) => void
  /** Tamanho visual (segue os tokens do Chakra). */
  size?: 'xs' | 'sm' | 'md'
  /** Desabilita o controle inteiro. */
  disabled?: boolean
  /**
   * Intervalo máximo recomendado em dias para seleção customizada.
   * Padrão: 90 (apenas aviso visual, não bloqueia).
   */
  maxRangeDays?: number
  /** Presets exibidos; padrão: [7, 14, 30]. */
  presets?: DateRangePreset[]
  /** Permite ocultar a opção "Personalizado" caso necessário. */
  allowCustom?: boolean
}
