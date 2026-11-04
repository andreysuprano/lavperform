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

  if (target.includes('/models')) {
    return Response.json({
      data: [
        {
          id: 'google/gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          architecture: { output_modalities: ['text'] },
        },
        {
          id: 'google/gemini-2.5-flash-image',
          name: 'Gemini 2.5 Flash Image',
          architecture: { output_modalities: ['image', 'text'] },
        },
        {
          id: 'anthropic/claude-sonnet-4',
          name: 'Claude Sonnet 4',
          architecture: { modality: 'text->text' },
        },
      ],
    });
  }

  const body = JSON.parse(init?.body || '{}');
  if (body.modalities) {
    return Response.json({
      choices: [{ message: { images: [{ image_url: { url: TINY } }] } }],
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
