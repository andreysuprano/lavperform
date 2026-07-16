import { useEffect } from 'react'

import { useAuth } from '@/context/AuthContext'

const CHATWOOT_BASE_URL = 'https://foodcrm-team-chatwoot.upvfib.easypanel.host'
const CHATWOOT_WEBSITE_TOKEN = 'pKMT722Rb9HUf41tRUyUvmgz'
const CHATWOOT_SCRIPT_ID = 'chatwoot-sdk-script'
const CHATWOOT_STYLE_ID = 'chatwoot-custom-styles'
const CHATWOOT_BOTTOM_OFFSET = 170 // 20px padrão + 50px acima

type ChatwootSDK = {
  run: (config: { websiteToken: string; baseUrl: string }) => void
}

type Chatwoot = {
  toggle?: (state?: 'open' | 'close') => void
  toggleBubbleVisibility?: (state: 'show' | 'hide') => void
  reset?: () => void
}

declare global {
  interface Window {
    chatwootSDK?: ChatwootSDK
    $chatwoot?: Chatwoot
  }
}

export function ChatwootWidget() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!document.getElementById(CHATWOOT_STYLE_ID)) {
      const style = document.createElement('style')
      style.id = CHATWOOT_STYLE_ID
      style.textContent = `
        .woot--bubble-holder,
        .woot-widget-holder,
        #woot-widget-holder {
          bottom: ${CHATWOOT_BOTTOM_OFFSET}px !important;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    const themeId = (import.meta.env.VITE_THEME_ID as string) || 'default'
    const isDefaultTheme = themeId === 'default'

    if (!isDefaultTheme || !isAuthenticated) {
      window.$chatwoot?.toggleBubbleVisibility?.('hide')
      return
    }

    if (document.getElementById(CHATWOOT_SCRIPT_ID)) {
      window.$chatwoot?.toggleBubbleVisibility?.('show')
      return
    }

    const script = document.createElement('script')
    script.id = CHATWOOT_SCRIPT_ID
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`
    script.async = true
    script.onload = () => {
      ;(window as any).chatwootSettings = {
        position: 'right',
        type: 'standard',
      }

      window.chatwootSDK?.run({
        websiteToken: CHATWOOT_WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      })
    }

    document.head.appendChild(script)
  }, [isAuthenticated])

  return null
}
