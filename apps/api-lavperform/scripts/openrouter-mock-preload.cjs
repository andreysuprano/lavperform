/**
 * Intercepta só as chamadas do cliente OpenRouter durante o E2E local,
 * quando não há OPENROUTER_API_KEY real. Não é usado no deploy.
 */
const TINY =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#E8F6FD"/><stop offset="48%" stop-color="#9AD6F5"/><stop offset="100%" stop-color="#2D7FB0"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#sky)"/><circle cx="220" cy="280" r="120" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="8"/><circle cx="860" cy="360" r="78" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="8"/><circle cx="760" cy="980" r="150" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="8"/><rect x="360" y="420" width="360" height="460" rx="72" fill="rgba(255,255,255,0.82)"/></svg>',
  );

const headlines = [
  'Roupa limpa, sem esforço.',
  'Edredom novo de novo.',
  'Sexta é dia de 20% OFF',
  'Coleta grátis no Batel',
];

const originalFetch = global.fetch.bind(global);

global.fetch = async (url, init) => {
  const target = String(url);
  if (!target.includes('openrouter.ai')) {
    return originalFetch(url, init);
  }

  const body = JSON.parse(init?.body || '{}');
  if (body.modalities) {
    return Response.json({
      choices: [{ message: { images: [{ image_url: { url: TINY } }] } }],
    });
  }

  const user = (body.messages || []).find((item) => item.role === 'user')?.content || '';
  if (String(user).includes('Pedido:')) {
    const pedido = String(user);
    const title = /título|titulo/i.test(pedido);
    const background = /fundo/i.test(pedido);
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              nonsense: false,
              regenerateBackground: background && !title,
              backgroundInstruction: 'lighter laundry room without text',
              headline: title ? 'Promoção de Verão' : null,
              reply: title
                ? 'Atualizei o título.'
                : 'Mudei o fundo. Texto, logo e cores mantidos.',
            }),
          },
        },
      ],
    });
  }

  return Response.json({
    choices: [
      {
        message: {
          content: JSON.stringify({
            variations: headlines.map((headline, index) => ({
              headline,
              badgeText: '20% OFF · toda sexta',
              captionShort: 'Edredom com cheirinho de novo.',
              captionMedium:
                'Edredom com cheirinho de novo, sem você sair de casa. Toda sexta de novembro a lavagem de edredons tem 20% OFF — e a coleta no Batel é por nossa conta.',
              captionLong:
                'Edredom com cheirinho de novo, sem você sair de casa. Toda sexta de novembro a lavagem de edredons tem 20% OFF — e a coleta no Batel é por nossa conta. Chama no WhatsApp e agenda!',
              hashtags: [
                '#lavanderia',
                '#curitiba',
                '#batel',
                '#edredom',
                '#sextafeira',
                '#roupalimpa',
              ],
            })),
          }),
        },
      },
    ],
  });
};
