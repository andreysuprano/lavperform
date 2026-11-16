import { describe, expect, it, beforeEach } from 'vitest'

import { MENU_ITEMS } from '@/utils/constants/appMenuLinks'
import {
  resetGoogleTagManagerInstallForTests,
  installGoogleTagManager,
} from '@/utils/tracking/install-google-tag-manager'
import {
  installMetaPixel,
  resetMetaPixelInstallForTests,
} from '@/utils/tracking/install-meta-pixel'
import {
  gtmMeasurementNotice,
  noticeFromQuery,
  pixelMeasurementNotice,
} from '@/utils/tracking/measurement-notices'
import { parseGoogleTagManagerCode } from '@/utils/tracking/parse-google-tag-manager-code'
import { parseMetaPixelCode } from '@/utils/tracking/parse-meta-pixel-code'
import {
  formatPublicCompanyPage,
  syncPublicTracking,
} from '@/utils/tracking/public-page'
import {
  trafficHomePath,
  trafficRouteRedirect,
} from '@/utils/tracking/traffic-access'

const PIXEL_ID = '1234567890'
const PIXEL_ID_20 = '12345678901234567890'

function pixelSnippet(id = PIXEL_ID, lang = 'en_US', init = `fbq('init', '${id}');`) {
  return `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/${lang}/fbevents.js');
${init}
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`
}

function gtmHead(id = 'GTM-ABCDEFGH') {
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->`
}

function gtmNoscript(id = 'GTM-ABCDEFGH') {
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`
}

function gtmCurrent(id = 'GTM-P38BJKSJ', quote = '"') {
  return `<script async src=${quote}https://www.googletagmanager.com/gtm.js?id=${id}${quote}></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
</script>`
}

describe('parseMetaPixelCode', () => {
  it('aceita o snippet oficial, pt_BR, aspas duplas e ids de 10 e 20 dígitos', () => {
    expect(parseMetaPixelCode(pixelSnippet())).toBe(PIXEL_ID)
    expect(parseMetaPixelCode(pixelSnippet(PIXEL_ID, 'pt_BR'))).toBe(PIXEL_ID)
    expect(
      parseMetaPixelCode(
        pixelSnippet(PIXEL_ID, 'en_US', `fbq( "init" , "${PIXEL_ID}" )`)
      )
    ).toBe(PIXEL_ID)
    expect(parseMetaPixelCode(pixelSnippet(PIXEL_ID_20))).toBe(PIXEL_ID_20)
  })

  it('recusa host, letra, 9 dígitos, dois init, script src, javascript, onerror e id diferente', () => {
    expect(
      parseMetaPixelCode(pixelSnippet().replace('connect.facebook.net', 'evil.example'))
    ).toBeNull()
    expect(parseMetaPixelCode(pixelSnippet('123456789A'))).toBeNull()
    expect(parseMetaPixelCode(pixelSnippet('123456789'))).toBeNull()
    expect(
      parseMetaPixelCode(
        pixelSnippet().replace(
          `fbq('init', '${PIXEL_ID}');`,
          `fbq('init', '${PIXEL_ID}');\nfbq('init', '${PIXEL_ID}');`
        )
      )
    ).toBeNull()
    expect(
      parseMetaPixelCode(
        `<script src="https://connect.facebook.net/en_US/fbevents.js"></script>\n${pixelSnippet()}`
      )
    ).toBeNull()
    expect(parseMetaPixelCode(`${pixelSnippet()}\njavascript:`)).toBeNull()
    expect(parseMetaPixelCode(`${pixelSnippet()}\nonerror=`)).toBeNull()
    expect(
      parseMetaPixelCode(pixelSnippet().replace('tr?id=1234567890', 'tr?id=1234567891'))
    ).toBeNull()
  })
})

