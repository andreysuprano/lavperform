import { phoneLookupVariants } from 'src/customers/application/customer-identifier';

describe('phoneLookupVariants', () => {
  it('inclui o numero com e sem DDI 55', () => {
    const variants = phoneLookupVariants('41997269435');

    expect(variants).toEqual(
      expect.arrayContaining(['5541997269435', '41997269435']),
    );
  });

  it('inclui variante sem o nono digito', () => {
    const variants = phoneLookupVariants('5541997269435');

    expect(variants).toEqual(
      expect.arrayContaining(['554197269435', '4197269435']),
    );
  });
});
