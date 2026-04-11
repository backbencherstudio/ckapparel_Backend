import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChallengeCategory, ChallengeDifficulty, MetricType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChallengeMetricDto {
  @ApiProperty({ enum: MetricType, example: MetricType.DISTANCE_KM })
  @IsEnum(MetricType)
  metric_type: MetricType;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sequence: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  target_value: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  min_threshold?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class CreateChallengeCheckpointDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sequence: number;

  @ApiProperty({ example: 'Checkpoint 1' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Complete this checkpoint to unlock next stage' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Checkpoint targets as metric map',
    example: { DISTANCE_KM: 5, ELEVATION_M: 100 },
  })
  @IsObject()
  metric_targets: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional location for map display',
    example: { lat: -33.865143, lng: 151.2099 },
  })
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };

  @ApiPropertyOptional({
    description: 'Display name for the checkpoint (for map/UX)',
    example: "Owers' Corner",
  })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ example: 'Stage Badge' })
  @IsOptional()
  @IsString()
  reward_title?: string;

  @ApiPropertyOptional({ example: 'Reward description' })
  @IsOptional()
  @IsString()
  reward_description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/reward.png' })
  @IsOptional()
  @IsString()
  reward_image?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_visible?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  unlock_after_checkpoint_seq?: number;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  strava_segment_id?: string;
}

export class CreateChallengeBaseDto {

  @ApiProperty({ example: '50KM Ultra Run' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Only the strongest finish' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Complete 50km challenge based on path rules' })
  @IsOptional()
  @IsString()
  description?: string;


  @ApiProperty({ enum: ChallengeCategory, example: ChallengeCategory.RUNNING })
  @IsEnum(ChallengeCategory)
  category: ChallengeCategory;

  @ApiProperty({ enum: ChallengeDifficulty, example: ChallengeDifficulty.MEDIUM })
  @IsEnum(ChallengeDifficulty)
  difficulty: ChallengeDifficulty;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  require_device_connection?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  allow_manual_submission?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enable_chat?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_participants?: number;

  @ApiPropertyOptional({ example: 'Gold Medal' })
  @IsOptional()
  @IsString()
  reward_title?: string;

  @ApiPropertyOptional({ example: 'Top finishers get exclusive rewards' })
  @IsOptional()
  @IsString()
  reward_description?: string;

  @ApiPropertyOptional({ type: [CreateChallengeMetricDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChallengeMetricDto)
  metrics?: CreateChallengeMetricDto[];

  @ApiPropertyOptional({ type: [CreateChallengeCheckpointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChallengeCheckpointDto)
  checkpoints?: CreateChallengeCheckpointDto[];
}
