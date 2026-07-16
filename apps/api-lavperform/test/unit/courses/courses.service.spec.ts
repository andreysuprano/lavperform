import { CoursesService } from 'src/courses/application/courses.service';
import { ICourseUnitOfWork } from 'src/courses/domain/course-unit-of-work.interface';

describe('CoursesService', () => {
  const courseRepository: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByIdWithModules: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const carrouselRepository: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const weekEventRepository: any = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCurrentWeek: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockCourseUnitOfWork: jest.Mocked<ICourseUnitOfWork> = {
    createModuleWithLessons: jest.fn(),
  };

  let service: CoursesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CoursesService(
      courseRepository,
      carrouselRepository,
      weekEventRepository,
      mockCourseUnitOfWork,
    );
  });

  it('creates a course', async () => {
    courseRepository.create.mockResolvedValue({ id: 'c1' });
    const course = await service.createCourse({ name: 'Course' } as any);
    expect(course).toEqual({ id: 'c1' });
  });

  it('lists all courses', async () => {
    courseRepository.findAll.mockResolvedValue([{ id: 'c1' }]);
    const result = await service.getAllCourses();
    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('gets course by id with relations', async () => {
    courseRepository.findByIdWithModules.mockResolvedValue({ id: 'c1', modules: [] });
    const course = await service.getCourseById('c1');
    expect(course).toEqual({ id: 'c1', modules: [] });
  });

  it('creates module with lessons and files via Unit of Work', async () => {
    mockCourseUnitOfWork.createModuleWithLessons.mockResolvedValue({ id: 'm1' });

    const moduleDto = {
      title: 'Module',
      lessons: [
        {
          title: 'Lesson',
          lessonFiles: [{ name: 'file', fileUrl: 'url' }],
        },
      ],
    } as any;

    const module = await service.createModule(moduleDto, 'course-1');

    expect(mockCourseUnitOfWork.createModuleWithLessons).toHaveBeenCalledWith(
      moduleDto,
      'course-1',
    );
    expect(module).toEqual({ id: 'm1' });
  });

  it('creates module without lessons via Unit of Work', async () => {
    mockCourseUnitOfWork.createModuleWithLessons.mockResolvedValue({ id: 'm2' });

    const moduleDto = { title: 'No Lessons', lessons: [] } as any;
    const module = await service.createModule(moduleDto, 'course-2');

    expect(mockCourseUnitOfWork.createModuleWithLessons).toHaveBeenCalledWith(
      moduleDto,
      'course-2',
    );
    expect(module).toEqual({ id: 'm2' });
  });

  it('delegates module creation to Unit of Work ensuring atomicity', async () => {
    mockCourseUnitOfWork.createModuleWithLessons.mockResolvedValue({ id: 'm3' });

    const moduleDto = {
      title: 'Module',
      lessons: [
        { title: 'Lesson 1', lessonFiles: [{ name: 'file1', fileUrl: 'url1' }] },
        { title: 'Lesson 2' },
      ],
    } as any;

    await service.createModule(moduleDto, 'course-3');

    expect(mockCourseUnitOfWork.createModuleWithLessons).toHaveBeenCalledWith(
      moduleDto,
      'course-3',
    );
  });
});
