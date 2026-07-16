import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  validateSync,
} from 'class-validator';

@ValidatorConstraint({ name: 'phoneOrCpf', async: false })
export class PhoneOrCpfConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { phone?: string; cpf?: string };
    const hasPhone = typeof obj.phone === 'string' && obj.phone.trim() !== '';
    const hasCpf = typeof obj.cpf === 'string' && obj.cpf.trim() !== '';
    return hasPhone || hasCpf;
  }

  defaultMessage(): string {
    return 'Informe pelo menos um entre phone ou cpf do cliente';
  }
}

export function PhoneOrCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: PhoneOrCpfConstraint,
    });
  };
}

export function validatePhoneOrCpf(obj: { phone?: string; cpf?: string }): boolean {
  const errors = validateSync(obj);
  return errors.length === 0;
}
