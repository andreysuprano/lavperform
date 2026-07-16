import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsString } from "class-validator";

export class CreateEducationalCarrouselDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  videoUrl?: string;

  @ApiProperty()
  @IsString()
  thumbnailUrl: string;

  @ApiProperty()
  @IsString()
  ctaLabel?: string;

  @ApiProperty()
  @IsString()
  ctaUrl?: string;

  @ApiProperty()
  @IsNumber()
  order: number;

  @ApiProperty()
  @IsBoolean()
  isStream: boolean;
}