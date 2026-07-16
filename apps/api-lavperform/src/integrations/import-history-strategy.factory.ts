import { Injectable } from '@nestjs/common';
import { IImportHistoryStrategy } from './import-history-strategy.interface';

/**
 * Factory que resolve a estratégia de importação de histórico de pedidos
 * com base no partnerSlug da integração da empresa.
 *
 * Parceiros de lavanderia (VMLAV, CICCLO, L2AUTOMATE, MAXLAV) usam rotas
 * dedicadas em AdminIntegrationsService — não passam por esta factory.
 *
 * Para adicionar suporte unificado a um novo parceiro:
 *  1. Crie uma classe que implemente IImportHistoryStrategy
 *  2. Injete-a nesta factory
 *  3. Registre o slug no mapa abaixo
 */
@Injectable()
export class ImportHistoryStrategyFactory {
  private readonly strategies: Map<string, IImportHistoryStrategy>;

  constructor() {
    this.strategies = new Map<string, IImportHistoryStrategy>();
  }

  /**
   * Retorna a estratégia correspondente ao partnerSlug.
   * Retorna `null` se o parceiro não tiver estratégia unificada registrada.
   */
  resolve(partnerSlug: string): IImportHistoryStrategy | null {
    return this.strategies.get(partnerSlug) ?? null;
  }
}
