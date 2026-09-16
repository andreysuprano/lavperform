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
  OPERATION_LIST_ID?: string;
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

const LIST_ID_PATTERN = /^T\d+_[0-9a-f-]{8,}$/i;

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

export function laundryKitTimestampPrefix(opId: string): string | null {
  const match = opId.trim().match(/^(T?\d+)/);
  return match ? match[1] : null;
}

export function resolveLaundryKitGroupKey(operation: LaundryKitOperation): string {
  const listId = operation.OPERATION_LIST_ID?.trim();
  if (listId) return listId;

  const paymentId = operation.PAYMENT_ID?.trim();
  if (paymentId && LIST_ID_PATTERN.test(paymentId)) return paymentId;

  const acquirer =
    operation.PAYMENT?.ID?.trim() || operation.PAYMENT_AUTHORIZATION_CODE?.trim();
  if (acquirer) return acquirer;

  return laundryKitTimestampPrefix(operation.OP_ID) ?? operation.OP_ID.trim();
}

export function groupLaundryKitOperations(
  operations: LaundryKitOperation[],
): LaundryKitOperation[][] {
  const buckets = new Map<string, LaundryKitOperation[]>();
  const order: string[] = [];

  for (const operation of operations) {
    const key = resolveLaundryKitGroupKey(operation);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
      order.push(key);
    }
    bucket.push(operation);
  }

  return order.map((key) => buckets.get(key)!);
}

function pickGroupTotal(operations: LaundryKitOperation[]): number {
  const finals = operations
    .map((operation) => operation.PAYMENT?.VALUE?.FINAL)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (finals.length === 0) return 0;
  return Math.min(...finals);
}

function pickGroupDiscount(operations: LaundryKitOperation[]): number {
  const discounts = operations
    .map((operation) => operation.PAYMENT?.VALUE?.DISCOUNT)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  if (discounts.length === 0) return 0;
  return Math.max(...discounts);
}

function mapMachineItem(operation: LaundryKitOperation) {
  const serviceName = resolveServiceName(operation);
  const machineName = operation.SERVICE?.DETAILS?.MACHINE_NAME?.trim();
  const iotId = operation.SERVICE?.DETAILS?.IOT_ID?.trim();

  return {
    itemId: toStableInt(iotId ?? operation.SERVICE?.DETAILS?.OP_TYPE),
    externalCode: iotId ?? operation.SERVICE?.DETAILS?.OP_TYPE,
    name: serviceName,
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    kind: 'service' as const,
    status: 'confirmed' as const,
    observation: machineName,
  };
}

export function mapLaundryKitGroupToIngestDto(
  operations: LaundryKitOperation[],
  clientCatalog?: LaundryKitClientCatalog,
): IngestOrderDto {
  if (operations.length === 0) {
    throw new Error('Grupo LaundryKit vazio');
  }

  const sorted = [...operations].sort(
    (a, b) =>
      (a.TIMESTAMP ?? 0) - (b.TIMESTAMP ?? 0) || a.OP_ID.localeCompare(b.OP_ID),
  );
  const representative = sorted[0];
  const total = pickGroupTotal(sorted);
  const discount = pickGroupDiscount(sorted);
  const customer = clientCatalog
    ? clientCatalog.resolveCustomer(representative)
    : {
        name: representative.USER?.NAME?.trim() || 'Cliente LaundryKit',
        cpf: representative.USER?.IDENTIFIER ?? representative.USER_IDENTIFIER,
      };
  const createdAt = timestampToIso(representative.TIMESTAMP);
  const finishedTimes = sorted
    .map((operation) => operation.SERVICE?.STEPS?.FINISHED)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const updatedAt =
    finishedTimes.length > 0
      ? timestampToIso(Math.max(...finishedTimes))
      : createdAt;

  const machineNames = sorted
    .map((operation) => operation.SERVICE?.DETAILS?.MACHINE_NAME?.trim())
    .filter(Boolean);
  const iotIds = sorted
    .map((operation) => operation.SERVICE?.DETAILS?.IOT_ID?.trim())
    .filter(Boolean);
  const auth =
    representative.PAYMENT_AUTHORIZATION_CODE?.trim() ||
    representative.PAYMENT?.ID?.trim();

  const observationParts = [
    machineNames.length > 0 ? `Máquinas: ${machineNames.join(', ')}` : undefined,
    iotIds.length > 0 ? `Equipamentos: ${iotIds.join(', ')}` : undefined,
    representative.SOURCE?.ID ? `Origem: ${representative.SOURCE.ID}` : undefined,
    auth ? `Auth: ${auth}` : undefined,
  ].filter(Boolean);

  const voucherOp = sorted.find(
    (operation) =>
      (operation.PAYMENT?.VALUE?.DISCOUNT ?? 0) > 0 &&
      operation.Voucher_Code &&
      operation.Voucher_Code !== '-',
  );

  const cancelled = sorted.every((operation) => operation.ACTION_DONE === false);

  return {
    externalOrderId:
      sorted.length === 1
        ? representative.OP_ID
        : (laundryKitTimestampPrefix(representative.OP_ID) ??
          resolveLaundryKitGroupKey(representative)),
    displayId: parseDisplayId(representative.OP_ID),
    status: cancelled ? 'cancelled' : 'closed',
    orderType: resolveOrderType(representative.SOURCE?.TYPE),
    orderTiming: representative.SERVICE_SCHEDULE ? 'scheduled' : 'instant',
    salesChannel: resolveSalesChannel(representative.SOURCE),
    customerOrigin: 'laundrykit',
    merchantId: toStableInt(representative.STORE_ID),
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
    items: sorted.map(mapMachineItem),
    payments: [
      {
        total,
        paymentType: 'offline',
        status: 'paid',
        paymentMethod: mapPaymentMethod(representative.PAYMENT?.TYPE),
        observation: representative.PAYMENT?.ACQUIRER_STATUS_MESSAGE,
        paymentFee: 0,
      },
    ],
    discounts:
      discount > 0
        ? [
            {
              type: 'voucher',
              value: discount,
              description: voucherOp
                ? `Voucher ${voucherOp.Voucher_Code}`
                : 'Desconto LaundryKit',
            },
          ]
        : undefined,
    createdAt,
    updatedAt,
  };
}

export function mapLaundryKitOperationToIngestDto(
  operation: LaundryKitOperation,
  clientCatalog?: LaundryKitClientCatalog,
): IngestOrderDto {
  return mapLaundryKitGroupToIngestDto([operation], clientCatalog);
}
