import { CiccloCustomer } from '../api/cicclo.types';
import { formatPhoneNumber } from '../../../common/utils/formatters';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';

export class CiccloCustomerMapping {
  /**
   * Converte dados do cliente Cicclo para o formato de CreateCustomerDto
   */
  static toCreateCustomerDto(
    customer: CiccloCustomer,
    registeredAt?: string,
    firstSaleDate?: string,
  ): any {
    const phone = customer.mobile
      ? formatPhoneNumber(customer.mobile)
      : null;

    const birthDate = customer.birthDate
      ? toDateOnlyString(parseUTCDate(customer.birthDate)!)
      : undefined;

    const createdAt = registeredAt
      ? parseUTCDate(registeredAt)
      : firstSaleDate
        ? parseUTCDate(firstSaleDate)
        : undefined;

    const firstOrderDate = firstSaleDate
      ? toDateOnlyString(parseUTCDate(firstSaleDate)!)
      : undefined;

    return {
      name: customer.name,
      phone,
      email: customer.email || undefined,
      cpf: customer.document
        ? customer.document.replace(/[^\d]/g, '')
        : undefined,
      birthDate,
      firstOrderDate,
      createdAt,
    };
  }

  /**
   * Extrai dados relevantes para atualização de cliente existente
   */
  static toUpdateData(customer: CiccloCustomer) {
    return {
      email: customer.email || undefined,
      cpf: customer.document
        ? customer.document.replace(/[^\d]/g, '')
        : undefined,
      birthDate: customer.birthDate
        ? toDateOnlyString(parseUTCDate(customer.birthDate)!)
        : undefined,
    };
  }
}
