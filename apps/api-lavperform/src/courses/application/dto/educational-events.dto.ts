import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsDate, IsBoolean, IsNotEmpty} from "class-validator";

export class CreateEducationalWeekEventsDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  ctaLabel?: string;

  @ApiProperty()
  @IsString()
  @IsOptional() 
  ctaUrl?: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isStream?: boolean;

  @ApiProperty(
    {
      description: 'Data do evento no formato YYYY-MM-DD',
      example: '2025-12-04 10:00:00',
    }
  )
  @IsString()
  @IsNotEmpty()
  eventDate: string;
}
