import { Injectable, Logger, Inject } from '@nestjs/common';
import { CreateCourseDto, CreateModuleDto } from './dto/courses.dto';
import { CreateEducationalCarrouselDto } from './dto/educational-carroussel.dto';
import { CreateEducationalWeekEventsDto } from './dto/educational-events.dto';
import { ICourseRepository } from '../domain/course.repository.interface';
import { IEducationalCarrouselRepository } from '../domain/educational-carrousel.repository.interface';
import { IEducationalWeekEventRepository } from '../domain/educational-week-event.repository.interface';
import { ICourseUnitOfWork } from '../domain/course-unit-of-work.interface';

@Injectable()
export class CoursesService {
  private readonly logger: Logger;

  constructor(
    @Inject('ICourseRepository')
    private readonly courseRepository: ICourseRepository,
    @Inject('IEducationalCarrouselRepository')
    private readonly carrouselRepository: IEducationalCarrouselRepository,
    @Inject('IEducationalWeekEventRepository')
    private readonly weekEventRepository: IEducationalWeekEventRepository,
    @Inject('ICourseUnitOfWork')
    private readonly courseUnitOfWork: ICourseUnitOfWork,
  ) {
    this.logger = new Logger(CoursesService.name);
  }

  async createCourse(createCourseDto: CreateCourseDto) {
    return await this.courseRepository.create(createCourseDto);
  }

  async getAllCourses() {
    return await this.courseRepository.findAll();
  }

  async getCourseById(id: string) {
    return await this.courseRepository.findByIdWithModules(id);
  }

  async createModule(createModuleDto: CreateModuleDto, courseId: string) {
    return await this.courseUnitOfWork.createModuleWithLessons(
      createModuleDto,
      courseId,
    );
  }

  async createEducationalCarrousel(createEducationalCarrouselDto: CreateEducationalCarrouselDto) {
    return await this.carrouselRepository.create(createEducationalCarrouselDto);
  }

  async getAllEducationalCarrousels() {
    return await this.carrouselRepository.findAll();
  }

  async deleteEducationalCarrousel(id: string) {
    await this.carrouselRepository.delete(id);
  }

  async updateEducationalCarrousel(id: string, updateEducationalCarrouselDto: CreateEducationalCarrouselDto) {
    return await this.carrouselRepository.update(id, updateEducationalCarrouselDto);
  }

  async createEducationalWeekEvents(createEducationalWeekEventsDto: CreateEducationalWeekEventsDto) {
    return await this.weekEventRepository.create({
      ...createEducationalWeekEventsDto,
      eventDate: new Date(createEducationalWeekEventsDto.eventDate),
    });
  }

  async getAllEducationalWeekEvents() {
    return await this.weekEventRepository.findAll({
      orderBy: {
        eventDate: 'desc',
      },
    });
  }

  async getAllEducationalWeekEventsByCurrentWeek() {
    return await this.weekEventRepository.findByCurrentWeek();
  }

  async deleteEducationalWeekEvents(id: string) {
    await this.weekEventRepository.delete(id);
  }

  async updateEducationalWeekEvents(id: string, updateEducationalWeekEventsDto: CreateEducationalWeekEventsDto) {
    return await this.weekEventRepository.update(id, {
      ...updateEducationalWeekEventsDto,
      eventDate: new Date(updateEducationalWeekEventsDto.eventDate),
    });
  }
}
