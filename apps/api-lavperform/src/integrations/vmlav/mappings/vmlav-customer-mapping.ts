import { VmLavCustomerDetail } from '../api/vmlav.types';
import { formatPhoneNumber } from '../../../common/utils/formatters';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';

export const VMLAV_CPF_PHONE_PREFIX = 'cpf:';

export function digitsOnly(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
}

export function normalizeVmLavPhone(phone: unknown): string {
  if (phone === null || phone === undefined) return '';
  return String(phone).trim();
}

export function cpfPhonePlaceholder(cpf: string): string {
  return `${VMLAV_CPF_PHONE_PREFIX}${digitsOnly(cpf)}`;
}

export function resolveVmLavCustomerPhone(
  rawPhone: unknown,
  cpf: unknown,
): string | null {
  const phone = normalizeVmLavPhone(rawPhone);
  const cpfDigits = digitsOnly(cpf);

  if (phone.length > 0) {
    return formatPhoneNumber(phone);
  }

  if (cpfDigits.length > 0) {
    return cpfPhonePlaceholder(cpfDigits);
  }

  return null;
}

export class VmLavCustomerMapping {
  /**
   * Converte dados detalhados do cliente VM Lav para o formato de CreateCustomerDto
   * @param customerDetail - Dados detalhados do cliente da API VM Lav
   * @returns DTO para criação de cliente
   */
  static toCreateCustomerDto(customerDetail: VmLavCustomerDetail): any {
    const firstOrderDate = customerDetail.primeiraCompra
      ? toDateOnlyString(parseUTCDate(customerDetail.primeiraCompra)!)
      : undefined;
    
    const createdAt = customerDetail.dataCadastro
      ? parseUTCDate(customerDetail.dataCadastro)
      : undefined;

    const cpfDigits = digitsOnly(customerDetail.cpf);
    const phone = resolveVmLavCustomerPhone(
      customerDetail.telefone,
      customerDetail.cpf,
    );

    return {
      name: customerDetail.nome,
      phone,
      email: customerDetail.email || undefined,
      cpf: cpfDigits.length > 0 ? cpfDigits : undefined,
      birthDate: customerDetail.dataNascimento 
        ? toDateOnlyString(parseUTCDate(customerDetail.dataNascimento)!)
        : undefined,
      gender: customerDetail.genero === 'M' ? 'M' : customerDetail.genero === 'F' ? 'F' : 'Outro',
      firstOrderDate,
      createdAt,
    };
  }

  /**
   * Extrai dados relevantes para atualização de cliente existente
   * @param customerDetail - Dados detalhados do cliente da API VM Lav
   * @returns Objeto com dados para atualização
   */
  static toUpdateData(
    customerDetail: VmLavCustomerDetail,
    existingPhone?: string | null,
  ) {
    const cpfDigits = digitsOnly(customerDetail.cpf);
    const formattedPhone = resolveVmLavCustomerPhone(
      customerDetail.telefone,
      customerDetail.cpf,
    );
    const shouldUpgradePhone =
      formattedPhone &&
      !formattedPhone.startsWith(VMLAV_CPF_PHONE_PREFIX) &&
      existingPhone?.startsWith(VMLAV_CPF_PHONE_PREFIX);

    return {
      ...(shouldUpgradePhone ? { phone: formattedPhone } : {}),
      email: customerDetail.email || undefined,
      cpf: cpfDigits.length > 0 ? cpfDigits : undefined,
      birthDate: customerDetail.dataNascimento 
        ? toDateOnlyString(parseUTCDate(customerDetail.dataNascimento)!)
        : undefined,
      gender: customerDetail.genero === 'M' ? 'M' : customerDetail.genero === 'F' ? 'F' : 'Outro',
    };
  }
}
