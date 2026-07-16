import { Module } from '@nestjs/common';
import { CoursesService } from './application/courses.service';
import { CoursesController } from './presentation/courses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CoursePrismaRepository } from './infrastructure/persistence/prisma-course.repository';
import { EducationalCarrouselPrismaRepository } from './infrastructure/persistence/prisma-educational-carrousel.repository';
import { EducationalWeekEventPrismaRepository } from './infrastructure/persistence/prisma-educational-week-event.repository';
import { PrismaCourseUnitOfWork } from './infrastructure/persistence/prisma-course-unit-of-work';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    {
      provide: 'ICourseRepository',
      useClass: CoursePrismaRepository,
    },
    {
      provide: 'IEducationalCarrouselRepository',
      useClass: EducationalCarrouselPrismaRepository,
    },
    {
      provide: 'IEducationalWeekEventRepository',
      useClass: EducationalWeekEventPrismaRepository,
    },
    {
      provide: 'ICourseUnitOfWork',
      useClass: PrismaCourseUnitOfWork,
    },
  ],
  exports: [CoursesService],
})
export class CoursesModule { }