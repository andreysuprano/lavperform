import { IngestOrderDto } from '../../../public-api/orders/application/dto/ingest-order.dto';
import { IngestCustomerDto } from '../../../public-api/orders/application/dto/ingest-customer.dto';
import { IngestOrderItemDto } from '../../../public-api/orders/application/dto/ingest-order-item.dto';
import { IngestOrderPaymentDto } from '../../../public-api/orders/application/dto/ingest-order-payment.dto';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';
import { VmLavCustomerDetail, VmLavSale } from '../api/vmlav.types';
import { digitsOnly, normalizeVmLavPhone } from './vmlav-customer-mapping';

function toIsoDate(value: string | undefined | null): string | undefined {
  const parsed = parseUTCDate(value);
  return parsed?.toISOString();
}

function mapGender(genero: string | undefined | null): IngestCustomerDto['gender'] | undefined {
  if (!genero) return undefined;
  if (genero === 'M' || genero === 'F') return genero;
  return 'Outro';
}

function mapCustomer(
  sale: VmLavSale,
  customerDetail?: VmLavCustomerDetail | null,
): IngestCustomerDto | null {
  const name = (customerDetail?.nome ?? sale.nomeCliente)?.trim();
  if (!name) return null;

  const rawPhone = normalizeVmLavPhone(
    customerDetail?.telefone ?? sale.telefoneCliente,
  );
  const phoneDigits = digitsOnly(rawPhone);
  const cpf = digitsOnly(customerDetail?.cpf ?? sale.cpfCliente);

  if (phoneDigits.length === 0 && cpf.length === 0) {
    return null;
  }

  const birthSource = customerDetail?.dataNascimento ?? sale.dtaNascimento;
  const birthParsed = parseUTCDate(birthSource);
  const birthDate = birthParsed ? toDateOnlyString(birthParsed) : undefined;

  return {
    name,
    phone: phoneDigits.length > 0 ? phoneDigits : undefined,
    cpf: cpf.length > 0 ? cpf : undefined,
    email: (customerDetail?.email || sale.emailCliente || undefined) || undefined,
    birthDate,
    gender: mapGender(customerDetail?.genero),
  };
}

function mapItems(sale: VmLavSale): IngestOrderItemDto[] {
  return (sale.pedido?.itens ?? []).map((item) => ({
    itemId: 0,
    externalCode: item.maquina,
    name: item.servico,
    quantity: 1,
    unitPrice: item.valor,
    totalPrice: item.valor,
    kind: 'service',
    status: sale.status === 'SUCESSO' ? 'confirmed' : 'cancelled',
    observation: `${item.tipoServico} | Máquina: ${item.maquina}`,
  }));
}

function mapPayments(sale: VmLavSale): IngestOrderPaymentDto[] {
  return [
    {
      total: sale.valor,
      paymentType: sale.tipoPagamento || 'unknown',
      status: sale.status === 'SUCESSO' ? 'paid' : 'failed',
      paymentMethod: sale.tipoCartao || sale.tipoPagamento || 'unknown',
      cardBrand: sale.bandeiraCartao || undefined,
      observation: `Adquirente: ${sale.adquirente} | Provedor: ${sale.provedor} | Autorização: ${sale.codigoAutorizacaoEmissor}`,
      paymentFee: 0,
    },
  ];
}

export function isVmLavSaleReadyForIngestion(sale: VmLavSale): boolean {
  if (sale.idVenda == null || !sale.nomeCliente?.trim()) return false;

  const phone = digitsOnly(normalizeVmLavPhone(sale.telefoneCliente));
  const cpf = digitsOnly(sale.cpfCliente);
  return phone.length > 0 || cpf.length > 0;
}

/**
 * Converte uma venda VM Lav para o contrato da API aberta (`IngestOrderDto`),
 * reutilizando a fila e as regras de cliente/pedido de `public-api-order-ingestion`.
 */
export function mapVmLavSaleToIngestOrder(
  sale: VmLavSale,
  partnerId: string,
  customerDetail?: VmLavCustomerDetail | null,
): IngestOrderDto | null {
  if (sale.idVenda == null) return null;

  const customer = mapCustomer(sale, customerDetail);
  if (!customer) return null;

  const saleDate = parseUTCDate(sale.data);
  if (!saleDate) return null;

  const createdAt = saleDate.toISOString();
  const discountValue =
    sale.valorSemDesconto > sale.valor
      ? sale.valorSemDesconto - sale.valor
      : 0;

  return {
    externalOrderId: String(sale.idVenda),
    displayId: sale.idVenda,
    status: sale.status === 'SUCESSO' ? 'closed' : 'cancelled',
    orderType: 'delivery',
    orderTiming: 'instant',
    salesChannel: 'VMLAV',
    partnerId,
    customerOrigin: sale.provedor || 'VMLAV',
    merchantId: sale.idLavanderia,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total: sale.valor,
    fiscalDocument: sale.cupom || undefined,
    observation: `Equipamento: ${sale.equipamento} | Lavanderia: ${sale.lavanderia}`,
    customer,
    items: mapItems(sale),
    payments: mapPayments(sale),
    discounts:
      discountValue > 0
        ? [
            {
              type: 'discount',
              value: discountValue,
              description: 'Desconto aplicado',
            },
          ]
        : undefined,
    createdAt,
    updatedAt: createdAt,
  };
}
