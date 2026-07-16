import { ConfirmationCodeEntity } from './confirmation-code.entity';

export interface IConfirmationCodeRepository {
  /**
   * Creates a new confirmation code
   */
  create(code: string, userId: string): Promise<ConfirmationCodeEntity>;

  /**
   * Finds an unused confirmation code by code string
   */
  findUnusedByCode(code: string): Promise<ConfirmationCodeEntity | null>;

  /**
   * Marks a confirmation code as used
   */
  markAsUsed(id: string): Promise<void>;
}
