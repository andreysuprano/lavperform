export type SessionRefreshFailureKind =
  | 'rejected'
  | 'unavailable'
  | 'transient';

export class SessionRefreshError extends Error {
  constructor(
    message: string,
    readonly kind: SessionRefreshFailureKind,
  ) {
    super(message);
    this.name = 'SessionRefreshError';
  }
}
