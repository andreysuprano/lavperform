import { Stack, Text } from '@chakra-ui/react'
import { LuActivity } from 'react-icons/lu'

import { AppContentLayout, TrackingCodeForm } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { trafficService } from '@/services'
import { META_PIXEL_CODE_MESSAGE } from '@/utils/tracking/messages'
import { parseMetaPixelCode } from '@/utils/tracking/parse-meta-pixel-code'

function PixelInstructions() {
  return (
    <Stack gap={3}>
      <Text fontWeight="bold">Como ligar o Pixel nas suas páginas</Text>
      <Text fontWeight="medium">Na Meta:</Text>
      <ol style={{ paddingInlineStart: '1.25rem' }}>
        <li>Abra o Gerenciador de Eventos.</li>
        <li>
          Em Fontes de dados, escolha o Pixel do site. Se ainda não existir,
          conecte uma fonte Web, crie o Pixel da Meta e dê um nome.
        </li>
        <li>
          Na instalação, escolha Pixel da Meta e depois Instalar código
          manualmente.
        </li>
        <li>
          Copie o código base inteiro. Ele traz a linha{' '}
          <code>fbq('init', 'números')</code>.
        </li>
      </ol>
      <Text fontWeight="medium">No sistema:</Text>
      <ol
        start={5}
        style={{ paddingInlineStart: '1.25rem' }}
      >
        <li>Cole esse código no campo abaixo.</li>
        <li>Deixe a medição ligada e salve.</li>
        <li>
          A landing publicada e as páginas de Minhas páginas disparam o
          PageView. Abra a landing, a página que a Meta verifica.
        </li>
        <li>
          Volte ao Gerenciador de Eventos. Em alguns minutos deve aparecer um
          evento PageView.
        </li>
      </ol>
    </Stack>
  )
}

export function PixelPage() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  return (
    <AppContentLayout
      icon={<LuActivity />}
      title="Pixel"
    >
      <Stack gap={6}>
        <PixelInstructions />
        <TrackingCodeForm
          codeLabel="Código do Pixel"
          companyId={companyId}
          invalidMessage={META_PIXEL_CODE_MESSAGE}
          load={async (id) => {
            const record = await trafficService.getPixel(id)
            return { id: record.pixelId, enabled: record.enabled }
          }}
          parse={parseMetaPixelCode}
          queryKey={queryKeys.traffic.pixel(companyId ?? '')}
          remove={trafficService.removePixel}
          removeLabel="Remover Pixel"
          removedToast={{
            title: 'Pixel removido',
            description: 'As páginas deixam de enviar eventos.',
          }}
          save={async (id, body) => {
            const record = await trafficService.savePixel(id, body)
            return { id: record.pixelId, enabled: record.enabled }
          }}
          savedToast={{
            title: 'Pixel salvo',
            description: 'A medição das páginas foi atualizada.',
          }}
          statusLine={(id, enabled) =>
            enabled
              ? `Pixel ${id}. Medição ligada.`
              : `Pixel ${id}. Medição pausada.`
          }
        />
      </Stack>
    </AppContentLayout>
  )
}
