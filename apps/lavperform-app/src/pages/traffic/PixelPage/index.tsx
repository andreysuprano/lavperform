import { Code } from '@chakra-ui/react'
import { LuActivity } from 'react-icons/lu'

import {
  AppContentLayout,
  TrackingCodeForm,
  type TrackingGuideGroup,
  TrackingSetupLayout,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { trafficService } from '@/services'
import { META_PIXEL_CODE_MESSAGE } from '@/utils/tracking/messages'
import { parseMetaPixelCode } from '@/utils/tracking/parse-meta-pixel-code'

const PIXEL_GUIDE_GROUPS: TrackingGuideGroup[] = [
  {
    title: 'Na Meta',
    steps: [
      'Abra o Gerenciador de Eventos.',
      'Em Fontes de dados, escolha o Pixel do site. Se ainda não existir, conecte uma fonte Web, crie o Pixel da Meta e dê um nome.',
      'Na instalação, escolha Pixel da Meta e depois Instalar código manualmente.',
      <>
        Copie o código base inteiro. Ele traz a linha{' '}
        <Code>fbq(&apos;init&apos;, &apos;números&apos;)</Code>.
      </>,
    ],
  },
  {
    title: 'No sistema',
    steps: [
      'Cole esse código no campo ao lado.',
      'Deixe a medição ligada e salve.',
      'A landing publicada e as páginas de Minhas páginas disparam o PageView. Abra a landing, a página que a Meta verifica.',
      'Volte ao Gerenciador de Eventos. Em alguns minutos deve aparecer um evento PageView.',
    ],
  },
]

export function PixelPage() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  return (
    <AppContentLayout
      icon={<LuActivity />}
      title="Pixel"
    >
      <TrackingSetupLayout
        form={
          <TrackingCodeForm
            codeLabel="Código do Pixel"
  codePlaceholder="<!-- Meta Pixel Code -->"
  companyId={companyId}
  idLabel="Pixel"
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
  title="Pixel da Meta"
/>
        }
        guide={{
          title: 'Como ligar o Pixel nas suas páginas',
          groups: PIXEL_GUIDE_GROUPS,
        }}
        intro="Envie as visitas das suas páginas para a Meta e acompanhe os resultados dos anúncios."
      />
    </AppContentLayout>
  )
}
