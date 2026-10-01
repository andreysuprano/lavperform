import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { CreateOrderItemDto } from '../../../orders/application/dto/create-order-item.dto';
import {
  AgidezCliente,
  AgidezPeca,
  AgidezProduto,
  AgidezServico,
  AgidezTicket,
} from '../api/agidez.types';

function digits(value?: string | null): string {
  return (value ?? '').replace(/\D/g, '');
}

export function agidezPhone(
  ddd?: string | null,
  celular?: string | null,
  storeDdd?: string | null,
): string | undefined {
  const number = digits(celular);
  if (!number) return undefined;
  if (number.startsWith('55') && number.length >= 12) return number;
  const area = digits(ddd);
  const prefix =
    area || (number.length === 9 && digits(storeDdd).length === 2 ? digits(storeDdd) : '');
  return `${prefix}${number}`;
}

/** Celular de 9 dígitos sem DDD, do jeito que a importação antiga gravou antes do DDD da loja. */
export function agidezLegacyRawPhone(
  ddd?: string | null,
  celular?: string | null,
): string | undefined {
  const number = digits(celular);
  if (digits(ddd) || number.length !== 9) return undefined;
  return number;
}

export function agidezCustomerName(
  nome?: string | null,
  sobrenome?: string | null,
): string {
  const full = [nome, sobrenome]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return full || 'Cliente';
}

export function agidezTicketNetTotal(ticket: AgidezTicket): number {
  return roundMoney(
    ticket.ValorTotalServicos -
      ticket.DescontoTotalServicos +
      ticket.ValorTotalProdutos -
      ticket.DescontoTotalProdutos,
  );
}

export function agidezExternalOrderId(
  storeCode: number,
  ticketCode: number,
): string {
  return `agidez:${storeCode}:${ticketCode}`;
}

export function agidezIntegratorOrderId(
  storeCode: number,
  ticketCode: number,
): number {
  const key = `${storeCode}-${ticketCode}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return hash === 0 ? 1 : hash;
}

const GENERIC_SERVICE_NAME = '*LAVANDERIA';

export function agidezItemName(
  serviceName?: string | null,
  pieceName?: string | null,
): string {
  const service = (serviceName ?? '').trim();
  const piece = (pieceName ?? '').trim();
  if ((!service || service.toUpperCase() === GENERIC_SERVICE_NAME) && piece) {
    return piece;
  }
  return service || piece || 'Serviço';
}

export function dedupeServices(services: AgidezServico[]): AgidezServico[] {
  const unique = new Map<string, AgidezServico>();
  for (const service of services) {
    const key = `${service.CodigoTicket}:${service.TicketPecaIndividual}:${service.Sequencia}`;
    if (!unique.has(key)) unique.set(key, service);
  }
  return [...unique.values()];
}

export class AgidezSaleMapping {
  static toCustomerIncoming(ticket: AgidezTicket, storeDdd?: string) {
    return {
      name: agidezCustomerName(ticket.NomeCliente),
      phone: agidezPhone(ticket.DDDCelular, ticket.Celular, storeDdd),
    };
  }

  static toCustomerIncomingFromCatalog(customer: AgidezCliente, storeDdd?: string) {
    return {
      name: agidezCustomerName(customer.Nome, customer.Sobrenome),
      phone: agidezPhone(customer.DDDCelular, customer.Celular, storeDdd),
      birthDate: customer.DataNasimento ?? undefined,
    };
  }

  static toOrder(
    ticket: AgidezTicket,
    services: AgidezServico[],
    products: AgidezProduto[],
    customerId: string | null,
    companyId: string,
    pieces: AgidezPeca[] = [],
  ): CreateOrderDto {
    const ticketServices = dedupeServices(
      services.filter((service) => service.CodigoTicket === ticket.CodigoTicket),
    );
    const ticketProducts = products.filter(
      (product) => product.CodigoTicket === ticket.CodigoTicket,
    );
    const total = agidezTicketNetTotal(ticket);
    const items = buildItems(ticket, ticketServices, ticketProducts, pieces, total);
    const discount =
      ticket.DescontoTotalServicos + ticket.DescontoTotalProdutos;
    const delivered =
      ticket.QuantidadeTotalPecas > 0 &&
      ticket.QuantidadeTotalPecasEntregues >= ticket.QuantidadeTotalPecas;

    return {
      externalOrderId: agidezExternalOrderId(
        ticket.CodigoLoja,
        ticket.CodigoTicket,
      ),
      integratorOrderId: agidezIntegratorOrderId(
        ticket.CodigoLoja,
        ticket.CodigoTicket,
      ),
      displayId: ticket.CodigoTicket,
      merchantId: ticket.CodigoLoja,
      status: delivered ? 'closed' : 'confirmed',
      orderType: 'takeout',
      orderTiming: 'immediate',
      salesChannel: 'AGIDEZ',
      customerOrigin: 'agidez',
      observation: `Agidez | Loja: ${ticket.CodigoLoja} | Ticket: ${ticket.CodigoTicket} | Cliente: ${ticket.CodigoCliente}`,
      deliveryFee: 0,
      serviceFee: 0,
      additionalFee: 0,
      total,
      companyId,
      customerId,
      createdAt: new Date(ticket.DataEmissao),
      updatedAt: new Date(ticket.DataEmissao),
      items,
      payments: [
        {
          total,
          paymentType: 'unknown',
          status: 'paid',
          paymentMethod: 'unknown',
          paymentFee: 0,
        },
      ],
      discounts:
        discount > 0
          ? [
              {
                type: 'discount',
                value: roundMoney(discount),
                description: 'Desconto Agidez',
              },
            ]
          : [],
    };
  }
}

function buildItems(
  ticket: AgidezTicket,
  services: AgidezServico[],
  products: AgidezProduto[],
  pieces: AgidezPeca[],
  total: number,
): CreateOrderItemDto[] {
  const pieceNameByCode = new Map<number, string>();
  for (const piece of pieces) {
    const name = (piece.NomePeca ?? '').trim();
    if (name && !pieceNameByCode.has(piece.Codigo)) {
      pieceNameByCode.set(piece.Codigo, name);
    }
  }

  const items: CreateOrderItemDto[] = services.map((service, index) => {
    const price = roundMoney(service.ValorUnitarioComAcrescimoDescontoTicket);
    return {
      itemId: index,
      externalCode: String(service.TicketPecaIndividual),
      name: agidezItemName(
        service.NomeServico,
        pieceNameByCode.get(service.TicketPecaIndividual),
      ),
      quantity: 1,
      unitPrice: price,
      totalPrice: price,
      kind: 'service',
      status: 'closed',
    };
  });

  for (const product of products) {
    const name = (product.NomeProduto ?? '').trim();
    if (!name) continue;
    const quantity = product.Quantidade && product.Quantidade > 0 ? product.Quantidade : 1;
    const unitPrice = roundMoney(
      product.ValorUnitarioComAcrescimoDescontoTicket ??
        product.ValorUnitario ??
        0,
    );
    items.push({
      itemId: items.length,
      externalCode: product.Codigo != null ? String(product.Codigo) : undefined,
      name,
      quantity,
      unitPrice,
      totalPrice: roundMoney(unitPrice * quantity),
      kind: 'product',
      status: 'closed',
    });
  }

  if (items.length > 0) return items;

  return [
    {
      itemId: 0,
      externalCode: String(ticket.CodigoTicket),
      name: 'Serviços de lavanderia',
      quantity: 1,
      unitPrice: total,
      totalPrice: total,
      kind: 'service',
      status: 'closed',
    },
  ];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
