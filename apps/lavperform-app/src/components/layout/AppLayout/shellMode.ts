export type ShellMode = 'phone' | 'tablet' | 'desktop'

/** Celular até 767, iPad 768–1199, desktop a partir de 1200. */
export function shellModeFromWidth(width: number): ShellMode {
  if (width <= 767) return 'phone'
  if (width <= 1199) return 'tablet'
  return 'desktop'
}

export const TAB_BAR_HEIGHT = '56px'

export const TAB_BAR_OFFSET = `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom, 0px))`