describe('parseGoogleTagManagerCode', () => {
  it('aceita o head, head com noscript, aspas duplas e ids de 4 e 12 caracteres', () => {
    expect(parseGoogleTagManagerCode(gtmHead())).toBe('GTM-ABCDEFGH')
    expect(parseGoogleTagManagerCode(`${gtmHead()}\n${gtmNoscript()}`)).toBe(
      'GTM-ABCDEFGH'
    )
    const quoted = gtmHead('GTM-ABCD').replace(
      "(window,document,'script','dataLayer','GTM-ABCD')",
      '(window, document, "script", "dataLayer", "GTM-ABCD")'
    )
    expect(parseGoogleTagManagerCode(quoted)).toBe('GTM-ABCD')
    expect(parseGoogleTagManagerCode(gtmHead('GTM-ABCD12345678'))).toBe(
      'GTM-ABCD12345678'
    )
  })

  it('aceita o código novo do Google, com aspas simples, src antes do async e noscript', () => {
    expect(parseGoogleTagManagerCode(gtmCurrent())).toBe('GTM-P38BJKSJ')
    expect(parseGoogleTagManagerCode(gtmCurrent('GTM-ABCD', "'"))).toBe('GTM-ABCD')
    expect(
      parseGoogleTagManagerCode(
        gtmCurrent('GTM-ABCD12345678').replace(
          '<script async src=',
          '<script src='
        ).replace('></script>', ' async></script>')
      )
    ).toBe('GTM-ABCD12345678')
    expect(parseGoogleTagManagerCode(`${gtmCurrent()}\n${gtmNoscript('GTM-P38BJKSJ')}`)).toBe(
      'GTM-P38BJKSJ'
    )
  })

  it('recusa noscript sozinho, outro host, outra camada, duas chamadas, ids inválidos e código perigoso', () => {
    expect(parseGoogleTagManagerCode(gtmNoscript())).toBeNull()
    expect(
      parseGoogleTagManagerCode(
        gtmHead().replace('www.googletagmanager.com', 'evil.example')
      )
    ).toBeNull()
    expect(
      parseGoogleTagManagerCode(gtmHead().split('dataLayer').join('otherLayer'))
    ).toBeNull()
    expect(parseGoogleTagManagerCode(`${gtmHead()}\n${gtmHead()}`)).toBeNull()
    expect(parseGoogleTagManagerCode(gtmHead('GTM-ABC'))).toBeNull()
    expect(parseGoogleTagManagerCode(gtmHead('GTM-ABCDEFGHIJKLM'))).toBeNull()
    expect(parseGoogleTagManagerCode(gtmHead('GTM-abcdefgh'))).toBeNull()
    expect(parseGoogleTagManagerCode(gtmHead('G-ABCDEFGH'))).toBeNull()
    expect(parseGoogleTagManagerCode(gtmHead('AW-ABCDEFGH'))).toBeNull()
    expect(
      parseGoogleTagManagerCode(
        `<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCDEFGH"></script>\n${gtmHead()}`
      )
    ).toBeNull()
    expect(parseGoogleTagManagerCode(`${gtmHead()}\njavascript:`)).toBeNull()
    expect(parseGoogleTagManagerCode(`${gtmHead()}\nonerror=`)).toBeNull()
    expect(
      parseGoogleTagManagerCode(`${gtmHead()}\n${gtmNoscript('GTM-ZZZZZZZZ')}`)
    ).toBeNull()
    expect(parseGoogleTagManagerCode(gtmCurrent().split('</script>')[0] + '</script>')).toBeNull()
    expect(
      parseGoogleTagManagerCode(
        gtmCurrent().replace("gtag('js', new Date());", "gtag('js', new Date());\nalert(1)")
      )
    ).toBeNull()
    expect(
      parseGoogleTagManagerCode(gtmCurrent().replace('www.googletagmanager.com', 'evil.example'))
    ).toBeNull()
    expect(
      parseGoogleTagManagerCode(
        gtmCurrent().replace('/gtm.js?id=', '/gtag/js?id=')
      )
    ).toBeNull()
    expect(parseGoogleTagManagerCode(`${gtmCurrent()}\n${gtmCurrent()}`)).toBeNull()
    expect(parseGoogleTagManagerCode(`${gtmCurrent()}\njavascript:`)).toBeNull()
    expect(parseGoogleTagManagerCode(`${gtmCurrent()}\nonerror=`)).toBeNull()
  })
})

