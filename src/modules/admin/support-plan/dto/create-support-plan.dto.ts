import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PlanCategory, TrainingPlansCategory } from '@prisma/client';

// Dynamic enum values from Prisma schema
const PLAN_CATEGORIES = Object.values(PlanCategory);
const TRAINING_CATEGORIES = Object.values(TrainingPlansCategory);

export class CreateSupportPlanDto {
  @ApiProperty({
    example: '1',
    description:
      'Plan type ID from database. Use GET /admin/support-plan/plan-types first.',
  })
  @IsString()
  @IsNotEmpty()
  planTypeId: string;

  @ApiProperty({
    example: 'RUNNING',
    enum: PLAN_CATEGORIES,
    description: `Category type. Accepted values: ${PLAN_CATEGORIES.join(', ')}`,
  })
  @IsEnum(PlanCategory)
  category: PlanCategory;

  @ApiProperty({
    example: '5km Ultra Running',
    description: 'Support plan title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Complete 5km ultra running challenge',
    description: 'Support plan description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 5000, description: 'Distance in meters' })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  })
  @IsOptional()
  @IsNumber()
  distance?: number;

  @ApiPropertyOptional({
    example: 'https://example.com/resource',
    description: 'Resource URL',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  resource_url?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/route',
    description: 'Route URL',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  route_url?: string;

  @ApiPropertyOptional({
    example: 'Beginner',
    enum: TRAINING_CATEGORIES,
    description: `Training difficulty level. Accepted values: ${TRAINING_CATEGORIES.join(', ')}`,
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(TrainingPlansCategory)
  trainingPlansCategory?: TrainingPlansCategory;
}
