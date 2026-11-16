import { createSystem, defaultConfig } from '@chakra-ui/react'

import { whiteLabelManager } from '@/config'

const currentTheme = whiteLabelManager.getTheme()

/** Fundo dos badges "Novidade" e "Novo". Igual nos dois modos. */
export const NAV_NEW_BADGE_COLOR = '#C2410C'

const config = {
  theme: {
    tokens: {
      colors: {
        primary: { value: currentTheme.colors.primary },
        navNewBadge: { value: NAV_NEW_BADGE_COLOR },
        app: {
          surface: { value: '#f5f5f6' },
        },
      },
      fonts: {
        body: { value: currentTheme.fonts?.body || '"Inter", sans-serif' },
        heading: {
          value: currentTheme.fonts?.heading || '"Inter", sans-serif',
        },
        mono: { value: currentTheme.fonts?.mono || '"Fira Code", monospace' },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          subtle: {
            value: {
              _light: '{colors.app.surface}',
              _dark: '{colors.gray.950}',
            },
          },
        },
      },
    },
  },
}

export const system = createSystem(defaultConfig, config)
