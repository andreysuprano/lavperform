import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

export class LinkPageDto {
    @ApiProperty({
        description: 'Biografia da empresa',
        example: 'Biografia da empresa',
        required: true,
    })
    @IsString()
    biography: string;

    @ApiProperty({
        description: 'Imagem de capa da página de links',
        example: 'https://example.com/cover-image.jpg',
        required: true,
    })
    @IsString()
    coverImage: string;

    @ApiProperty({
        description: 'Mensagem do whatsapp',
        example: 'Olá, tudo bem?',
        required: false,
    })
    @IsString()
    whatsappMessage: string;

    @ApiProperty({
        description: 'Cor de fundo da página de links',
        example: '#000000',
        required: true,
    })
    @IsString()
    bgColor: string;

    @ApiProperty({
        description: 'Links da página de links',
        example: [{
            id: '123e4567-e89b-12d3-a456-426614174000',
            label: 'Link 1',
            url: 'https://example.com/link1',
            icon: 'https://example.com/icon1.png',
            iconType: 'icon',
        }],
        required: true,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LinkDto)
    links: LinkDto[];
 
    @ApiProperty({
        description: 'Galerias da página de links',
        example: [{
            id: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Galeria 1',
            description: 'Descrição da galeria 1',
            imageUrl: 'https://example.com/image1.png',
        }],
        required: true,
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => GalleryDto)
    galleries: GalleryDto[];
}

export class LinkDto {
    @ApiProperty({
        description: 'ID do link',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false,
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        description: 'Label do link',
        example: 'Link 1',
        required: true,
    })
    @IsString()
    label: string;

    @ApiProperty({
        description: 'URL do link',
        example: 'https://example.com/link1',
        required: true,
    })
    @IsString()
    url: string;

    @ApiProperty({
        description: 'Icon do link',
        example: 'https://example.com/icon1.png',
        required: true,
    })
    @IsString()
    icon: string;

    @ApiProperty({
        description: 'Tipo de icon do link',
        example: 'icon',
        required: true,
    })
    @IsString()
    iconType: string;
}

export class GalleryDto {
    @ApiProperty({
        description: 'ID da galeria',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false,
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        description: 'Título da galeria',
        example: 'Galeria 1',
        required: true,
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Descrição da galeria',
        example: 'Descrição da galeria',
        required: true,
    })
    @IsString()
    description: string;
    
    @ApiProperty({
        description: 'Imagens da galeria',
        example: ['https://example.com/image1.png', 'https://example.com/image2.png'],
        required: true,
    })
    @IsArray()
    @IsString({ each: true })
    images: string[];
}