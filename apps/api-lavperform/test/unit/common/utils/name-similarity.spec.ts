import {
  NAME_SIMILARITY_DEFAULT_THRESHOLD,
  isSimilarName,
  nameSimilarity,
  normalizeName,
} from 'src/common/utils/name-similarity';

describe('name-similarity', () => {
  describe('normalizeName', () => {
    it('remove acentos, deixa lowercase e colapsa espacos', () => {
      expect(normalizeName('  João   da Silva  ')).toBe('joao da silva');
      expect(normalizeName('Maria José')).toBe('maria jose');
    });

    it('retorna string vazia para entradas invalidas', () => {
      expect(normalizeName(null)).toBe('');
      expect(normalizeName(undefined)).toBe('');
      expect(normalizeName('')).toBe('');
      expect(normalizeName('   ')).toBe('');
    });

    it('remove caracteres especiais mantendo letras e digitos', () => {
      expect(normalizeName('João, da Silva-Jr.')).toBe('joao da silva jr');
    });
  });

  describe('nameSimilarity', () => {
    it('retorna 1 para nomes identicos (apos normalizacao)', () => {
      expect(nameSimilarity('João Silva', 'JOÃO SILVA')).toBe(1);
      expect(nameSimilarity('Joao', 'João')).toBe(1);
    });

    it('retorna 0 quando algum nome e vazio', () => {
      expect(nameSimilarity('', 'João')).toBe(0);
      expect(nameSimilarity(null, 'João')).toBe(0);
      expect(nameSimilarity('João', undefined)).toBe(0);
    });

    it('detecta nomes parecidos com pequenas variacoes', () => {
      expect(nameSimilarity('João Silva', 'Joao Silva')).toBeGreaterThan(0.7);
      expect(nameSimilarity('Maria José', 'Maria Jose')).toBeGreaterThan(0.7);
    });

    it('considera abreviacao do primeiro nome', () => {
      expect(nameSimilarity('João Silva', 'J Silva')).toBeGreaterThanOrEqual(0.5);
    });

    it('detecta similaridade quando sobrenome e identico', () => {
      expect(nameSimilarity('João Silva', 'Joao Silva')).toBeGreaterThanOrEqual(0.5);
    });

    it('considera nomes muito diferentes como pouco similares', () => {
      expect(nameSimilarity('João Silva', 'Maria Oliveira')).toBeLessThan(0.5);
      expect(nameSimilarity('Pedro', 'Ana')).toBeLessThan(0.5);
    });
  });

  describe('isSimilarName', () => {
    it('retorna true para nomes identicos', () => {
      expect(isSimilarName('João Silva', 'João Silva')).toBe(true);
    });

    it('retorna true para nomes com pequenas variacoes', () => {
      expect(isSimilarName('João Silva', 'Joao Silva')).toBe(true);
      expect(isSimilarName('João da Silva', 'Joao Silva')).toBe(true);
    });

    it('retorna false para nomes muito diferentes', () => {
      expect(isSimilarName('João Silva', 'Maria Oliveira')).toBe(false);
    });

    it('retorna true quando algum nome e vazio (sem evidencia contra match)', () => {
      expect(isSimilarName('', 'João')).toBe(true);
      expect(isSimilarName(null, 'João')).toBe(true);
      expect(isSimilarName('João', undefined)).toBe(true);
    });

    it('aceita threshold customizado', () => {
      expect(isSimilarName('João', 'Joao', 0.99)).toBe(true);
      expect(isSimilarName('João da Silva', 'Pedro da Silva', 0.95)).toBe(false);
    });

    it('expoe o threshold default em 0.5', () => {
      expect(NAME_SIMILARITY_DEFAULT_THRESHOLD).toBe(0.5);
    });
  });
});
