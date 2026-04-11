import { Test, TestingModule } from '@nestjs/testing';
import { SupportPlanController } from './support-plan.controller';
import { SupportPlanService } from './support-plan.service';

describe('SupportPlanController', () => {
  let controller: SupportPlanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportPlanController],
      providers: [SupportPlanService],
    }).compile();

    controller = module.get<SupportPlanController>(SupportPlanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
