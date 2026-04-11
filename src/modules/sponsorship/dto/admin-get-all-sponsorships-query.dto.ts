import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChallengeCategory, SponsorshipStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminGetAllSponsorshipsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot be greater than 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by sponsorship status',
    enum: SponsorshipStatus,
    example: SponsorshipStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(SponsorshipStatus, {
    message: 'status must be one of OPEN, CLOSED, PENDING, DECLINED',
  })
  status?: SponsorshipStatus;

  @ApiPropertyOptional({
    description: 'Filter by challenge category',
    enum: ChallengeCategory,
    example: ChallengeCategory.CYCLING,
  })
  @IsOptional()
  @IsEnum(ChallengeCategory, {
    message: 'category must be one of RUNNING, CYCLING, SWIMMING, HIIT, OTHER',
  })
  category?: ChallengeCategory;

  @ApiPropertyOptional({
    description: 'Search by sponsorship title or creator name',
    example: 'iron woman',
  })
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  search?: string;
}
