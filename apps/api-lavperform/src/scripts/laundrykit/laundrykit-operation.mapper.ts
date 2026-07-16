import { IngestOrderDto } from '../../public-api/orders/application/dto/ingest-order.dto';
import { LaundryKitClientCatalog } from './laundrykit-client-catalog';

export interface LaundryKitPaymentValue {
  DISCOUNT?: number;
  INITIAL?: number;
  FINAL?: number;
}

export interface LaundryKitPayment {
  ACQUIRER_STATUS?: boolean;
  ACQUIRER_STATUS_MESSAGE?: string;
  ID?: string;
  TYPE?: string;
  VALUE?: LaundryKitPaymentValue;
}

export interface LaundryKitServiceDetails {
  IOT_ID?: string;
  MACHINE_NAME?: string;
  OP_TYPE?: string;
}

export interface LaundryKitService {
  DETAILS?: LaundryKitServiceDetails;
  STEPS?: {
    STARTED?: number;
    WORKING?: number;
    FINISHED?: number;
    STARTED_BUSY?: number;
  };
}

export interface LaundryKitSource {
  ID?: string;
  TYPE?: string;
  MANAGER_ID?: string | null;
  MANAGER_NAME?: string | null;
  MANAGER_IDENTIFIER?: string | null;
}

export interface LaundryKitUser {
  ID?: string;
  IDENTIFIER?: string;
  NAME?: string;
}

export interface LaundryKitOperation {
  OP_ID: string;
  PAYMENT_ID?: string;
  ACTION_EXTRA?: boolean;
  TIMESTAMP?: number;
  STORE_ID?: string;
  PAYMENT?: LaundryKitPayment;
  SERVICE?: LaundryKitService;
  SERVICE_COMBO?: unknown;
  SERVICE_LOCKER?: unknown;
  SERVICE_SCHEDULE?: unknown;
  SOURCE?: LaundryKitSource;
  USER?: LaundryKitUser;
  USER_MANAGER?: unknown;
  VOUCHER?: unknown;
  Voucher_Code?: string;
  Voucher_ID?: string | null;
  ACTION_DONE?: boolean;
  ACTION_MANAGER_MESSAGE?: string | null;
  PAYMENT_AUTHORIZATION_CODE?: string;
  USER_ID?: string;
  USER_IDENTIFIER?: string;
  ID_STORE_USER?: string;
  INVOICE_INFO?: unknown;
  PRODUCT_ID?: string | null;
  PRODUCT_CODE?: string | null;
  PRODUCT_NAME?: string | null;
  operationType?: string;
}

export interface LaundryKitOperationsResponse {
  operations?: LaundryKitOperation[];
}

const OP_TYPE_LABELS: Record<string, string> = {
  WASH: 'Lavagem',
  DRY: 'Secagem',
  DRYER: 'Secagem',
  COMBO: 'Combo',
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  PIX: 'pix',
  CREDIT: 'credit_card',
  CREDIT_CARD: 'credit_card',
  DEBIT: 'debit_card',
  DEBIT_CARD: 'debit_card',
  CASH: 'cash',
  MONEY: 'cash',
  VOUCHER: 'voucher',
};

function toStableInt(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.abs(Math.trunc(value)) % 0x7fffffff;
  }
  const str = String(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 0x7fffffff;
}

function parseDisplayId(opId: string): number {
  const match = opId.match(/^T(\d+)/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      return parsed % 0x7fffffff;
    }
  }
  return toStableInt(opId);
}

function mapPaymentMethod(paymentType?: string): string {
  if (!paymentType?.trim()) return 'unknown';
  const normalized = paymentType.trim().toUpperCase();
  return PAYMENT_METHOD_MAP[normalized] ?? paymentType.toLowerCase();
}

function resolveServiceName(operation: LaundryKitOperation): string {
  if (operation.PRODUCT_NAME?.trim()) {
    return operation.PRODUCT_NAME.trim();
  }
  if (operation.operationType?.trim()) {
    return operation.operationType.trim();
  }

  const opType = operation.SERVICE?.DETAILS?.OP_TYPE?.toUpperCase();
  if (opType && OP_TYPE_LABELS[opType]) {
    return OP_TYPE_LABELS[opType];
  }

  const machineName = operation.SERVICE?.DETAILS?.MACHINE_NAME?.trim();
  if (machineName) return machineName;

  return 'Serviço LaundryKit';
}

