import { ApiProperty } from "@nestjs/swagger";
import { IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class CreditCard {
    @ApiProperty({
        description: 'Nome do titular do cartão',
        type: String,
        required: true
    })
    @IsString()
    holderName: string;
    @ApiProperty({
        description: 'Número do cartão',
        type: String,
        required: true
    })
    @IsString()
    number: string;
    @ApiProperty({
        description: 'Mês de expiração do cartão',
        type: String,
        required: true
    })
    @IsString()
    expiryMonth: string;
    @ApiProperty({
        description: 'Ano de expiração do cartão',
        type: String,
        required: true
    })
    @IsString()
    expiryYear: string;
    @ApiProperty({
        description: 'CCV do cartão',
        type: String,
        required: true
    })
    @IsString()
    ccv: string;
}

export class CreditCardHolderInfo {
    @ApiProperty({
        description: 'Nome do titular do cartão',
        type: String,
        required: true
    })  
    @IsString()
    name: string;
    @ApiProperty({
        description: 'Email do titular do cartão',
        type: String,
        required: true
    })
    @IsString()
    email: string;
    @ApiProperty({
        description: 'CPF/CNPJ do titular do cartão',
        type: String,
        required: true
    })
    @IsString()
    cpfCnpj: string;
    @ApiProperty({
        description: 'CEP do titular do cartão',
        type: String,
        required: true
    })
    @IsString()
    postalCode: string;
    @ApiProperty({
        description: 'Número do endereço do titular do cartão',
        type: String,
        required: true
    })
    @IsString()
    addressNumber: string;
    @ApiProperty({
        description: 'Telefone do titular do cartão',
        type: String,
        required: true
    })
    @IsString()
    phone: string;
}

export class PutCardDto {
    @ApiProperty({
        description: 'Cartão de crédito',
        type: CreditCard,
        required: true
    })
    @ValidateNested()
    @Type(() => CreditCard)
    creditCard: CreditCard;

    @ApiProperty({
        description: 'Informações do titular do cartão',
        type: CreditCardHolderInfo,
        required: true
    })
    @ValidateNested()
    @Type(() => CreditCardHolderInfo)
    creditCardHolderInfo: CreditCardHolderInfo;
    remoteIp: string;
}