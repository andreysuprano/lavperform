import { CreateCustomerDto } from '../../../customers/application/dto/create-customer.dto';
import { UpdateCustomerDto } from '../../../customers/application/dto/update-customer.dto';
import { CreateOrderDto } from '../../../orders/application/dto/create-order.dto';
import { safeFormatPhoneNumber } from '../../../common/utils/formatters';
import { isPlaceholderCustomerName } from '../../../common/utils/name-similarity';
import { PublicApiContext } from '../../auth/interfaces/api-context.interface';
import { IngestCustomerDto } from './dto/ingest-customer.dto';
import { IngestOrderDto } from './dto/ingest-order.dto';

function normalizeCpf(cpf?: string): string | undefined {
  if (!cpf) return undefined;
  const digits = cpf.replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

/** Prefere nome mais completo; nao troca "Thais Oliveira" por "Thais". */
function shouldUpdateCustomerName(
  existingName: string | null | undefined,
  incomingName: string,
): boolean {
  const existing = existingName?.trim() ?? '';
  if (!existing || isPlaceholderCustomerName(existing)) return true;

  const existingTokens = existing.split(/\s+/).filter(Boolean);
  const incomingTokens = incomingName.split(/\s+/).filter(Boolean);

  // Nome incoming mais completo (mais tokens) ou do mesmo tamanho e mais longo.
  if (incomingTokens.length > existingTokens.length) return true;
  if (
    incomingTokens.length === existingTokens.length &&
    incomingName.length > existing.length
  ) {
    return true;
  }
  return false;
}

export function mapIngestCustomerToCreateDto(customer: IngestCustomerDto): CreateCustomerDto {
  const formattedPhone = safeFormatPhoneNumber(customer.phone);
  return new CreateCustomerDto({
    name: customer.name,
    phone: formattedPhone ?? undefined,
    email: customer.email,
    cpf: normalizeCpf(customer.cpf),
    birthDate: customer.birthDate,
    gender: customer.gender,
    address: customer.address,
  });
}

export function mapIngestCustomerToUpdateDto(
  existing: { name: string; phone?: string | null; email?: string | null; cpf?: string | null; birthDate?: Date | null; gender?: string | null },
  incoming: IngestCustomerDto,
): UpdateCustomerDto {
  const formattedPhone = safeFormatPhoneNumber(incoming.phone);
  const dto: UpdateCustomerDto = {};

  const incomingName = incoming.name?.trim();
  if (incomingName && shouldUpdateCustomerName(existing.name, incomingName)) {
    dto.name = incomingName;
  }
  if (formattedPhone) {
    dto.phone = formattedPhone;
  }
  if (incoming.email !== undefined) {
    dto.email = incoming.email;
  }
  const cpf = normalizeCpf(incoming.cpf);
  if (cpf) {
    dto.cpf = cpf;
  }
  if (incoming.birthDate) {
    dto.birthDate = incoming.birthDate;
  }
  if (incoming.gender) {
    dto.gender = incoming.gender;
  }
  if (incoming.address) {
    dto.address = incoming.address;
  }

  return dto;
}

export function mapIngestOrderToCreateDto(
  payload: IngestOrderDto,
  ctx: PublicApiContext,
  customerId: string,
  partner?: { partnerSlug: string | null; name: string },
): CreateOrderDto {
  const salesChannel =
    payload.salesChannel?.trim() ||
    partner?.partnerSlug?.trim() ||
    (partner ? partner.name.toLowerCase().replace(/\s+/g, '_') : undefined) ||
    'public_api';

  const dto = new CreateOrderDto();
  dto.externalOrderId = payload.externalOrderId;
  dto.displayId = payload.displayId;
  dto.merchantId = payload.merchantId ?? 0;
  dto.status = payload.status;
  dto.orderType = payload.orderType;
  dto.orderTiming = payload.orderTiming;
  dto.salesChannel = salesChannel;
  dto.customerOrigin = payload.customerOrigin ?? salesChannel;
  dto.tableNumber = payload.tableNumber;
  dto.estimatedTime = payload.estimatedTime;
  dto.cancellationReason = payload.cancellationReason;
  dto.fiscalDocument = payload.fiscalDocument;
  dto.observation = payload.observation;
  dto.deliveryFee = payload.deliveryFee;
  dto.serviceFee = payload.serviceFee;
  dto.additionalFee = payload.additionalFee;
  dto.total = payload.total;
  dto.companyId = ctx.companyId;
  dto.customerId = customerId;
  dto.partnerId = payload.partnerId;
  dto.createdAt = new Date(payload.createdAt);
  dto.updatedAt = new Date(payload.updatedAt);
  dto.deliveryAddress = payload.deliveryAddress as CreateOrderDto['deliveryAddress'];
  dto.schedule = payload.schedule
    ? {
        deliveryDateRaw: payload.schedule.deliveryDateRaw,
        deliveryTimeRaw: payload.schedule.deliveryTimeRaw,
        deliveryAt: payload.schedule.deliveryAt
          ? new Date(payload.schedule.deliveryAt)
          : undefined,
      }
    : undefined;
  dto.items = payload.items as CreateOrderDto['items'];
  dto.payments = payload.payments as CreateOrderDto['payments'];
  dto.discounts = payload.discounts as CreateOrderDto['discounts'];

  return dto;
}

export function normalizeCpfForLookup(cpf?: string): string | undefined {
  return normalizeCpf(cpf);
}
