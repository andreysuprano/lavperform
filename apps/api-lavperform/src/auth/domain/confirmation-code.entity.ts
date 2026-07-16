export class ConfirmationCodeEntity {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly userId: string,
    public readonly used: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isValid(): boolean {
    return !this.used;
  }
}
