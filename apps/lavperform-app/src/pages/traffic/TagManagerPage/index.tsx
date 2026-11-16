import { Stack, Text } from '@chakra-ui/react'
import { LuTag } from 'react-icons/lu'

import { AppContentLayout, TrackingCodeForm } from '@/components'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { trafficService } from '@/services'
import { parseGoogleTagManagerCode } from '@/utils/tracking/parse-google-tag-manager-code'
import { GTM_CODE_MESSAGE } from '@/utils/tracking/messages'

function TagManagerInstructions() {
  return (
    <Stack gap={3}>
      <Text fontWeight="bold">Como ligar o Tag Manager nas suas páginas</Text>
      <Text fontWeight="medium">No Google Tag Manager:</Text>
      <ol style={{ paddingInlineStart: '1.25rem' }}>
        <li>Abra o Tag Manager em tagmanager.google.com.</li>
        <li>
          Escolha o contêiner Web do site. Se ainda não existir, crie um
          contêiner Web e dê um nome. O ID começa com <code>GTM-</code>.
        </li>
        <li>
          No espaço de trabalho, clique no ID do contêiner para abrir Instalar
          o Google Tag Manager.
        </li>
        <li>
          Copie o código da tela de instalação. O Google mostra um script do{' '}
          <code>gtm.js</code> e outro com <code>gtag</code>, os dois com o
          mesmo <code>GTM-…</code>. Se a tela ainda mostrar o bloco do head e
          o de depois da body, copie esses também.
        </li>
      </ol>
      <Text fontWeight="medium">No sistema:</Text>
      <ol
        start={5}
        style={{ paddingInlineStart: '1.25rem' }}
      >
        <li>
          Cole o código inteiro no campo abaixo. Servem o formato novo, com o
          script do <code>gtm.js</code> e o <code>gtag</code>, e o formato
          antigo, com o bloco do head. O noscript pode vir junto.
        </li>
        <li>Deixe a medição ligada e salve.</li>
        <li>
          A landing publicada e as páginas de Minhas páginas carregam esse
          contêiner. Abra a landing, a página que o Google verifica, e use o
          modo Visualizar do Tag Manager. O contêiner deve conectar.
        </li>
        <li>
          Para ver a troca de página dentro do site, crie no contêiner um
          acionador de evento personalizado com o nome <code>page_view</code>.
          Cada abertura de página pública envia esse evento.
        </li>
      </ol>
    </Stack>
  )
}

export function TagManagerPage() {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id

  return (
    <AppContentLayout
      icon={<LuTag />}
      title="Tag Manager"
    >
      <Stack gap={6}>
        <TagManagerInstructions />
        <TrackingCodeForm
          codeLabel="Código do Tag Manager"
          companyId={companyId}
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
          statusLine={(id, enabled) =>
            enabled
              ? `Contêiner ${id}. Medição ligada.`
              : `Contêiner ${id}. Medição pausada.`
          }
        />
      </Stack>
    </AppContentLayout>
  )
}