describe('menu Tráfego', () => {
  const meta = MENU_ITEMS.find((item) => item.label === 'Tráfego')

  it('mostra o grupo e o selo só em Pixel e Tag Manager', () => {
    expect(meta).toMatchObject({ label: 'Tráfego', href: '/trafego' })
    expect(meta?.links?.map((link) => link.label)).toEqual([
      'Relatório de tráfego',
      'Pixel',
      'Tag Manager',
    ])
    expect(meta?.links?.map((link) => link.href)).toEqual([
      '/trafego',
      '/trafego/pixel',
      '/trafego/gtm',
    ])
    expect(meta?.links?.map((link) => ('badge' in link ? link.badge : undefined))).toEqual([
      undefined,
      'Em breve',
      'Em breve',
    ])
  })

  it('exige traffic.read nas telas e manda quem só tem essa permissão para /trafego', () => {
    expect(trafficRouteRedirect(['campaigns.read'], '/trafego/pixel')).toBe(
      '/dashboard'
    )
    expect(trafficRouteRedirect(['campaigns.read'], '/trafego/gtm')).toBe(
      '/dashboard'
    )
    expect(trafficRouteRedirect(undefined, '/trafego/pixel')).toBeNull()
    expect(trafficHomePath(['traffic.read'])).toBe('/trafego')
    expect(trafficRouteRedirect(['traffic.read'], '/trafego/pixel')).toBe(
      '/trafego'
    )
    expect(trafficRouteRedirect(['traffic.read'], '/trafego/gtm')).toBe(
      '/trafego'
    )
    expect(trafficHomePath(['traffic.read', 'dashboard.read'])).toBe(
      '/dashboard'
    )
  })
})

describe('avisos de medição', () => {
  it('mostra ativo, pausado e ausente com o destino da especificação', () => {
    expect(pixelMeasurementNotice({ pixelId: '1234567890', enabled: true }, true)).toEqual({
      badge: 'Pixel ativo',
      badgeTone: 'green',
      text: 'As páginas publicadas enviam PageView para o Pixel 1234567890.',
      actionLabel: 'Ajustar',
      href: '/trafego/pixel',
    })
    expect(pixelMeasurementNotice({ pixelId: '1234567890', enabled: false }, true)).toMatchObject({
      badge: 'Pixel pausado',
      text: 'O ID está salvo, mas as páginas não enviam eventos.',
      actionLabel: 'Ativar',
      href: '/trafego/pixel',
    })
    expect(pixelMeasurementNotice({ pixelId: null, enabled: false }, true)).toMatchObject({
      title: 'Meça quem chega pelos anúncios.',
      text: 'Conecte o Pixel da Meta para ver, no Gerenciador de Eventos, quantas pessoas abriram estas páginas.',
      actionLabel: 'Configurar Pixel',
      href: '/trafego/pixel',
    })
    expect(gtmMeasurementNotice({ containerId: 'GTM-ABCDEFGH', enabled: true }, true)).toMatchObject({
      badge: 'Tag Manager ativo',
      text: 'As páginas publicadas carregam o contêiner GTM-ABCDEFGH.',
      actionLabel: 'Ajustar',
      href: '/trafego/gtm',
    })
    expect(gtmMeasurementNotice({ containerId: 'GTM-ABCDEFGH', enabled: false }, true)).toMatchObject({
      badge: 'Tag Manager pausado',
      text: 'O ID está salvo, mas as páginas não carregam o contêiner.',
      actionLabel: 'Ativar',
      href: '/trafego/gtm',
    })
    expect(gtmMeasurementNotice({ containerId: null, enabled: false }, true)).toMatchObject({
      title: 'Carregue suas tags nas páginas.',
      text: 'Conecte o contêiner do Google Tag Manager para disparar as tags dele quando alguém abre estas páginas.',
      actionLabel: 'Configurar Tag Manager',
      href: '/trafego/gtm',
    })
  })

  it('não coloca link sem traffic.read e esconde só o produto cuja leitura falhou', () => {
    expect(pixelMeasurementNotice({ pixelId: '1234567890', enabled: true }, false).href).toBeNull()
    expect(gtmMeasurementNotice({ containerId: null, enabled: false }, false).href).toBeNull()

    const pixel = noticeFromQuery(
      { isError: true, data: { pixelId: '1234567890', enabled: true } },
      (data) => pixelMeasurementNotice(data, true)
    )
    const gtm = noticeFromQuery(
      { isError: false, data: { containerId: 'GTM-ABCDEFGH', enabled: true } },
      (data) => gtmMeasurementNotice(data, true)
    )
    expect(pixel).toBeNull()
    expect(gtm?.text).toContain('GTM-ABCDEFGH')
  })
})

