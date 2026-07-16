import { PartialType } from '@nestjs/swagger';
import { CreateCreditProductDto } from './create-credit-product.dto';

export class UpdateCreditProductDto extends PartialType(
  CreateCreditProductDto,
) {}