function resolveOrderType(sourceType?: string): string {
  const normalized = (sourceType ?? '').trim().toUpperCase();
  if (normalized === 'TOTEM') return 'pickup';
  if (normalized === 'APP' || normalized === 'MOBILE') return 'indoor';
  return 'pickup';
}

function resolveSalesChannel(source?: LaundryKitSource): string {
  const sourceType = (source?.TYPE ?? 'totem').trim().toLowerCase();
  return `laundrykit_${sourceType}`;
}

function timestampToIso(timestamp?: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return new Date().toISOString();
  }
  return new Date(timestamp).toISOString();
}

export function isLaundryKitOperationEligible(
  operation: LaundryKitOperation,
): boolean {
  if (!operation.OP_ID?.trim()) return false;
  if (operation.PAYMENT?.ACQUIRER_STATUS !== true) return false;
  return true;
}

export function mapLaundryKitOperationToIngestDto(
  operation: LaundryKitOperation,
  clientCatalog?: LaundryKitClientCatalog,
): IngestOrderDto {
  const total = operation.PAYMENT?.VALUE?.FINAL ?? 0;
  const discount = operation.PAYMENT?.VALUE?.DISCOUNT ?? 0;
  const customer = clientCatalog
    ? clientCatalog.resolveCustomer(operation)
    : {
        name: operation.USER?.NAME?.trim() || 'Cliente LaundryKit',
        cpf: operation.USER?.IDENTIFIER ?? operation.USER_IDENTIFIER,
      };
  const serviceName = resolveServiceName(operation);
  const machineName = operation.SERVICE?.DETAILS?.MACHINE_NAME?.trim();
  const iotId = operation.SERVICE?.DETAILS?.IOT_ID?.trim();
  const sourceType = operation.SOURCE?.TYPE;
  const createdAt = timestampToIso(operation.TIMESTAMP);
  const finishedAt = operation.SERVICE?.STEPS?.FINISHED;
  const updatedAt = finishedAt ? timestampToIso(finishedAt) : createdAt;

  const observationParts = [
    machineName ? `Máquina: ${machineName}` : undefined,
    iotId ? `Equipamento: ${iotId}` : undefined,
    operation.SOURCE?.ID ? `Origem: ${operation.SOURCE.ID}` : undefined,
    operation.PAYMENT_AUTHORIZATION_CODE
      ? `Auth: ${operation.PAYMENT_AUTHORIZATION_CODE}`
      : undefined,
  ].filter(Boolean);

  const dto: IngestOrderDto = {
    externalOrderId: operation.OP_ID,
    displayId: parseDisplayId(operation.OP_ID),
    status: operation.ACTION_DONE === false ? 'cancelled' : 'closed',
    orderType: resolveOrderType(sourceType),
    orderTiming: operation.SERVICE_SCHEDULE ? 'scheduled' : 'instant',
    salesChannel: resolveSalesChannel(operation.SOURCE),
    customerOrigin: 'laundrykit',
    merchantId: toStableInt(operation.STORE_ID),
    observation:
      observationParts.length > 0 ? observationParts.join(' | ') : undefined,
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total,
    customer: {
      name: customer.name,
      phone: customer.phone,
      cpf: customer.cpf,
      email: customer.email,
      birthDate: customer.birthDate,
    },
    items: [
      {
        itemId: toStableInt(iotId ?? operation.SERVICE?.DETAILS?.OP_TYPE),
        externalCode: iotId ?? operation.SERVICE?.DETAILS?.OP_TYPE,
        name: serviceName,
        quantity: 1,
        unitPrice: total,
        totalPrice: total,
        kind: 'service',
        status: 'confirmed',
        observation: machineName,
      },
    ],
    payments: [
      {
        total,
        paymentType: 'offline',
        status: 'paid',
        paymentMethod: mapPaymentMethod(operation.PAYMENT?.TYPE),
        observation: operation.PAYMENT?.ACQUIRER_STATUS_MESSAGE,
        paymentFee: 0,
      },
    ],
    discounts:
      discount > 0
        ? [
            {
              type: 'voucher',
              value: discount,
              description:
                operation.Voucher_Code && operation.Voucher_Code !== '-'
                  ? `Voucher ${operation.Voucher_Code}`
                  : 'Desconto LaundryKit',
            },
          ]
        : undefined,
    createdAt,
    updatedAt,
  };

  return dto;
}
