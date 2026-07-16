import { RecencyStrategy } from '../../../../src/rfv-engine/infrastructure/strategies/recency.strategy';

describe('RecencyStrategy', () => {
  let strategy: RecencyStrategy;

  beforeEach(() => {
    strategy = new RecencyStrategy();
  });

  describe('calculateScore', () => {
    const thresholds = [14, 30, 60, 90]; // dias

    it('deve retornar score 5 para compras de hoje (0 dias)', () => {
      const score = strategy.calculateScore(0, thresholds);
      expect(score).toBe(5);
    });

    it('deve retornar score 5 para compras muito recentes (dentro de 14 dias)', () => {
      expect(strategy.calculateScore(1, thresholds)).toBe(5);
      expect(strategy.calculateScore(7, thresholds)).toBe(5);
      expect(strategy.calculateScore(14, thresholds)).toBe(5);
    });

    it('deve retornar score 4 para compras recentes (15-30 dias)', () => {
      expect(strategy.calculateScore(15, thresholds)).toBe(4);
      expect(strategy.calculateScore(25, thresholds)).toBe(4);
      expect(strategy.calculateScore(30, thresholds)).toBe(4);
    });

    it('deve retornar score 3 para recência média (31-60 dias)', () => {
      expect(strategy.calculateScore(31, thresholds)).toBe(3);
      expect(strategy.calculateScore(45, thresholds)).toBe(3);
      expect(strategy.calculateScore(60, thresholds)).toBe(3);
    });

    it('deve retornar score 2 para baixa recência (61-90 dias)', () => {
      expect(strategy.calculateScore(61, thresholds)).toBe(2);
      expect(strategy.calculateScore(75, thresholds)).toBe(2);
      expect(strategy.calculateScore(90, thresholds)).toBe(2);
    });

    it('deve retornar score 1 para clientes inativos (mais de 90 dias)', () => {
      expect(strategy.calculateScore(91, thresholds)).toBe(1);
      expect(strategy.calculateScore(120, thresholds)).toBe(1);
      expect(strategy.calculateScore(365, thresholds)).toBe(1);
    });

    it('deve retornar score 1 para valores null ou undefined', () => {
      expect(strategy.calculateScore(null as any, thresholds)).toBe(1);
      expect(strategy.calculateScore(undefined as any, thresholds)).toBe(1);
    });

    it('deve retornar score 1 para valores negativos', () => {
      expect(strategy.calculateScore(-1, thresholds)).toBe(1);
      expect(strategy.calculateScore(-10, thresholds)).toBe(1);
    });
  });

  describe('Casos de uso reais - Cliente que comprou hoje', () => {
    it('cliente que comprou hoje não deve ser classificado como perdido', () => {
      const thresholds = [14, 30, 60, 90];
      const daysSinceLastOrder = 0; // comprou hoje
      
      const recencyScore = strategy.calculateScore(daysSinceLastOrder, thresholds);
      
      // Cliente que comprou hoje deve ter score máximo de recência (5)
      expect(recencyScore).toBe(5);
      
      // Com score 5 de recência, nunca será classificado como "Perdido"
      // Perdido requer R=1 (inativo há mais de 90 dias)
      // Possíveis classificações com R=5: Campeão, Fiel, Em Potencial, Novo, Promissor
    });

    it('cliente novo que comprou hoje deve ter classificação correta', () => {
      const recencyScore = strategy.calculateScore(0, [14, 30, 60, 90]);
      
      // R=5, F=1 (1 compra), M=1 (valor baixo) = "511" = Novo
      expect(recencyScore).toBe(5);
    });
  });
});
