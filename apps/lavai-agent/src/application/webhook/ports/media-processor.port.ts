export const MEDIA_PROCESSOR_PORT = Symbol('MEDIA_PROCESSOR_PORT');

/**
 * Contrato para processamento de mídia com IA.
 *
 * Responsável por:
 *  - Transcrever áudio para texto (Whisper)
 *  - Interpretar imagens e extrair informações (GPT-4o Vision)
 *  - Interpretar frames de vídeo (GPT-4o Vision via thumbnail)
 */
export interface MediaProcessorPort {
  /**
   * Transcreve um arquivo de áudio para texto usando Whisper.
   * @param audioBuffer Buffer com o conteúdo do arquivo de áudio
   * @param mimeType MIME type do áudio (ex: "audio/ogg")
   * @param filename Nome do arquivo (usado para determinar o formato)
   */
  transcribeAudio(audioBuffer: Buffer, mimeType: string, filename: string): Promise<string>;

  /**
   * Interpreta o conteúdo de uma imagem usando Vision.
   * @param imageBase64 Imagem codificada em base64
   * @param mimeType MIME type da imagem (ex: "image/jpeg")
   * @param extractionPrompt Prompt que define o que extrair da imagem
   */
  interpretImage(imageBase64: string, mimeType: string, extractionPrompt: string): Promise<string>;
}
