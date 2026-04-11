import { ChallengeCategory, ChallengePath } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Min, IsNotEmpty } from 'class-validator';

export class UserChallengesQueryDto {
  @IsOptional()
  @IsEnum(ChallengePath)
  path?: ChallengePath;

  @IsOptional()
  @IsEnum(ChallengeCategory)
  category?: ChallengeCategory;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : String(value).trim()))
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 20;
    return Number(value);
  })
  @Min(1)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 1;
    return Number(value);
  })
  @Min(1)
  page?: number;
}