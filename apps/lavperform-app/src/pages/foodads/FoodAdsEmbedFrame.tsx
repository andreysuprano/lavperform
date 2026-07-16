import { Box, Center, Text } from '@chakra-ui/react'
import { memo, useEffect, useMemo, useState } from 'react'

import { LoadingState } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  EMBED_TOKEN_STORAGE_KEY,
  EMBED_TOKEN_UPDATE_EVENT,
} from '@/constants/embedTokenStorage'
import { adsService } from '@/services'

const SOLVEFY_EMBED_SSO = 'https://solvefyads.netlify.app/embed/sso'

const LOADING_TITLE = 'Carregando painel…'

export type FoodAdsEmbedScreen = 'dashboard' | 'campaigns' | 'overview'

function readStoredEmbedToken(): string | null {
  return localStorage.getItem(EMBED_TOKEN_STORAGE_KEY)
}

function FoodAdsEmbedFrameBase({ screen }: { screen: FoodAdsEmbedScreen }) {
  const { selectedCompany } = useAuth()
  const [readyToken, setReadyToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState(false)
  const [isFrameLoaded, setIsFrameLoaded] = useState(false)

  /** Garante token no storage antes de montar o iframe; gera via API se ausente. */
  useEffect(() => {
    if (!selectedCompany?.id) {
      setReadyToken(null)
      setTokenError(false)
      setIsFrameLoaded(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setTokenError(false)
      setReadyToken(null)
      setIsFrameLoaded(false)

      let t = readStoredEmbedToken()
      if (!t) {
        await adsService.syncEmbedToken(selectedCompany.id)
        t = readStoredEmbedToken()
      }

      if (cancelled) return
      if (!t) {
        setTokenError(true)
        return
      }
      setReadyToken(t)
    })()

    return () => {
      cancelled = true
    }
  }, [selectedCompany?.id])

  /** Outro fluxo (ex.: AuthContext) pode gravar o token; atualiza o estado. */
  useEffect(() => {
    const onTokenUpdate = () => {
      const t = readStoredEmbedToken()
      if (!t || !selectedCompany?.id) return
      setReadyToken(t)
      setTokenError(false)
    }
    window.addEventListener(EMBED_TOKEN_UPDATE_EVENT, onTokenUpdate)
    return () =>
      window.removeEventListener(EMBED_TOKEN_UPDATE_EVENT, onTokenUpdate)
  }, [selectedCompany?.id])

  const src = useMemo(() => {
    if (!readyToken) return null
    const params = new URLSearchParams({
      embedToken: readyToken,
      embed: '1',
      page: screen,
    })
    console.log(`${SOLVEFY_EMBED_SSO}?${params.toString()}`)
    return `${SOLVEFY_EMBED_SSO}?${params.toString()}`
  }, [readyToken, screen])

  useEffect(() => {
    if (src) {
      setIsFrameLoaded(false)
    }
  }, [src])

  const contentHeight = 'calc(100dvh - 4rem)'

  if (!selectedCompany) {
    return (
      <Box px={2}>
        <Text
          color="fg.muted"
          fontSize="sm"
        >
          Selecione uma empresa para carregar o embed.
        </Text>
      </Box>
    )
  }

  const showEmbedshell = Boolean(readyToken && src && !tokenError)

  const title =
    screen === 'campaigns'
      ? 'FoodAds   Campanhas'
      : screen === 'overview'
        ? 'FoodAds   Overview'
        : 'FoodAds'

  const showLoading =
    (!showEmbedshell && !tokenError) || (showEmbedshell && !isFrameLoaded)

  return (
    <Box
      flex="1"
      h={contentHeight}
      maxH={contentHeight}
      minH={contentHeight}
      overflow="hidden"
      position="relative"
      w="full"
    >
      {showLoading ? (
        <Center
          bg="bg.subtle"
          inset={showEmbedshell ? 0 : undefined}
          h="full"
          position={showEmbedshell ? 'absolute' : 'relative'}
          w="full"
          zIndex={showEmbedshell ? 1 : 0}
        >
          <LoadingState title={LOADING_TITLE} />
        </Center>
      ) : null}

      {tokenError ? (
        <Box
          px={2}
          py={4}
        >
          <Text
            color="fg.muted"
            fontSize="sm"
          >
            Não foi possível preparar o painel. Tente recarregar a página ou
            mudar de empresa.
          </Text>
        </Box>
      ) : null}

      {showEmbedshell && src ? (
        <iframe
          allow="clipboard-write"
          height="100%"
          onLoad={() => setIsFrameLoaded(true)}
          style={{
            border: 0,
            display: 'block',
            height: '100%',
            width: '100%',
          }}
          title={title}
          width="100%"
          src={src}
        />
      ) : null}
    </Box>
  )
}

export const FoodAdsEmbedFrame = memo(FoodAdsEmbedFrameBase)

FoodAdsEmbedFrame.displayName = 'FoodAdsEmbedFrame'
