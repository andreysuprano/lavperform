import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { toFile } from 'openai';
import type { MediaProcessorPort } from '../../../application/webhook/ports/media-processor.port';

/**
 * Implementa MediaProcessorPort usando as APIs da OpenAI:
 *  - Whisper (audio.transcriptions) para transcrição de áudio
 *  - GPT-4o Vision (chat.completions) para interpretação de imagens e frames de vídeo
 */
@Injectable()
export class OpenAiMediaService implements MediaProcessorPort {
  private readonly logger = new Logger(OpenAiMediaService.name);
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string, filename: string): Promise<string> {
    this.logger.log(`Transcrevendo áudio: ${filename} (${mimeType}, ${audioBuffer.length} bytes)`);

    const file = await toFile(audioBuffer, filename, { type: mimeType });

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text',
    }) as unknown as string;

    this.logger.log(`Transcrição concluída: "${transcription.slice(0, 80)}..."`);
    return transcription;
  }

  async interpretImage(imageBase64: string, mimeType: string, extractionPrompt: string): Promise<string> {
    this.logger.log(`Interpretando imagem via Vision (${mimeType})`);

    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: extractionPrompt,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'auto' },
            },
          ],
        },
      ],
      max_tokens: 1024,
    });

    const result = response.choices[0]?.message?.content ?? '';
    this.logger.log(`Interpretação concluída: "${result.slice(0, 80)}..."`);
    return result;
  }
}
