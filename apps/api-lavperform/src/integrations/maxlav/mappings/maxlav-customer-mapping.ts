import { MaxlavCustomer } from '../api/maxlav.types';
import { formatPhoneNumber } from '../../../common/utils/formatters';
import { parseUTCDate, toDateOnlyString } from '../../../common/utils/date.utils';

export class MaxlavCustomerMapping {
  static toCreateCustomerDto(
    customer: MaxlavCustomer,
    firstSaleDate?: string,
  ): any {
    const phone = customer.cellphone
      ? formatPhoneNumber(customer.cellphone)
      : null;

    const createdAt = customer.createdAt
      ? parseUTCDate(customer.createdAt)
      : firstSaleDate
        ? parseUTCDate(firstSaleDate)
        : undefined;

    const firstOrderDate = firstSaleDate
      ? toDateOnlyString(parseUTCDate(firstSaleDate)!)
      : undefined;

    const cpfRaw = customer.documentId
      ? customer.documentId.replace(/[^\d]/g, '')
      : undefined;

    return {
      name: customer.fullName,
      phone,
      cpf: cpfRaw && cpfRaw.length > 0 ? cpfRaw : undefined,
      firstOrderDate,
      createdAt,
    };
  }

  static toUpdateData(customer: MaxlavCustomer) {
    const cpfRaw = customer.documentId
      ? customer.documentId.replace(/[^\d]/g, '')
      : undefined;

    return {
      cpf: cpfRaw && cpfRaw.length > 0 ? cpfRaw : undefined,
    };
  }
}
