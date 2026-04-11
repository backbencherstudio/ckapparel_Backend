import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional } from 'class-validator';
import { CreateChallengeBaseDto } from './create-challenge-base.dto';

export class MonthlyConfigDto {
  @ApiProperty({
    example: 'main_event',
    enum: ['main_event', 'benchmark'],
    description:
      'main_event creates a featured monthly campaign, benchmark creates repeatable performance tracking.',
  })
  @IsIn(['main_event', 'benchmark'])
  challenge_kind: 'main_event' | 'benchmark';

  @ApiProperty({
    example: true,
    description:
      'For main_event this is enforced as true by backend. For benchmark this is used as provided.',
  })
  @IsBoolean()
  monthly_reset: boolean;

  @ApiProperty({
    example: { month_name: 'November', benchmark_group: '5KM_TIME_TRIAL' },
    description:
      'main_event requires metadata.month_name. benchmark requires metadata.benchmark_group.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateMonthlyChallengeDto extends CreateChallengeBaseDto {
  @ApiProperty({ type: MonthlyConfigDto })
  @IsObject()
  monthly_config: MonthlyConfigDto;

}
