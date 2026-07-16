import {
  Button,
  Clipboard,
  Input as ChakraInput,
  InputGroup,
  Link,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react'
import { memo, useEffect } from 'react'

import { ClipboardIconButton, CustomDrawer, toaster } from '@/components'
import { useAuth } from '@/context/AuthContext'
import {
  useOpenApiKey,
  useRegenerateOpenApiKey,
} from '@/hooks/queries'
import { OPEN_API_DOCS } from '@/utils/constants/appMenuLinks'

import type { Props } from './OpenApiIntegrationModal.types'

function IntegrationClipboardField({
  label,
  value,
  isLoading,
}: {
  label: string
  value: string
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <Stack gap={2}>
        <Text textStyle="label">{label}</Text>
        <Skeleton h="10" />
      </Stack>
    )
  }

  return (
    <Clipboard.Root value={value}>
      <Clipboard.Label textStyle="label">{label}</Clipboard.Label>
      <InputGroup endElement={<ClipboardIconButton />}>
        <Clipboard.Input asChild>
          <ChakraInput
            disabled
            placeholder={label}
            value={value}
          />
        </Clipboard.Input>
      </InputGroup>
    </Clipboard.Root>
  )
}

function OpenApiIntegrationModalBase({ isOpen, onClose }: Props) {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  const { data, isLoading, isFetching, isError } = useOpenApiKey(companyId, {
    enabled: isOpen,
  })
  const regenerate = useRegenerateOpenApiKey()

  useEffect(() => {
    if (isOpen && isError) {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível carregar a API Key.',
        type: 'error',
      })
    }
  }, [isOpen, isError])

  const apiKey = data?.secret ?? ''
  const storeCode = companyId ?? ''
  const isKeyLoading = isLoading || isFetching

  return (
    <CustomDrawer
      isOpen={isOpen}
      onOpenChange={(details) => {
        if (!details.open) onClose()
      }}
      size="sm"
      title="API de integração"
    >
      <Stack gap={6}>
        <Text color="fg.muted">
          Integre outros sistemas com nossa plataforma de forma simples
          através da API aberta.
        </Text>

        <IntegrationClipboardField
          isLoading={!storeCode}
          label="Código da loja"
          value={storeCode}
        />

        <IntegrationClipboardField
          isLoading={isKeyLoading}
          label="API Key / Token"
          value={apiKey}
        />

        <Button
          alignSelf="flex-start"
          disabled={!companyId}
          loading={regenerate.isPending}
          onClick={() => regenerate.mutate()}
          size="sm"
          variant="outline"
        >
          Gerar novo token
        </Button>

        <Link
          color="colorPalette.fg"
          fontSize="sm"
          href={OPEN_API_DOCS.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          Ver documentação da API
        </Link>
      </Stack>
    </CustomDrawer>
  )
}

const OpenApiIntegrationModal = memo(OpenApiIntegrationModalBase)

export { OpenApiIntegrationModal, type Props as OpenApiIntegrationModalProps }
