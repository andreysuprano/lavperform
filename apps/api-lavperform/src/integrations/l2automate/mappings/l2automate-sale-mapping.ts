import { L2AutomateSale } from '../api/l2automate.types';
import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { parseUTCDate } from '../../../common/utils/date.utils';

/**
 * Converte um UUID string em um hash numérico inteiro com sinal (32-bit)
 * para compatibilidade com o campo integratorOrderId (Int) do banco de dados.
 */
function uuidToIntHash(uuid: string): number {
  const hex = uuid.replace(/-/g, '');
  let hash = 0;
  for (let i = 0; i < hex.length; i += 8) {
    const chunk = parseInt(hex.substring(i, i + 8), 16);
    hash = ((hash ^ chunk) | 0);
  }
  return hash;
}

export class L2AutomateSaleMapping {
  /**
   * Converte uma venda L2 Automate para o formato de Order
   * @param sale - Dados da venda L2 Automate
   * @param customerId - ID do cliente no sistema
   * @param companyId - ID da empresa
   */
  static toOrder(
    sale: L2AutomateSale,
    customerId: string,
    companyId: string,
  ): CreateOrderDto {
    const saleDate = parseUTCDate(sale.createdAt);
    const methodRaw = sale.payment.method?.trim();
    const method = methodRaw && methodRaw.length > 0 ? methodRaw : 'unknown';
    const intHash = uuidToIntHash(sale.id);

    const items = sale.items?.length
      ? sale.items.map((item, idx) => ({
          itemId: idx,
          externalCode: item.description,
          name: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          kind: 'product' as const,
          status: 'closed' as const,
          observation: item.observation ?? undefined,
          items: [],
          options: [],
        }))
      : [
          {
            itemId: 0,
            externalCode: sale.description,
            name: sale.description,
            quantity: sale.count,
            unitPrice: sale.amount,
            totalPrice: sale.amount,
            kind: 'product' as const,
            status: 'closed' as const,
            observation: undefined,
            items: [],
            options: [],
          },
        ];

    return {
      integratorOrderId: intHash,
      displayId: intHash,
      merchantId: 0,
      status: 'closed',
      orderType: 'delivery',
      orderTiming: 'immediate',
      salesChannel: 'L2AUTOMATE',
      customerOrigin: sale.origin,
      observation: `Bolha de Sabão | ID: ${sale.id} | Origem: ${sale.origin}`,
      deliveryFee: 0,
      serviceFee: 0,
      additionalFee: 0,
      total: sale.amount,
      companyId,
      customerId,
      createdAt: saleDate!,
      updatedAt: saleDate!,

      items,

      payments: [
        {
          total: sale.amount,
          paymentType: method,
          status: 'paid',
          paymentMethod: method,
          paymentFee: 0,
        },
      ],

      discounts: [],
    };
  }

  /**
   * Extrai o hash inteiro do UUID de uma venda para deduplicação
   */
  static getIntegratorOrderId(saleId: string): number {
    return uuidToIntHash(saleId);
  }
}
