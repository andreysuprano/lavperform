import { Body, Controller, Get, Param, Post, UseGuards, Delete, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService } from '../application/courses.service';
import { CreateCourseDto, CreateModuleDto } from '../application/dto/courses.dto';
import { CreateEducationalCarrouselDto } from '../application/dto/educational-carroussel.dto';
import { CreateEducationalWeekEventsDto } from '../application/dto/educational-events.dto';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  async createCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.createCourse(createCourseDto);
  }

  @Get()
  async getAllCourses() {
    return this.coursesService.getAllCourses();
  }

  @Get('educational-carrousel')
  async getAllEducationalCarrousels() {
    console.log('getAllEducationalCarrousels');
    return this.coursesService.getAllEducationalCarrousels();
  }

  @Get('educational-week-events')
  async getAllEducationalWeekEvents() {
    return this.coursesService.getAllEducationalWeekEvents();
  }

  @Get('educational-week-events/current-week')
  async getAllEducationalWeekEventsByCurrentWeek() {
    return this.coursesService.getAllEducationalWeekEventsByCurrentWeek();
  }

  @Post('educational-carrousel')
  async createEducationalCarrousel(@Body() createEducationalCarrouselDto: CreateEducationalCarrouselDto) {
    return this.coursesService.createEducationalCarrousel(createEducationalCarrouselDto);
  }

  @Put('educational-carrousel/:id')
  async updateEducationalCarrousel(@Param('id') id: string, @Body() updateEducationalCarrouselDto: CreateEducationalCarrouselDto) {
    return this.coursesService.updateEducationalCarrousel(id, updateEducationalCarrouselDto);
  }

  @Delete('educational-carrousel/:id')
  async deleteEducationalCarrousel(@Param('id') id: string) {
    return this.coursesService.deleteEducationalCarrousel(id);
  }

  @Get(':id')
  async getCourseById(@Param('id') id: string) {
    return this.coursesService.getCourseById(id);
  }

  @Post(':courseId/modules')
  async createModule(@Body() createModuleDto: CreateModuleDto, @Param('courseId') courseId: string) {
    return this.coursesService.createModule(createModuleDto, courseId);
  }



  @Post('educational-week-events')
  async createEducationalWeekEvents(@Body() createEducationalWeekEventsDto: CreateEducationalWeekEventsDto) {
    return this.coursesService.createEducationalWeekEvents(createEducationalWeekEventsDto);
  }

  @Put('educational-week-events/:id')
  async updateEducationalWeekEvents(@Param('id') id: string, @Body() updateEducationalWeekEventsDto: CreateEducationalWeekEventsDto) {
    return this.coursesService.updateEducationalWeekEvents(id, updateEducationalWeekEventsDto);
  }

  @Delete('educational-week-events/:id')
  async deleteEducationalWeekEvents(@Param('id') id: string) {
    return this.coursesService.deleteEducationalWeekEvents(id);
  }
} 