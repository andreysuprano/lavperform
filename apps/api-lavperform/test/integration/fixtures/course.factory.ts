import { PrismaClient, Course } from '@prisma/client';
const { faker } = require('@faker-js/faker/locale/pt_BR');

export class CourseFactory {
  constructor(private prisma: PrismaClient) {}

  async create(overrides: Partial<Course> = {}): Promise<Course> {
    return this.prisma.course.create({
      data: {
        title: overrides.title || faker.commerce.productName(),
        description: overrides.description || faker.lorem.paragraph(),
        coverImageUrl: overrides.coverImageUrl || faker.image.url(),
        ...overrides,
      },
    });
  }

  async createMany(count: number, overrides: Partial<Course> = {}): Promise<Course[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.create(overrides))
    );
  }
}
