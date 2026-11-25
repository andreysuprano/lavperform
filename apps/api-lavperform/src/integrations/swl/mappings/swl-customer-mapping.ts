import { safeFormatPhoneNumber } from '../../../common/utils/formatters';
import { SwlCliente } from '../api/swl.types';

export interface SwlCustomerIncoming {
  name: string;
  phone?: string;
  cpf?: string;
  email?: string;
  birthDate?: string;
  gender?: 'M' | 'F';
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function compact<T extends object>(value: T): T | undefined {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as T) : undefined;
}

export function swlCustomerIncoming(cliente: SwlCliente): SwlCustomerIncoming {
  const phone = [cliente.celular?.e164, cliente.telefone?.e164]
    .map(text)
    .find((candidate) => safeFormatPhoneNumber(candidate) !== null);
  const cpf = text(cliente.documento?.replace(/\D/g, ''));
  const sex = cliente.sexo?.trim().toUpperCase();
  const address = compact({
    street: text(cliente.endereco?.logradouro),
    number: text(cliente.endereco?.numero),
    complement: text(cliente.endereco?.complemento),
    neighborhood: text(cliente.endereco?.bairro),
    city: text(cliente.endereco?.cidade),
    state: text(cliente.endereco?.uf),
    zipCode: text(cliente.endereco?.cep),
  });

  return compact<SwlCustomerIncoming>({
    name: text(cliente.nome) ?? 'Cliente',
    phone,
    cpf,
    email: text(cliente.email),
    birthDate: text(cliente.dataNascimento),
    gender: sex === 'M' || sex === 'F' ? sex : undefined,
    address,
  }) as SwlCustomerIncoming;
}
