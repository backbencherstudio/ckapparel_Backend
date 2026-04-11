import { Module } from '@nestjs/common';
import { SponsorshipService } from './sponsorship.service';
import { SponsorshipController } from './sponsorship.controller';
import { SponsorshipController as SponsorshipAdminController } from './sponsorship-admin.controller';

@Module({
  controllers: [SponsorshipController, SponsorshipAdminController],
  providers: [SponsorshipService],
})
export class SponsorshipModule {}
