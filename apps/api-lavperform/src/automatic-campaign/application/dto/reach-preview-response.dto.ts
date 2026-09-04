import { ApiProperty } from '@nestjs/swagger';

export class ReachPreviewResponseDto {
  @ApiProperty({
    description: 'Quantidade de clientes elegíveis',
    example: 42,
  })
  count: number;
}