describe('formatador público', () => {
  it('conserva o slug da empresa e os ids vindos dela quando a página interna se chama principal', () => {
    const result = formatPublicCompanyPage(
      {
        id: 'company-1',
        slug: 'pizzaria',
        name: 'Pizzaria',
        avatarUrl: 'avatar',
        phone: '11999999999',
        address: { street: 'Rua A' },
        metaPixelId: '1234567890',
        gtmContainerId: 'GTM-ABCDEFGH',
      },
      {
        id: 'page-1',
        slug: 'principal',
        name: 'Principal',
        metaPixelId: null,
        gtmContainerId: null,
      }
    )

    expect(result.slug).toBe('pizzaria')
    expect(result.id).toBe('company-1')
    expect(result.name).toBe('Pizzaria')
    expect(result.metaPixelId).toBe('1234567890')
    expect(result.gtmContainerId).toBe('GTM-ABCDEFGH')
    expect(result.pageId).toBe('page-1')
    expect(result.type).toBe('LINK_HUB')
  })

  it('transforma chave ausente em null', () => {
    const result = formatPublicCompanyPage(
      { id: 'company-1', slug: 'pizzaria', name: 'Pizzaria' },
      { id: 'page-1', slug: 'principal' }
    )
    expect(result.metaPixelId).toBeNull()
    expect(result.gtmContainerId).toBeNull()
  })
})

describe('injeção do Pixel', () => {
  beforeEach(() => resetMetaPixelInstallForTests())

  it('carrega fbevents.js uma vez, faz um init por id e um PageView por chamada', () => {
    installMetaPixel('1234567890')
    installMetaPixel('1234567890')

    const scripts = [...document.scripts].filter((script) =>
      script.src.includes('https://connect.facebook.net/en_US/fbevents.js')
    )
    expect(scripts).toHaveLength(1)
    expect(scripts[0].async).toBe(true)

    const queue = (window as unknown as { fbq: { queue: unknown[][] } }).fbq
      .queue
    expect(queue.filter((call) => call[0] === 'init')).toEqual([['init', '1234567890']])
    expect(queue.filter((call) => call[0] === 'track' && call[1] === 'PageView')).toHaveLength(2)
  })
})

describe('injeção do Tag Manager', () => {
  beforeEach(() => resetGoogleTagManagerInstallForTests())

  it('carrega um gtm.js por contêiner, um push gtm.js e um page_view por chamada', () => {
    installGoogleTagManager('GTM-ABCDEFGH')
    installGoogleTagManager('GTM-ABCDEFGH')

    const scripts = [...document.scripts].filter((script) =>
      script.src.includes('https://www.googletagmanager.com/gtm.js?id=GTM-ABCDEFGH')
    )
    expect(scripts).toHaveLength(1)
    expect(scripts[0].src).not.toContain('&l=')
    expect(scripts[0].async).toBe(true)

    const layer = (
      window as unknown as { dataLayer: Array<Record<string, unknown>> }
    ).dataLayer
    expect(layer.filter((event) => event.event === 'gtm.js')).toHaveLength(1)
    const views = layer.filter((event) => event.event === 'page_view')
    expect(views).toHaveLength(2)
    expect(views[0]).toMatchObject({
      page_path: `${window.location.pathname}${window.location.search}`,
      page_location: window.location.href,
    })
    expect(typeof layer.find((event) => event.event === 'gtm.js')?.['gtm.start']).toBe('number')
  })
})

describe('página pública', () => {
  it('instala o contêiner antes do Pixel, só o id presente, e nada no preview', () => {
    const order: string[] = []
    syncPublicTracking({
      isPreview: false,
      gtmContainerId: 'GTM-ABCDEFGH',
      metaPixelId: '1234567890',
      installGtm: () => order.push('gtm'),
      installPixel: () => order.push('pixel'),
    })
    expect(order).toEqual(['gtm', 'pixel'])

    const onlyPixel: string[] = []
    syncPublicTracking({
      isPreview: false,
      gtmContainerId: null,
      metaPixelId: '1234567890',
      installGtm: () => onlyPixel.push('gtm'),
      installPixel: () => onlyPixel.push('pixel'),
    })
    expect(onlyPixel).toEqual(['pixel'])

    const preview: string[] = []
    syncPublicTracking({
      isPreview: true,
      gtmContainerId: 'GTM-ABCDEFGH',
      metaPixelId: '1234567890',
      installGtm: () => preview.push('gtm'),
      installPixel: () => preview.push('pixel'),
    })
    expect(preview).toEqual([])
  })
})
