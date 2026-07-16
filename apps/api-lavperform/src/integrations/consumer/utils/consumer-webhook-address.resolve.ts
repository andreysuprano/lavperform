import type { AddressDto } from 'src/customers/application/dto/create-customer.dto';
import type {
  ConsumerWebhookDelivery,
  ConsumerWebhookEndereco,
  ConsumerWebhookPayload,
} from '../dto/consumer-webhook-payload.interface';

/** Endereço físico unificado (raiz `endereco` ou campos achatados em `delivery`). */
export type ResolvedConsumerPhysicalAddress = {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode?: string;
  reference?: string;
};

function enderecoObjectHasLines(e: ConsumerWebhookEndereco | undefined): boolean {
  if (!e) return false;
  return !!(
    e.logradouro?.trim() ||
    e.cidade?.trim() ||
    e.bairro?.trim()
  );
}

function fromEnderecoObject(e: ConsumerWebhookEndereco): ResolvedConsumerPhysicalAddress {
  return {
    street: (e.logradouro ?? '').trim(),
    number: (e.numero ?? '').trim(),
    complement: e.complemento?.trim() || undefined,
    neighborhood: (e.bairro ?? '').trim(),
    city: (e.cidade ?? '').trim(),
    state: (e.uf ?? '').trim(),
    zipCode: e.cep?.trim() || undefined,
    reference: e.referencia?.trim() || undefined,
  };
}

/**
 * No bloco `delivery`, `endereco` é string (logradouro), não o objeto da raiz.
 */
function deliveryFlatHasLines(d: ConsumerWebhookDelivery | undefined): boolean {
  if (!d) return false;
  return !!(
    d.endereco?.trim() ||
    d.cidade?.trim() ||
    d.bairro?.trim()
  );
}

function fromDeliveryFlat(d: ConsumerWebhookDelivery): ResolvedConsumerPhysicalAddress {
  return {
    street: (d.endereco ?? '').trim(),
    number: (d.endereconumero ?? '').trim(),
    neighborhood: (d.bairro ?? '').trim(),
    city: (d.cidade ?? '').trim(),
    state: (d.uf ?? '').trim(),
    zipCode: d.cep?.trim() || undefined,
    reference: undefined,
  };
}

/**
 * Preferência: objeto `endereco` na raiz; senão, endereço achatado em `delivery` (comum quando o cliente não traz logradouro próprio).
 */
export function resolveConsumerPhysicalAddress(
  payload: ConsumerWebhookPayload,
): ResolvedConsumerPhysicalAddress | undefined {
  if (enderecoObjectHasLines(payload.endereco)) {
    return fromEnderecoObject(payload.endereco!);
  }
  if (deliveryFlatHasLines(payload.delivery)) {
    return fromDeliveryFlat(payload.delivery!);
  }
  return undefined;
}

export function resolvedAddressToCustomerDto(
  r: ResolvedConsumerPhysicalAddress,
): AddressDto {
  return {
    street: r.street || undefined,
    number: r.number || undefined,
    complement: r.complement,
    neighborhood: r.neighborhood || undefined,
    city: r.city || undefined,
    state: r.state || undefined,
    zipCode: r.zipCode,
  };
}

export function customerNeedsAddressBackfill(customer: {
  addressId?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    neighborhood?: string | null;
  } | null;
}): boolean {
  if (!customer.addressId) {
    return true;
  }
  const a = customer.address;
  if (!a) {
    return true;
  }
  const hasLine =
    (a.street?.trim() ?? '') !== '' ||
    (a.city?.trim() ?? '') !== '' ||
    (a.neighborhood?.trim() ?? '') !== '';
  return !hasLine;
}
