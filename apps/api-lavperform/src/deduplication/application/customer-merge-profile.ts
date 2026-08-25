import { isPlaceholderCustomerName } from '../../common/utils/name-similarity';

export type MergeableCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birthDate: Date | null;
  gender: string | null;
  observations: string | null;
  avatarUrl: string | null;
  whatsappVerified: boolean;
  whatsappVerifiedAt: Date | null;
  whatsappOptin: boolean;
  addressId: string | null;
};

export type MergedProfilePlan = {
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  birthDate: Date | null;
  gender: string | null;
  observations: string | null;
  avatarUrl: string | null;
  whatsappVerified: boolean;
  whatsappVerifiedAt: Date | null;
  whatsappOptin: boolean;
  addressId: string | null;
  stealAddressFromCustomerId: string | null;
  deleteOrphanAddressIds: string[];
};

export function shouldPreferIncomingName(
  existingName: string | null | undefined,
  incomingName: string,
): boolean {
  const existing = existingName?.trim() ?? '';
  if (!existing || isPlaceholderCustomerName(existing)) return true;

  const existingTokens = existing.split(/\s+/).filter(Boolean);
  const incomingTokens = incomingName.split(/\s+/).filter(Boolean);

  if (incomingTokens.length > existingTokens.length) return true;
  if (
    incomingTokens.length === existingTokens.length &&
    incomingName.length > existing.length
  ) {
    return true;
  }
  return false;
}

function firstFilled<T>(
  survivorValue: T | null | undefined,
  absorbed: MergeableCustomer[],
  pick: (customer: MergeableCustomer) => T | null | undefined,
): T | null {
  if (survivorValue !== null && survivorValue !== undefined && survivorValue !== '') {
    return survivorValue as T;
  }
  for (const customer of absorbed) {
    const value = pick(customer);
    if (value !== null && value !== undefined && value !== '') {
      return value as T;
    }
  }
  return survivorValue ?? null;
}

export function planMergedProfile(
  survivor: MergeableCustomer,
  absorbed: MergeableCustomer[],
): MergedProfilePlan {
  const orderedAbsorbed = [...absorbed].sort((a, b) => a.id.localeCompare(b.id));

  let name = survivor.name;
  for (const customer of orderedAbsorbed) {
    if (shouldPreferIncomingName(name, customer.name)) {
      name = customer.name;
    }
  }

  const whatsappOptin = [survivor, ...orderedAbsorbed].every(
    (customer) => customer.whatsappOptin !== false,
  );

  let whatsappVerified = survivor.whatsappVerified;
  let whatsappVerifiedAt = survivor.whatsappVerifiedAt;
  if (!whatsappVerified) {
    const verified = orderedAbsorbed.find((customer) => customer.whatsappVerified);
    if (verified) {
      whatsappVerified = true;
      whatsappVerifiedAt = verified.whatsappVerifiedAt;
    }
  }

  let addressId = survivor.addressId;
  let stealAddressFromCustomerId: string | null = null;
  const deleteOrphanAddressIds: string[] = [];

  if (!addressId) {
    const withAddress = orderedAbsorbed.find((customer) => customer.addressId);
    if (withAddress?.addressId) {
      addressId = withAddress.addressId;
      stealAddressFromCustomerId = withAddress.id;
    }
  } else {
    for (const customer of orderedAbsorbed) {
      if (customer.addressId && customer.addressId !== addressId) {
        deleteOrphanAddressIds.push(customer.addressId);
      }
    }
  }

  return {
    name,
    phone: firstFilled(survivor.phone, orderedAbsorbed, (c) => c.phone),
    email: firstFilled(survivor.email, orderedAbsorbed, (c) => c.email),
    cpf: firstFilled(survivor.cpf, orderedAbsorbed, (c) => c.cpf),
    birthDate: firstFilled(survivor.birthDate, orderedAbsorbed, (c) => c.birthDate),
    gender: firstFilled(survivor.gender, orderedAbsorbed, (c) => c.gender),
    observations: firstFilled(survivor.observations, orderedAbsorbed, (c) => c.observations),
    avatarUrl: firstFilled(survivor.avatarUrl, orderedAbsorbed, (c) => c.avatarUrl),
    whatsappVerified,
    whatsappVerifiedAt,
    whatsappOptin,
    addressId,
    stealAddressFromCustomerId,
    deleteOrphanAddressIds,
  };
}
