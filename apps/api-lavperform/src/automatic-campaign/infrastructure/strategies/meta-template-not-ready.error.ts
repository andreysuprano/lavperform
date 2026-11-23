/**
 * Erro recuperável: a campanha de API Oficial ainda não tem template Meta
 * APPROVED (PENDING / IN_APPEAL). O processor deve soft-skip — sem marcar
 * FAILED nem lastProcessedAt — para tentar de novo quando o template aprovar.
 */
export class MetaTemplateNotReadyError extends Error {
  readonly retryable = true;

  constructor(message: string) {
    super(message);
    this.name = 'MetaTemplateNotReadyError';
  }
}
