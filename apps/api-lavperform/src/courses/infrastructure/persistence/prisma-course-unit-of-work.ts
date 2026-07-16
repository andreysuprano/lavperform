import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICourseUnitOfWork } from '../../domain/course-unit-of-work.interface';
import { CreateModuleDto } from '../../application/dto/courses.dto';

@Injectable()
export class PrismaCourseUnitOfWork implements ICourseUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async createModuleWithLessons(
    createModuleDto: CreateModuleDto,
    courseId: string,
  ): Promise<any> {
    const { lessons, ...moduleData } = createModuleDto;

    return await this.prisma.$transaction(async (tx) => {
      // Step 1: Create the module
      const module = await tx.module.create({
        data: {
          ...moduleData,
          course: {
            connect: {
              id: courseId,
            },
          },
        },
      });

      // Step 2: Create all lessons with their files atomically
      if (lessons && lessons.length > 0) {
        await Promise.all(
          lessons.map(async (lessonDto) => {
            const { lessonFiles, ...lessonData } = lessonDto;

            await tx.lesson.create({
              data: {
                ...lessonData,
                moduleId: module.id,
                lessonFiles: lessonFiles
                  ? {
                      create: lessonFiles.map((file) => ({
                        name: file.name,
                        fileUrl: file.fileUrl,
                      })),
                    }
                  : undefined,
              },
            });
          }),
        );
      }

      return module;
    });
  }
}
