import { CreateModuleDto } from '../application/dto/courses.dto';

/**
 * Unit of Work for Course operations
 *
 * Coordinates complex multi-entity operations within a single transaction
 * to ensure data consistency when creating modules with nested lessons and files.
 */
export interface ICourseUnitOfWork {
  /**
   * Creates a module with its lessons and lesson files in a single atomic transaction.
   *
   * Operations performed:
   * 1. Create the module
   * 2. Create all lessons associated with the module
   * 3. Create all lesson files for each lesson
   *
   * If any operation fails, all changes are rolled back to prevent orphaned records.
   *
   * @param createModuleDto - The module data including nested lessons and files
   * @param courseId - The ID of the course to associate the module with
   * @returns The created module (without nested relations)
   */
  createModuleWithLessons(
    createModuleDto: CreateModuleDto,
    courseId: string,
  ): Promise<any>;
}
