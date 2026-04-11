import { Module } from '@nestjs/common';
import { SupportPlanService } from './support-plan.service';
import { SupportPlanController } from './support-plan.controller';

@Module({
  controllers: [SupportPlanController],
  providers: [SupportPlanService],
})
export class SupportPlanModule {}
