import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanCategory, TrainingPlansCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SupportPlansQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by plan type id',
    example: 'cmnhplan0001v8abc123xyz',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  planTypeId?: string;

  @ApiPropertyOptional({
    enum: PlanCategory,
    description: 'Filter by support category',
    example: PlanCategory.RUNNING,
  })
  @IsOptional()
  @IsEnum(PlanCategory)
  @Transform(({ value }) => (value === '' ? undefined : value))
  category?: PlanCategory;

  @ApiPropertyOptional({
    enum: TrainingPlansCategory,
    description: 'Filter for training plan level',
    example: TrainingPlansCategory.Beginner,
  })
  @IsOptional()
  @IsEnum(TrainingPlansCategory)
  @Transform(({ value }) => (value === '' ? undefined : value))
  trainingPlansCategory?: TrainingPlansCategory;

 
}

