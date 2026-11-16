import {
  compareMetaIds,
  sanitizeCreativeUrl,
  selectThumbnailAdIds,
} from 'src/traffic/domain/traffic-thumbnails';

describe('compareMetaIds', () => {
  it('ordena inteiro decimal sem Number()', () => {
    expect(compareMetaIds('99', '100')).toBeLessThan(0);
    expect(compareMetaIds('0099', '100')).toBeLessThan(0);
    expect(compareMetaIds('9007199254740993', '9007199254740992')).toBeGreaterThan(0);
  });
});

describe('sanitizeCreativeUrl', () => {
  it('remove access_token e rejeita o que não é http', () => {
    expect(sanitizeCreativeUrl('https://cdn.example/a.jpg?access_token=segredo&x=1'))
      .toBe('https://cdn.example/a.jpg?x=1');
    expect(sanitizeCreativeUrl('ftp://cdn.example/a.jpg')).toBeNull();
    expect(sanitizeCreativeUrl('não é url')).toBeNull();
  });
});

describe('selectThumbnailAdIds', () => {
  it('escolhe o anúncio de maior spend do nome da campanha e desempata pelo id', () => {
    const ids = selectThumbnailAdIds(
      [{ name: ' Verão ', spend: 20 }, { name: 'Inverno', spend: 5 }],
      [
        { id: '100', name: 'Verão', spend: 8 },
        { id: '99', name: ' Verão ', spend: 8 },
        { id: '50', name: 'Outro', spend: 30 },
      ],
    );
    expect(ids[0]).toBe('100');
    expect(ids).toContain('50');
    expect(ids.filter((id) => id === '100' || id === '99')).toEqual(['100']);
  });
});
