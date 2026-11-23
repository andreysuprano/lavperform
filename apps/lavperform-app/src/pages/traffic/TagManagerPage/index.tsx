import { Code } from '@chakra-ui/react'
import { LuTag } from 'react-icons/lu'

import {
  AppContentLayout,
  TrackingCodeForm,
  type TrackingGuideGroup,
  TrackingSetupLayout,
} from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { trafficService } from '@/services'
import { GTM_CODE_MESSAGE } from '@/utils/tracking/messages'
import { parseGoogleTagManagerCode } from '@/utils/tracking/parse-google-tag-manager-code'

const GTM_GUIDE_GROUPS: TrackingGuideGroup[] = [
  {
    title: 'No Google Tag Manager',
    steps: [
      'Abra o Tag Manager em tagmanager.google.com.',
      <>
        Escolha o contêiner Web do site. Se ainda não existir, crie um
        contêiner Web e dê um nome. O ID começa com <Code>GTM-</Code>.
      </>,
      'No espaço de trabalho, clique no ID do contêiner para abrir Instalar o Google Tag Manager.',
      <>
        Copie o código da tela de instalação. O Google mostra um script do{' '}
        <Code>gtm.js</Code> e outro com <Code>gtag</Code>, os dois com o mesmo{' '}
        <Code>GTM-…</Code>. Se a tela ainda mostrar o bloco do head e o de
        depois da body, copie esses também.
      </>,
    ],
  },
  {
    title: 'No sistema',
    steps: [
      <>
        Cole o código inteiro no campo ao lado. Servem o formato novo, com o
        script do <Code>gtm.js</Code> e o <Code>gtag</Code>, e o formato
        antigo, com o bloco do head. O noscript pode vir junto.
      </>,
      'Deixe a medição ligada e salve.',
      'A landing publicada e as páginas de Minhas páginas carregam esse contêiner. Abra a landing, a página que o Google verifica, e use o modo Visualizar do Tag Manager. O contêiner deve conectar.',
      <>
        Para ver a troca de página dentro do site, crie no contêiner um
        acionador de evento personalizado com o nome <Code>page_view</Code>.
        Cada abertura de página pública envia esse evento.
      </>,
    ],
  },
]

export function TagManagerPage() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  return (
    <AppContentLayout
      icon={<LuTag />}
      title="Tag Manager"
    >
      <TrackingSetupLayout
        form={
          <TrackingCodeForm
            codeLabel="Código do Tag Manager"
            codePlaceholder="<!-- Google Tag Manager -->"
            companyId={companyId}
            idLabel="Contêiner"
            invalidMessage={GTM_CODE_MESSAGE}
            load={async (id) => {
              const record = await trafficService.getGtm(id)
              return { id: record.containerId, enabled: record.enabled }
            }}
            parse={parseGoogleTagManagerCode}
            queryKey={queryKeys.traffic.gtm(companyId ?? '')}
            remove={trafficService.removeGtm}
            removeLabel="Remover Tag Manager"
            removedToast={{
              title: 'Tag Manager removido',
              description: 'As páginas deixam de carregar o contêiner.',
            }}
            save={async (id, body) => {
              const record = await trafficService.saveGtm(id, body)
              return { id: record.containerId, enabled: record.enabled }
            }}
            savedToast={{
              title: 'Tag Manager salvo',
              description: 'A medição das páginas foi atualizada.',
            }}
            title="Google Tag Manager"
          />
        }
        guide={{
          title: 'Como ligar o Tag Manager nas suas páginas',
          groups: GTM_GUIDE_GROUPS,
        }}
        intro="Carregue o seu contêiner do Google Tag Manager nas páginas públicas e conecte suas ferramentas de medição."
      />
    </AppContentLayout>
  )
}
