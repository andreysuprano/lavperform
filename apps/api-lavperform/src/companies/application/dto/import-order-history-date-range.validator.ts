import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ImportOrderHistoryDto } from './import-order-history.dto';
import { parseUTCDate } from '../../../common/utils/date.utils';

@ValidatorConstraint({ name: 'ImportOrderHistoryDateRange', async: false })
export class ImportOrderHistoryDateRangeValidator
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as ImportOrderHistoryDto;
    if (!dto.startDate || !dto.endDate) {
      return true;
    }

    const startDate = parseUTCDate(dto.startDate);
    const endDate = parseUTCDate(dto.endDate);

    if (!startDate || !endDate) {
      return true;
    }

    return startDate <= endDate;
  }

  defaultMessage(): string {
    return 'A data inicial deve ser anterior ou igual à data final';
  }
}
