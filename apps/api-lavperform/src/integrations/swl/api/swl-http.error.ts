export type SwlPermanentHttpStatus = 400 | 401 | 403;

export class SwlPermanentHttpError extends Error {
  constructor(
    readonly status: SwlPermanentHttpStatus,
    message?: string,
  ) {
    super(message ?? `SWL recusou a requisição com HTTP ${status}`);
    this.name = 'SwlPermanentHttpError';
  }
}
