import { Test, TestingModule } from '@nestjs/testing';
import { SupportPlanService } from './support-plan.service';

describe('SupportPlanService', () => {
  let service: SupportPlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SupportPlanService],
    }).compile();

    service = module.get<SupportPlanService>(SupportPlanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
