import { VmLavSale } from '../api/vmlav.types';
import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { parseUTCDate } from '../../../common/utils/date.utils';

export class VmLavSaleMapping {
  /**
   * Converte uma venda VM Lav para o formato de Order
   * @param sale - Dados da venda VM Lav
   * @param customerId - ID do cliente no sistema
   * @param companyId - ID da empresa
   */
  static toOrder(sale: VmLavSale, customerId: string, companyId: string): CreateOrderDto {
    const saleDate = parseUTCDate(sale.data);
    
    return {
      integratorOrderId: sale.idVenda,
      displayId: sale.idVenda,
      merchantId: sale.idLavanderia,
      status: sale.status === 'SUCESSO' ? 'closed' : 'cancelled',
      orderType: 'delivery',
      orderTiming: 'immediate',
      salesChannel: 'VMLAV',
      customerOrigin: sale.provedor,
      fiscalDocument: sale.cupom || undefined,
      observation: `Equipamento: ${sale.equipamento} | Lavanderia: ${sale.lavanderia}`,
      deliveryFee: 0,
      serviceFee: 0,
      additionalFee: 0,
      total: sale.valor,
      companyId: companyId,
      customerId: customerId,
      createdAt: saleDate!,
      updatedAt: saleDate!,
      
      // Items - Serviços de lavagem
      items: sale.pedido.itens.map((item) => ({
        itemId: 0, // VM Lav não fornece ID do item
        externalCode: item.maquina,
        name: item.servico,
        quantity: 1,
        unitPrice: item.valor,
        totalPrice: item.valor,
        kind: 'product',
        status: 'closed',
        observation: `${item.tipoServico} | Máquina: ${item.maquina}`,
        items: [],
        options: [],
      })),

      // Payments - Informações de pagamento
      payments: [{
        total: sale.valor,
        paymentType: sale.tipoPagamento,
        status: sale.status === 'SUCESSO' ? 'paid' : 'failed',
        paymentMethod: sale.tipoCartao || sale.tipoPagamento,
        cardBrand: sale.bandeiraCartao || undefined,
        observation: `Adquirente: ${sale.adquirente} | Provedor: ${sale.provedor} | Autorização: ${sale.codigoAutorizacaoEmissor}`,
        paymentFee: 0,
      }],

      // Discounts - Desconto se houver
      discounts: sale.valorSemDesconto > sale.valor
        ? [{
            type: 'percentage',
            value: sale.valorSemDesconto - sale.valor,
            description: 'Desconto aplicado',
          }]
        : [],
    };
  }
}
