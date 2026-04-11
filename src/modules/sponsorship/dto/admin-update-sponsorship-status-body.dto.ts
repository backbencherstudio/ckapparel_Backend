import { ApiProperty } from '@nestjs/swagger';
import { SponsorshipStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AdminUpdateSponsorshipStatusBodyDto {
  @ApiProperty({
    description: 'New status for admin moderation flow',
    enum: [
      SponsorshipStatus.OPEN,
      SponsorshipStatus.CLOSED,
      SponsorshipStatus.PENDING,
      SponsorshipStatus.DECLINED,
    ],
    example: SponsorshipStatus.OPEN,
  })
  @IsEnum(SponsorshipStatus, {
    message: 'status must be one of OPEN, CLOSED, PENDING, DECLINED',
  })
  status: SponsorshipStatus;
}
