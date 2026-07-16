import { Module } from '@nestjs/common';
import { OnboardingModule } from '../../onboarding/onboarding.module';
import { AdminOnboardingController } from './admin-onboarding.controller';

@Module({
  imports: [OnboardingModule],
  controllers: [AdminOnboardingController],
})
export class AdminOnboardingModule {}
