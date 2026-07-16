import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCreativeDto {
    @ApiProperty({
        description: 'URLs das imagens do criativo (uma será escolhida aleatoriamente no envio). Pode ser omitido ou vazio para criativo somente-texto.',
        example: [
            'https://storage.googleapis.com/bucket/campaigns/img1.jpg',
            'https://storage.googleapis.com/bucket/campaigns/img2.jpg',
        ],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    imageUrls?: string[];

    @ApiProperty({
        description: 'Título do criativo',
        example: 'Só hoje',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Texto/mensagem do criativo enviada ao cliente',
        example: 'Oi! Temos uma condição especial pra você voltar a comprar.',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({
        description: 'Link de destino do criativo (para onde o token de rastreamento deve redirecionar)',
        example: 'https://seusite.com/promo',
        required: false,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    link?: string | null;
}
