import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAdministratorsController } from './admin-administrators.controller';
import { AdminAdministratorsService } from './admin-administrators.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminAdministratorsController],
  providers: [AdminAdministratorsService],
})
export class AdminAdministratorsModule {}
