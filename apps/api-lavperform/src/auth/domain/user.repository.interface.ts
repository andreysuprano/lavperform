import { UserEntity } from './user.entity';

export interface IUserRepository {
  /**
   * Finds a user by email with all their companies and access rules
   */
  findByEmailWithCompaniesAndRules(email: string): Promise<UserEntity | null>;

  /**
   * Finds a user by email without relations
   */
  findByEmail(email: string): Promise<UserEntity | null>;

  /**
   * Finds a user by ID with all their companies and addresses
   */
  findByIdWithCompaniesAndAddress(userId: string): Promise<UserEntity | null>;

  /**
   * Updates a user's password
   */
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
}
