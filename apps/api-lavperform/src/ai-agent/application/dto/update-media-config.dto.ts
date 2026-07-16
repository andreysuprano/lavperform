import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateMediaConfigDto {
  @ApiPropertyOptional() @IsBoolean() @IsOptional() audioEnabled?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() audioDefaultMessage?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() imageEnabled?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() imageExtractionPrompt?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() imageDefaultMessage?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() videoEnabled?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() videoExtractionPrompt?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() videoDefaultMessage?: string;
}
