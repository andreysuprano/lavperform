import { Button, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { toaster } from '@/components/ui/toaster'
import { useAuth } from '@/context/AuthContext'
import {
  useConnectionActions,
  useConnections,
} from '@/hooks/queries/useSocialPublishing'
import { publishingErrorMessage, socialPublishingService } from '@/services/socialPublishing.service'
import type { ConnectionProvider, GoogleAssets, MetaAssets } from '@/types'

import { ChannelCards } from './ChannelCards'
import {
  GoogleAccountDialog,
  MetaAccountDialog,
  MetaPermissionsDialog,
} from './ConnectDialogs'

const SLUG: Record<ConnectionProvider, string> = {
  META: 'meta',
  GOOGLE_BUSINESS: 'google-business',
  GOOGLE_ADS: 'google-ads',
}

export function SocialConnectionsSection() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id ?? ''
  const overview = useConnections(companyId)
  const actions = useConnectionActions(companyId)
  const [params, setParams] = useSearchParams()
  const [permissions, setPermissions] = useState(false)
  const [metaAssets, setMetaAssets] = useState<MetaAssets | undefined>()
  const [googleAssets, setGoogleAssets] = useState<GoogleAssets | undefined>()
  const [metaOpen, setMetaOpen] = useState(false)
  const [googleOpen, setGoogleOpen] = useState(false)
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<ConnectionProvider | null>(null)

  const openMetaAssets = async () => {
    const response = await socialPublishingService.metaAssets(companyId)
    setMetaAssets(response.data)
    setMetaOpen(true)
  }
  const openGoogleAssets = async () => {
    const response = await socialPublishingService.googleAssets(companyId)
    setGoogleAssets(response.data)
    setGoogleOpen(true)
  }

  useEffect(() => {
    const step = params.get('step')
    const provider = params.get('provider')
    if (!companyId || !step) return
    if (step === 'error') {
      toaster.create({
        title: params.get('message') || 'Não foi possível conectar',
        type: 'error',
      })
    }
    if (step === 'select' && provider === 'META') {
      openMetaAssets().catch((error) =>
        toaster.create({
          title: publishingErrorMessage(error, 'Não foi possível listar as contas'),
          type: 'error',
        })
      )
    }
    if (step === 'select' && provider?.startsWith('GOOGLE')) {
      openGoogleAssets().catch((error) =>
        toaster.create({
          title: publishingErrorMessage(error, 'Não foi possível listar os perfis'),
          type: 'error',
        })
      )
    }
    setParams({}, { replace: true })
    // A volta do OAuth só deve abrir o seletor uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const start = async (provider: ConnectionProvider) => {
    if (provider === 'META') {
      setPermissionMessage(null)
      setPermissions(true)
      return
    }
    const result = await actions.start.mutateAsync(SLUG[provider])
    if (result.data.authorizationUrl) {
      window.location.assign(result.data.authorizationUrl)
      return
    }
    if (result.data.sandbox) {
      await openGoogleAssets()
      return
    }
    if (result.data.message) {
      toaster.create({ title: result.data.message, type: 'error' })
    }
  }

  const continueMeta = async () => {
    const result = await actions.start.mutateAsync('meta')
    if (result.data.authorizationUrl) {
      window.location.assign(result.data.authorizationUrl)
      return
    }
    if (!result.data.configured && result.data.message) {
      setPermissionMessage(result.data.message)
      return
    }
    setPermissions(false)
    if (result.data.sandbox) await openMetaAssets()
  }

  if (!companyId) return null
  const sandbox = overview.data?.sandbox

  return (
    <Stack gap={3}>
      <Text
        color="fg.muted"
        fontSize="sm"
        fontWeight="semibold"
      >
        Redes sociais e Google
      </Text>
      <ChannelCards
        busy={busy}
        connections={overview.data?.connections ?? []}
        onCancel={(provider) => actions.cancel.mutate(SLUG[provider])}
        onConnect={start}
        onDisconnect={(provider) => actions.disconnect.mutate(SLUG[provider])}
        onRetry={async (provider) => {
          setBusy(provider)
          try {
            await actions.retry.mutateAsync(SLUG[provider])
          } finally {
            setBusy(null)
          }
        }}
        onSwitch={async (provider) => {
          if (provider === 'META') await openMetaAssets()
          else await openGoogleAssets()
        }}
      />
      {sandbox ? (
        <Button
          alignSelf="flex-start"
          onClick={() => actions.seed.mutate()}
          size="sm"
          variant="outline"
        >
          Carregar dados de teste
        </Button>
      ) : null}
      <MetaPermissionsDialog
        busy={actions.start.isPending}
        message={permissionMessage}
        onClose={() => setPermissions(false)}
        onContinue={continueMeta}
        open={permissions}
      />
      <MetaAccountDialog
        assets={metaAssets}
        busy={actions.selectMeta.isPending}
        onClose={() => setMetaOpen(false)}
        onConfirm={async (value) => {
          await actions.selectMeta.mutateAsync(value)
          setMetaOpen(false)
        }}
        open={metaOpen}
      />
      <GoogleAccountDialog
        assets={googleAssets}
        busy={actions.selectGoogle.isPending}
        onClose={() => setGoogleOpen(false)}
        onConfirm={async (value) => {
          await actions.selectGoogle.mutateAsync(value)
          setGoogleOpen(false)
        }}
        open={googleOpen}
      />
    </Stack>
  )
}
