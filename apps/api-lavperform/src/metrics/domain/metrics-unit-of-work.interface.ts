/**
 * Unit of Work for Metrics operations
 *
 * Coordinates multi-repository operations within a single transaction
 * to ensure data consistency when recording message interactions.
 */
export interface IMetricsUnitOfWork {
  /**
   * Records a message click by:
   * 1. Finding the message by token
   * 2. Finding the company's digital menu integration
   * 3. Creating a message interaction record
   * 4. Incrementing campaign metrics
   *
   * All operations are executed within a single database transaction.
   *
   * @param token - The unique message token
   * @returns The redirect URL for the digital menu or Google as fallback
   */
  recordMessageClick(token: string): Promise<{ redirectUrl: string }>;
}
