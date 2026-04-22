import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class DashboardAthletesTrendQueryDto {
  @ApiPropertyOptional({
    description: 'Number of months to include in trend chart',
    example: 6,
    minimum: 3,
    maximum: 12,
    default: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(12)
  months?: number = 6;
}
