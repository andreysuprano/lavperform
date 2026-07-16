import { Course as PrismaCourse } from '@prisma/client';
import { Course } from '../../../domain/course.entity';

export class CourseMapper {
    static toDomain(prismaCourse: any): Course {
        return new Course({
            id: prismaCourse.id,
            title: prismaCourse.title,
            description: prismaCourse.description,
            coverImageUrl: prismaCourse.coverImageUrl || '',
            bannerUrl: prismaCourse.bannerUrl || '',
            createdAt: prismaCourse.createdAt,
            updatedAt: prismaCourse.updatedAt,
            modules: prismaCourse.modules,
        });
    }
}
