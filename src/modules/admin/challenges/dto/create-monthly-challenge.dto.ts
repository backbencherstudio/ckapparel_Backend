import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional } from 'class-validator';
import { CreateChallengeBaseDto } from './create-challenge-base.dto';

export class MonthlyConfigDto {
  @ApiPropertyOptional({
    example: 'main_event',
    enum: ['main_event', 'benchmark', 'regular', 'normal'],
    description:
      'main_event creates a featured monthly campaign, benchmark/regular creates everyday normal challenges.',
  })
  @IsOptional()
  @IsIn(['main_event', 'benchmark', 'regular', 'normal'])
  challenge_kind?: 'main_event' | 'benchmark' | 'regular' | 'normal';

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether the challenge resets monthly.',
  })
  @IsOptional()
  @IsBoolean()
  monthly_reset?: boolean;

  @ApiPropertyOptional({
    example: { month_name: 'November' },
    description:
      'Optional metadata. month_name defaults to the current month if not provided.',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateMonthlyChallengeDto extends CreateChallengeBaseDto {
  @ApiPropertyOptional({ type: MonthlyConfigDto })
  @IsOptional()
  @IsObject()
  monthly_config?: MonthlyConfigDto;
}

