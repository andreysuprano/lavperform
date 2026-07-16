import { postLaundrykitRoute, LaundryKitRouteArgs } from './laundrykit-api.client';
import { LaundryKitOperation } from './laundrykit-operation.mapper';

export interface LaundryKitClientDetails {
  Cellphone?: string;
  cellphone?: string;
  CellphoneCode?: string;
  cellphoneCode?: string;
  Identifier?: string;
  identifier?: string;
  Name?: string;
  name?: string;
  BirthDay?: string | null;
  birthDay?: string | null;
}

export interface LaundryKitClientUser {
  USER_ID?: string;
  user_ID?: string;
  fullPhoneNumber?: string;
  Auth_Email?: string;
  auth_Email?: string;
  Details?: LaundryKitClientDetails;
  details?: LaundryKitClientDetails;
  AuthCredentials?: { Email?: string; email?: string };
  authCredentials?: { Email?: string; email?: string };
}

export interface LaundryKitStoreClient {
  ID: string;
  USER_ID?: string;
  USER?: LaundryKitClientUser;
}

export interface LaundryKitClientsResponse {
  clients?: LaundryKitStoreClient[];
}

export interface LaundryKitEnrichedCustomer {
  name: string;
  phone?: string;
  cpf?: string;
  email?: string;
  birthDate?: string;
}

function digitsOnly(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

function normalizeUserId(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;

  const trimmed = value.trim();
  const [firstPart] = trimmed.split('_');
  return firstPart || trimmed;
}

function pickDetails(user?: LaundryKitClientUser): LaundryKitClientDetails | undefined {
  return user?.Details ?? user?.details;
}

function pickEmail(user?: LaundryKitClientUser): string | undefined {
  return (
    user?.Auth_Email?.trim() ||
    user?.auth_Email?.trim() ||
    user?.AuthCredentials?.Email?.trim() ||
    user?.AuthCredentials?.email?.trim() ||
    user?.authCredentials?.Email?.trim() ||
    user?.authCredentials?.email?.trim() ||
    undefined
  );
}

function pickPhone(user?: LaundryKitClientUser): string | undefined {
  const fullPhone = digitsOnly(user?.fullPhoneNumber);
  if (fullPhone) return fullPhone;

  const details = pickDetails(user);
  const cellphone = digitsOnly(details?.Cellphone ?? details?.cellphone);
  const cellphoneCode = digitsOnly(details?.CellphoneCode ?? details?.cellphoneCode);

  if (cellphone && cellphoneCode) {
    if (cellphone.startsWith(cellphoneCode)) {
      return cellphone;
    }
    return `${cellphoneCode}${cellphone}`;
  }

  return cellphone;
}

function pickCpf(details?: LaundryKitClientDetails): string | undefined {
  return digitsOnly(details?.Identifier ?? details?.identifier);
}

function pickName(
  details?: LaundryKitClientDetails,
  fallback?: string,
): string {
  return (
    details?.Name?.trim() ||
    details?.name?.trim() ||
    fallback?.trim() ||
    'Cliente LaundryKit'
  );
}

function pickBirthDate(details?: LaundryKitClientDetails): string | undefined {
  const raw = details?.BirthDay ?? details?.birthDay;
  if (!raw?.trim()) return undefined;
  return raw.trim();
}

function splitPhoneOrCpf(identifier?: string): { phone?: string; cpf?: string } {
  const digits = digitsOnly(identifier);
  if (!digits) return {};

  if (digits.length === 11) {
    return { cpf: digits };
  }

  return { phone: digits };
}

export class LaundryKitClientCatalog {
  private readonly byUserId = new Map<string, LaundryKitStoreClient>();
  private readonly byIdentifier = new Map<string, LaundryKitStoreClient>();

  static fromClients(clients: LaundryKitStoreClient[]): LaundryKitClientCatalog {
    const catalog = new LaundryKitClientCatalog();

    for (const client of clients) {
      const user = client.USER;
      const details = pickDetails(user);
      const userIds = [
        client.USER_ID,
        user?.USER_ID,
        user?.user_ID,
      ]
        .map(normalizeUserId)
        .filter(Boolean) as string[];

      for (const userId of userIds) {
        catalog.byUserId.set(userId, client);
      }

      const identifiers = [
        pickCpf(details),
        digitsOnly(client.ID.split('.').pop()),
      ].filter(Boolean) as string[];

      for (const identifier of identifiers) {
        catalog.byIdentifier.set(identifier, client);
      }
    }

    return catalog;
  }

  get size(): number {
    return this.byUserId.size;
  }

  lookup(operation: LaundryKitOperation): LaundryKitStoreClient | undefined {
    const userIds = [
      operation.USER_ID,
      operation.USER?.ID,
    ]
      .map(normalizeUserId)
      .filter(Boolean) as string[];

    for (const userId of userIds) {
      const byId = this.byUserId.get(userId);
      if (byId) return byId;
    }

    const identifiers = [
      operation.USER_IDENTIFIER,
      operation.USER?.IDENTIFIER,
    ]
      .map(digitsOnly)
      .filter(Boolean) as string[];

    for (const identifier of identifiers) {
      const byIdentifier = this.byIdentifier.get(identifier);
      if (byIdentifier) return byIdentifier;
    }

    return undefined;
  }

  resolveCustomer(operation: LaundryKitOperation): LaundryKitEnrichedCustomer {
    const fallbackName =
      operation.USER?.NAME?.trim() || operation.USER_IDENTIFIER || 'Cliente LaundryKit';
    const fallbackIdentifier =
      operation.USER?.IDENTIFIER ?? operation.USER_IDENTIFIER;
    const fallbackContact = splitPhoneOrCpf(fallbackIdentifier);

    const client = this.lookup(operation);
    if (!client?.USER) {
      return {
        name: fallbackName,
        phone: fallbackContact.phone,
        cpf: fallbackContact.cpf,
      };
    }

    const user = client.USER;
    const details = pickDetails(user);

    return {
      name: pickName(details, fallbackName),
      phone: pickPhone(user) ?? fallbackContact.phone,
      cpf: pickCpf(details) ?? fallbackContact.cpf,
      email: pickEmail(user),
      birthDate: pickBirthDate(details),
    };
  }
}

export async function fetchLaundrykitClientCatalog(
  args: LaundryKitRouteArgs,
): Promise<LaundryKitClientCatalog> {
  const response = await postLaundrykitRoute<LaundryKitClientsResponse>(args, {
    FUNCTION: 'LKO_STORE_CLIENTS_LIST',
    DATA: {
      STORE_ID: args.storeId,
    },
  });

  return LaundryKitClientCatalog.fromClients(response.clients ?? []);
}
