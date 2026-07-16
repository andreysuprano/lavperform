import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ICourseRepository } from '../../domain/course.repository.interface';
import { Course } from '../../domain/course.entity';
import { CourseMapper } from './mappers/course.mapper';

@Injectable()
export class CoursePrismaRepository implements ICourseRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Course>): Promise<Course> {
        const created = await this.prisma.course.create({
            data: data as any,
        });
        return CourseMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<Course[]> {
        const courses = await this.prisma.course.findMany(options);
        return courses.map(CourseMapper.toDomain);
    }

    async findById(id: string): Promise<Course | null> {
        const course = await this.prisma.course.findUnique({
            where: { id },
        });
        return course ? CourseMapper.toDomain(course) : null;
    }

    async findByIdWithModules(id: string): Promise<Course | null> {
        const course = await this.prisma.course.findUnique({
            where: { id },
            include: {
                modules: {
                    include: {
                        lessons: {
                            include: {
                                lessonFiles: true,
                            },
                        },
                    },
                },
            },
        });
        return course ? CourseMapper.toDomain(course) : null;
    }

    async update(id: string, data: Partial<Course>): Promise<Course> {
        const updated = await this.prisma.course.update({
            where: { id },
            data: data as any,
        });
        return CourseMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.course.delete({
            where: { id },
        });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.course.count(options);
    }
}
