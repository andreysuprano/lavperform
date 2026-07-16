import { L2AutomateCustomer } from '../api/l2automate.types';
import { formatPhoneNumber } from '../../../common/utils/formatters';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';

export class L2AutomateCustomerMapping {
  /**
   * Converte dados do cliente L2 Automate para o formato de CreateCustomerDto
   */
  static toCreateCustomerDto(
    customer: L2AutomateCustomer,
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

    const cpfRaw = customer.document
      ? customer.document.replace(/[^\d]/g, '')
      : undefined;

    return {
      name: customer.name,
      phone,
      cpf: cpfRaw && cpfRaw.length > 0 ? cpfRaw : undefined,
      birthDate,
      firstOrderDate,
      createdAt,
    };
  }

  /**
   * Extrai dados relevantes para atualização de cliente existente
   */
  static toUpdateData(customer: L2AutomateCustomer) {
    const cpfRaw = customer.document
      ? customer.document.replace(/[^\d]/g, '')
      : undefined;

    return {
      cpf: cpfRaw && cpfRaw.length > 0 ? cpfRaw : undefined,
      birthDate: customer.birthDate
        ? toDateOnlyString(parseUTCDate(customer.birthDate)!)
        : undefined,
    };
  }
}
