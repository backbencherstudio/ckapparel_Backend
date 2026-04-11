import { Test, TestingModule } from '@nestjs/testing';
import { SponsorshipService } from './sponsorship.service';

describe('SponsorshipService', () => {
  let service: SponsorshipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SponsorshipService],
    }).compile();

    service = module.get<SponsorshipService>(SponsorshipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
