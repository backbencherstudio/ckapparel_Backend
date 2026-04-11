import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

const PLAN_CATEGORIES = Object.values(PlanCategory);

export class SupportPlanCardsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by plan type ID',
    example: '1',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  planTypeId?: string;

  @ApiPropertyOptional({
    description: `Filter by category. Accepted values: ${PLAN_CATEGORIES.join(', ')}`,
    enum: PLAN_CATEGORIES,
    example: 'RUNNING',
  })
  @IsOptional()
  @IsEnum(PlanCategory)
  @Transform(({ value }) => (value === '' ? undefined : value))
  category?: PlanCategory;

  @ApiPropertyOptional({
    description: 'Filter by status (1 = active, 0 = inactive)',
    example: '1',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    return Number(value);
  })
  status?: number;
}