import { ApiProperty } from '@nestjs/swagger';

export class BaseWebhookDto {
  @ApiProperty({
    description: 'Tipo do evento',
    example: 'connection.update'
  })
  event: string;

  @ApiProperty({
    description: 'Nome da instância',
    example: 'Andrey'
  })
  instance: string;

  @ApiProperty({
    description: 'URL de destino do webhook',
    example: 'https://seuwebhook.com/webhook/evolution'
  })
  destination: string;

  @ApiProperty({
    description: 'Data e hora do evento',
    example: '2025-04-14T15:27:41.028Z'
  })
  date_time: string;

  @ApiProperty({
    description: 'URL do servidor',
    example: 'https://seuwebhook.com/webhook/evolution'
  })
  server_url: string;

  @ApiProperty({
    description: 'API Key',
    example: '68DEBDF25976-4D42-8262-6CE067730ADD'
  })
  apikey: string;
} 