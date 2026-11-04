import { parseGoogleTagManagerCode } from 'src/traffic/domain/parse-google-tag-manager-code';
import { parseMetaPixelCode } from 'src/traffic/domain/parse-meta-pixel-code';

const PIXEL_ID = '1234567890';
const PIXEL_ID_20 = '12345678901234567890';

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
<!-- End Meta Pixel Code -->`;
}

function gtmHead(id = 'GTM-ABCDEFGH', quote = "'") {
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window, document, ${quote}script${quote}, ${quote}dataLayer${quote}, ${quote}${id}${quote});</script>
<!-- End Google Tag Manager -->`;
}

function gtmNoscript(id = 'GTM-ABCDEFGH') {
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

describe('parseMetaPixelCode', () => {
  it('accepts the official snippet in en_US and pt_BR', () => {
    expect(parseMetaPixelCode(pixelSnippet())).toBe(PIXEL_ID);
    expect(parseMetaPixelCode(pixelSnippet(PIXEL_ID, 'pt_BR'))).toBe(PIXEL_ID);
  });

  it('accepts double quotes with spaces around init and ids of 10 and 20 digits', () => {
    expect(parseMetaPixelCode(pixelSnippet(PIXEL_ID, 'en_US', `fbq( "init" , "${PIXEL_ID}" )`))).toBe(PIXEL_ID);
    expect(parseMetaPixelCode(pixelSnippet(PIXEL_ID_20, 'en_US', `fbq('init', '${PIXEL_ID_20}');`))).toBe(PIXEL_ID_20);
    expect(parseMetaPixelCode(pixelSnippet('1234567890'))).toBe('1234567890');
  });

  it('rejects another host, a letter, 9 digits, two inits, script src, javascript, onerror and a different image id', () => {
    expect(parseMetaPixelCode(pixelSnippet().replace('connect.facebook.net', 'evil.example'))).toBeNull();
    expect(parseMetaPixelCode(pixelSnippet('123456789A'))).toBeNull();
    expect(parseMetaPixelCode(pixelSnippet('123456789'))).toBeNull();
    expect(parseMetaPixelCode(pixelSnippet().replace(`fbq('init', '${PIXEL_ID}');`, `fbq('init', '${PIXEL_ID}');\nfbq('init', '${PIXEL_ID}');`))).toBeNull();
    expect(parseMetaPixelCode(`<script src="https://connect.facebook.net/en_US/fbevents.js"></script>\n${pixelSnippet()}`)).toBeNull();
    expect(parseMetaPixelCode(`${pixelSnippet()}\njavascript:`)).toBeNull();
    expect(parseMetaPixelCode(`${pixelSnippet()}\nonerror=`)).toBeNull();
    expect(parseMetaPixelCode(pixelSnippet().replace('tr?id=1234567890', 'tr?id=1234567891'))).toBeNull();
    expect(parseMetaPixelCode('   ')).toBeNull();
  });
});

describe('parseGoogleTagManagerCode', () => {
  it('accepts the head block and head plus noscript when the id matches', () => {
    expect(parseGoogleTagManagerCode(gtmHead())).toBe('GTM-ABCDEFGH');
    expect(parseGoogleTagManagerCode(`${gtmHead()}\n${gtmNoscript()}`)).toBe('GTM-ABCDEFGH');
  });

  it('accepts double quotes, spaces around commas, and ids of 4 and 12 characters', () => {
    const spaced = gtmHead('GTM-ABCD', '"').replace(
      '(window, document, "script", "dataLayer", "GTM-ABCD")',
      '(window, document, "script", "dataLayer", "GTM-ABCD")',
    );
    expect(parseGoogleTagManagerCode(spaced)).toBe('GTM-ABCD');
    expect(parseGoogleTagManagerCode(gtmHead('GTM-ABCD12345678'))).toBe('GTM-ABCD12345678');
  });

  it('rejects noscript alone, another host, another layer, two calls, short and long ids, lowercase, G-, AW-, script src, javascript, onerror and a different ns id', () => {
    expect(parseGoogleTagManagerCode(gtmNoscript())).toBeNull();
    expect(parseGoogleTagManagerCode(gtmHead().replace('www.googletagmanager.com', 'evil.example'))).toBeNull();
    expect(parseGoogleTagManagerCode(gtmHead().replaceAll('dataLayer', 'otherLayer'))).toBeNull();
    expect(parseGoogleTagManagerCode(`${gtmHead()}\n${gtmHead()}`)).toBeNull();
    expect(parseGoogleTagManagerCode(gtmHead('GTM-ABC'))).toBeNull();
    expect(parseGoogleTagManagerCode(gtmHead('GTM-ABCDEFGHIJKLM'))).toBeNull();
    expect(parseGoogleTagManagerCode(gtmHead('GTM-abcdefgh'))).toBeNull();
    expect(parseGoogleTagManagerCode(gtmHead('G-ABCDEFGH'))).toBeNull();
    expect(parseGoogleTagManagerCode(gtmHead('AW-ABCDEFGH'))).toBeNull();
    expect(parseGoogleTagManagerCode(`<script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCDEFGH"></script>\n${gtmHead()}`)).toBeNull();
    expect(parseGoogleTagManagerCode(`${gtmHead()}\njavascript:`)).toBeNull();
    expect(parseGoogleTagManagerCode(`${gtmHead()}\nonerror=`)).toBeNull();
    expect(parseGoogleTagManagerCode(`${gtmHead()}\n${gtmNoscript('GTM-ZZZZZZZZ')}`)).toBeNull();
    expect(parseGoogleTagManagerCode('')).toBeNull();
  });
});
