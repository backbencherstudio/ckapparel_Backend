import { Test, TestingModule } from '@nestjs/testing';
import { SponsorshipController } from './sponsorship.controller';
import { SponsorshipService } from './sponsorship.service';

describe('SponsorshipController', () => {
  let controller: SponsorshipController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SponsorshipController],
      providers: [SponsorshipService],
    }).compile();

    controller = module.get<SponsorshipController>(SponsorshipController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
