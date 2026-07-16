import { Module } from '@nestjs/common';
import { UsersService } from './application/users.service';
import { UsersController } from './presentation/users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UserPrismaRepository } from './infrastructure/persistence/prisma-user.repository';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: 'IUserRepository',
      useClass: UserPrismaRepository
    }
  ],
  exports: [UsersService, 'IUserRepository'],
})
export class UsersModule { }