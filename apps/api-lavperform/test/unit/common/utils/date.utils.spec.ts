import {
  parseUTCDate,
  parseUTCDateStrict,
  toDateOnlyString,
  toUTCString,
  nowUTC,
  createUTCDate,
  getFixedTimeInRange,
} from '../../../../src/common/utils/date.utils';

describe('Date Utils', () => {
  describe('parseUTCDate', () => {
    it('deve converter string de data sem timezone para UTC', () => {
      const result = parseUTCDate('2024-01-15T10:30:00');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('deve manter timezone quando explícito (com Z)', () => {
      const result = parseUTCDate('2024-01-15T10:30:00Z');
      expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('deve manter timezone quando explícito (com offset)', () => {
      const result = parseUTCDate('2024-01-15T10:30:00-03:00');
      expect(result?.toISOString()).toBe('2024-01-15T13:30:00.000Z');
    });

    it('deve adicionar horário 00:00:00Z para datas apenas com YYYY-MM-DD', () => {
      const result = parseUTCDate('2024-01-15');
      expect(result?.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });

    it('deve retornar undefined para strings vazias', () => {
      expect(parseUTCDate('')).toBeUndefined();
      expect(parseUTCDate(null as any)).toBeUndefined();
      expect(parseUTCDate(undefined as any)).toBeUndefined();
    });

    it('deve retornar o próprio Date se já for um objeto Date', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = parseUTCDate(date);
      expect(result).toBe(date);
    });

    it('deve remover espaços extras da string', () => {
      const result = parseUTCDate('  2024-01-15T10:30:00  ');
      expect(result?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('parseUTCDateStrict', () => {
    it('deve converter string de data válida', () => {
      const result = parseUTCDateStrict('2024-01-15T10:30:00');
      expect(result.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('deve lançar erro para string vazia', () => {
      expect(() => parseUTCDateStrict('')).toThrow('Data é obrigatória');
    });

    it('deve lançar erro para null', () => {
      expect(() => parseUTCDateStrict(null as any)).toThrow('Data é obrigatória');
    });

    it('deve lançar erro para data inválida', () => {
      expect(() => parseUTCDateStrict('data-invalida')).toThrow('Data inválida: data-invalida');
    });
  });

  describe('toDateOnlyString', () => {
    it('deve formatar Date para YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(toDateOnlyString(date)).toBe('2024-01-15');
    });

    it('deve formatar string de data para YYYY-MM-DD', () => {
      expect(toDateOnlyString('2024-01-15T10:30:00Z')).toBe('2024-01-15');
    });

    it('deve lançar erro para data inválida', () => {
      expect(() => toDateOnlyString(null as any)).toThrow('Data inválida');
    });
  });

  describe('toUTCString', () => {
    it('deve formatar Date para ISO 8601 UTC', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(toUTCString(date)).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('nowUTC', () => {
    it('deve retornar Date atual', () => {
      const before = new Date();
      const result = nowUTC();
      const after = new Date();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('createUTCDate', () => {
    it('deve criar Date UTC a partir de componentes', () => {
      const result = createUTCDate(2024, 1, 15, 10, 30, 45);
      expect(result.toISOString()).toBe('2024-01-15T10:30:45.000Z');
    });

    it('deve usar valores padrão para hora, minuto e segundo', () => {
      const result = createUTCDate(2024, 1, 15);
      expect(result.toISOString()).toBe('2024-01-15T00:00:00.000Z');
    });

    it('deve converter mês de 1-12 para 0-11 internamente', () => {
      const result = createUTCDate(2024, 12, 25);
      expect(result.toISOString()).toBe('2024-12-25T00:00:00.000Z');
    });
  });

  describe('Casos de uso reais - Integração VMLav', () => {
    it('deve corrigir problema de 3h em datas da API VMLav', () => {
      // API VMLav retorna: "2024-01-15T10:30:00"
      const vmlavDate = '2024-01-15T10:30:00';

      // ERRADO: new Date() adiciona 3h (interpreta como UTC-3)
      const wrongDate = new Date(vmlavDate);
      // wrongDate seria 2024-01-15T13:30:00.000Z (3h a mais!)

      // CORRETO: parseUTCDate mantém o horário
      const correctDate = parseUTCDate(vmlavDate);

      expect(correctDate?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
      // Verifica que não há diferença de 3h
      expect(correctDate?.getUTCHours()).toBe(10); // 10h, não 13h
    });

    it('deve formatar datas para queries de API', () => {
      const date = new Date('2024-01-15T00:00:00Z');
      const formatted = toDateOnlyString(date);

      expect(formatted).toBe('2024-01-15');
      // Pode ser usado em: `${formatted}T00:00:00Z`
    });
  });

  describe('getFixedTimeInRange', () => {
    it('retorna o horário fixo quando ainda está no futuro', () => {
      const baseDate = new Date('2024-01-15T10:00:00.000Z');
      const result = getFixedTimeInRange('14:00', baseDate, 'America/Sao_Paulo');

      expect(result.getTime()).toBeGreaterThan(baseDate.getTime() + 60_000);
    });

    it('retorna agora + 1 min quando o horário fixo já passou', () => {
      const baseDate = new Date('2024-01-15T20:00:00.000Z');
      const result = getFixedTimeInRange('08:00', baseDate, 'America/Sao_Paulo');

      expect(result.getTime()).toBe(baseDate.getTime() + 60_000);
    });
  });
});
