import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Grupo de mensagens enviadas agrupadas por canal e (quando aplicável) categoria do template. */
export type MessageCostGroup = {
  channel: string;
  category?: string | null;
  count: number;
};

/** Item detalhando o tipo de mensagem enviada com sua contagem e custo total em BRL. */
export type MessageTypeBreakdownItem = {
  channel: string;
  category: string | null;
  count: number;
  cost: number;
};

/**
 * Calcula o custo das mensagens enviadas em BRL.
 *
 * WhatsApp Business API cobra por categoria de template (MARKETING, UTILITY,
 * AUTHENTICATION) em dólar; o valor é convertido para BRL pela cotação. Os
 * valores vêm do .env para permitir ajuste sem deploy.
 */
@Injectable()
export class MessageCostService {
  constructor(private readonly config: ConfigService) {}

  private getNumber(key: string, fallback: number): number {
    const parsed = Number(this.config.get<string>(key));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private get usdToBrlRate(): number {
    return this.getNumber('USD_TO_BRL_RATE', 0);
  }

  private whatsappBusinessCategoryCostUsd(category?: string | null): number {
    switch ((category ?? '').toUpperCase()) {
      case 'UTILITY':
        return this.getNumber('WHATSAPP_TEMPLATE_COST_UTILITY_USD', 0);
      case 'AUTHENTICATION':
        return this.getNumber('WHATSAPP_TEMPLATE_COST_AUTHENTICATION_USD', 0);
      case 'MARKETING':
      default:
        return this.getNumber('WHATSAPP_TEMPLATE_COST_MARKETING_USD', 0);
    }
  }

  /** Custo unitário (por mensagem enviada) em BRL para um canal/categoria. */
  unitCostBRL(channel: string, category?: string | null): number {
    switch ((channel ?? '').toUpperCase()) {
      case 'WHATSAPP_BUSINESS_API':
        return this.whatsappBusinessCategoryCostUsd(category) * this.usdToBrlRate;
      case 'SMS':
        return this.getNumber('SMS_COST_BRL', 0);
      case 'WHATSAPP_WEB':
      default:
        return 0;
    }
  }

  /** Custo total em BRL somando o custo de cada grupo de mensagens. */
  totalCostBRL(groups: MessageCostGroup[]): number {
    const total = groups.reduce(
      (acc, group) =>
        acc + this.unitCostBRL(group.channel, group.category) * Number(group.count),
      0,
    );
    return this.round(total);
  }

  /** Detalhamento por tipo de mensagem (canal + categoria) com contagem e custo. */
  buildBreakdown(groups: MessageCostGroup[]): MessageTypeBreakdownItem[] {
    return groups
      .filter((group) => Number(group.count) > 0)
      .map((group) => ({
        channel: group.channel,
        category: group.category ?? null,
        count: Number(group.count),
        cost: this.round(
          this.unitCostBRL(group.channel, group.category) * Number(group.count),
        ),
      }));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
