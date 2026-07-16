import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

import { IsArray, IsOptional, IsString, ValidateNested } from "class-validator";

export class CreateCourseDto {
    @ApiProperty({
        description: 'Título do curso',
        example: 'Curso de Programação',
        required: true
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Descrição do curso',
        example: 'Curso de Programação',
        required: true
    })
    @IsString()
    description: string;
    
    @ApiProperty({
        description: 'URL da imagem de capa do curso',
        example: 'https://example.com/curso.jpg',
        required: true
    })
    @IsString()
    coverImageUrl: string;

    @ApiProperty({
        description: 'URL do banner do curso',
        example: 'https://example.com/banner.jpg',
        required: false
    })
    @IsString()
    @IsOptional()
    bannerUrl?: string;
}

export class CreateModuleDto {
    @ApiProperty({
        description: 'Título do módulo',
        example: 'Módulo 1',
        required: true
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Descrição do módulo',
        example: 'Descrição do módulo 1',
        required: true
    })
    @IsString()
    description: string;

    @ApiProperty({
        description: 'Aulas do módulo',
        example: [{
            title: 'Aula 1',
            videoUrl: 'https://example.com/aula.mp4',
            description: 'Descrição da aula 1',
            thumbnailUrl: 'https://example.com/aula.jpg',
            lessonFiles: [{
                name: 'aula.pdf',
                fileUrl: 'https://example.com/aula.pdf',
            }],
        }],
        required: false
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonDto)
    lessons?: CreateLessonDto[];
}


export class CreateLessonDto {
    @ApiProperty({
        description: 'Título da aula',
        example: 'Aula 1',
        required: true
    })
    @IsString()
    title: string;
 
    @ApiProperty({
        description: 'URL do vídeo da aula',
        example: 'https://example.com/aula.mp4',
        required: true
    })
    @IsString()
    videoUrl: string;

    @ApiProperty({
        description: 'Descrição da aula',
        example: 'Descrição da aula 1',
        required: true
    })
    @IsString()
    description: string;
    
    @ApiProperty({
        description: 'URL da imagem de capa da aula',
        example: 'https://example.com/aula.jpg',
        required: true
    })
    @IsString()
    thumbnailUrl: string;

    @ApiProperty({
        description: 'Arquivos da aula',
        example: 'Arquivos da aula 1',
        required: false
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonFileDto)
    lessonFiles?: CreateLessonFileDto[];
}

export class CreateLessonFileDto {
    @ApiProperty({
        description: 'Nome do arquivo',
        example: 'aula.pdf',
        required: true
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'URL do arquivo da aula',
        example: 'https://example.com/aula.pdf',
        required: true
    })
    @IsString()
    fileUrl: string;
}