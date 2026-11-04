/**
 * Intercepta só as chamadas do cliente OpenRouter durante o E2E local,
 * quando não há OPENROUTER_API_KEY real. Não é usado no deploy.
 */
const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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
              badgeText: index === 2 ? '20% OFF' : 'Sexta',
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
