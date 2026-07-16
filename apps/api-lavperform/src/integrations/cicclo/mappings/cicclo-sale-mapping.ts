import { CiccloSale } from '../api/cicclo.types';
import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { parseUTCDate } from '../../../common/utils/date.utils';

export class CiccloSaleMapping {
  /**
   * Converte uma venda Cicclo para o formato de Order
   * @param sale - Dados da venda Cicclo
   * @param customerId - ID do cliente no sistema
   * @param companyId - ID da empresa
   */
  static toOrder(
    sale: CiccloSale,
    customerId: string,
    companyId: string,
  ): CreateOrderDto {
    const saleDate = parseUTCDate(sale.createdAt);
    const methodRaw = sale.payment.method?.trim();
    const method = methodRaw && methodRaw.length > 0 ? methodRaw : 'unknown';

    return {
      integratorOrderId: sale.id,
      displayId: sale.id,
      merchantId: 0,
      status: 'closed',
      orderType: 'delivery',
      orderTiming: 'immediate',
      salesChannel: 'CICCLO',
      customerOrigin: sale.origin,
      fiscalDocument: sale.payment.couponCode ?? undefined,
      observation: `Equipamento: ${sale.description} | Tipo: ${sale.machineType} | Loja: ${sale.store.name}`,
      deliveryFee: 0,
      serviceFee: 0,
      additionalFee: 0,
      total: sale.amount,
      companyId,
      customerId,
      createdAt: saleDate!,
      updatedAt: saleDate!,

      items: [
        {
          itemId: 0,
          externalCode: sale.description,
          name: `${sale.machineType} - ${sale.description}`,
          quantity: sale.count,
          unitPrice: sale.amount,
          totalPrice: sale.amount,
          kind: 'product',
          status: 'closed',
          observation: `Origem: ${sale.origin}`,
          items: [],
          options: [],
        },
      ],

      payments: [
        {
          total: sale.amount,
          paymentType: method,
          status: 'paid',
          paymentMethod: method,
          cardBrand: sale.payment.creditCardBrand ?? undefined,
          observation: sale.payment.authCode
            ? `Auth: ${sale.payment.authCode}`
            : undefined,
          paymentFee: 0,
        },
      ],

      discounts: [],
    };
  }
}
