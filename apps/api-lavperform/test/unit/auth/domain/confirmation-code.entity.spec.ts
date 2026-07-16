import { ConfirmationCodeEntity } from 'src/auth/domain/confirmation-code.entity';

describe('ConfirmationCodeEntity', () => {
  describe('constructor', () => {
    it('should create a confirmation code entity with all fields', () => {
      const confirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        false,
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      );

      expect(confirmationCode.id).toBe('code-1');
      expect(confirmationCode.code).toBe('12345');
      expect(confirmationCode.userId).toBe('user-1');
      expect(confirmationCode.used).toBe(false);
      expect(confirmationCode.createdAt).toEqual(new Date('2024-01-01'));
      expect(confirmationCode.updatedAt).toEqual(new Date('2024-01-02'));
    });

    it('should create a used confirmation code', () => {
      const confirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        true,
        new Date('2024-01-01'),
        new Date('2024-01-02'),
      );

      expect(confirmationCode.used).toBe(true);
    });
  });

  describe('isValid', () => {
    it('should return true when code has not been used', () => {
      const confirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        false,
        new Date(),
        new Date(),
      );

      expect(confirmationCode.isValid()).toBe(true);
    });

    it('should return false when code has been used', () => {
      const confirmationCode = new ConfirmationCodeEntity(
        'code-1',
        '12345',
        'user-1',
        true,
        new Date(),
        new Date(),
      );

      expect(confirmationCode.isValid()).toBe(false);
    });
  });
});
