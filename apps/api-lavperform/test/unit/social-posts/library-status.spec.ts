import {
  captionExcerpt,
  libraryStatus,
  stripHashtags,
} from 'src/social-posts/domain/library-status';

describe('status da biblioteca de posts', () => {
  it('prioriza publicação, agenda e geração', () => {
    expect(
      libraryStatus({ generationStatus: 'idle', variationCount: 0 }),
    ).toBe('rascunho');
    expect(
      libraryStatus({ generationStatus: 'generating', variationCount: 0 }),
    ).toBe('gerando');
    expect(
      libraryStatus({ generationStatus: 'generated', variationCount: 1 }),
    ).toBe('gerado');
    expect(
      libraryStatus({
        generationStatus: 'generated',
        variationCount: 1,
        scheduleStatuses: ['SCHEDULED'],
      }),
    ).toBe('agendado');
    expect(
      libraryStatus({
        generationStatus: 'generated',
        variationCount: 1,
        scheduleStatuses: ['PUBLISHED'],
      }),
    ).toBe('publicado');
    expect(
      libraryStatus({ generationStatus: 'failed', variationCount: 0 }),
    ).toBe('falhou');
  });

  it('tira hashtags da legenda exibida', () => {
    expect(stripHashtags('Coleta grátis\n#lavanderia #batel')).toBe(
      'Coleta grátis',
    );
    expect(
      captionExcerpt(['Edredom #promo', null, 'tema']),
    ).toBe('Edredom');
  });
});