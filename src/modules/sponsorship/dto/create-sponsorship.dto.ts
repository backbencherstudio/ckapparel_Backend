import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ChallengeCategory,
  NeedCategory,
} from '@prisma/client';

export class CreateSponsorshipDto {
  @ApiProperty({
    description: 'The Title of the sponsorship',
    example: 'Run Across Australia Challenge',
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({
    description: 'The description of the sponsorship',
    example: 'A challenge to run across Australia in 30 days',
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @ApiProperty({
    description: 'The funding goal of the sponsorship',
    example: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Funding goal must be a number' })
  fundingGoal: number;

  @ApiProperty({
    description:
      'The category of the Challenge associated with the sponsorship',
    enum: ChallengeCategory,
    example: ChallengeCategory.RUNNING,
  })
  @IsEnum(ChallengeCategory, {
    message: 'Category must be one of RUNNING, CYCLING, SWIMMING, HIIT',
  })
  category: ChallengeCategory;

  @ApiProperty({
    description: 'The needs associated with the sponsorship',
    example: [
      {
        need_category: 'FOOTWEAR',
        need_description: 'Trail running shoes',
      },
    ],
  })
  @IsArray({ message: 'Needs must be an array' })
  @ArrayMinSize(1, { message: 'At least one need is required' })
  @ValidateNested({ each: true })
  @Type(() => SponsorshipNeedDto)
  sponsorship_Needs: SponsorshipNeedDto[];
}

export class SponsorshipNeedDto {
  @ApiProperty({
    description: 'The category of the sponsorship need',
    enum: NeedCategory,
    example: NeedCategory.FOOTWEAR,
  })
  @IsEnum(NeedCategory, {
    message:
      'need_category must be one of FOOTWEAR, NUTRITION, TRANSPORTATION, SUPPLIMENTS, OTHER',
  })
  need_category: NeedCategory;

  @ApiProperty({
    description: 'Additional description for OTHER need category',
    example: 'Need running shoes for the challenge',
  })
  @IsOptional()
  @IsString({ message: 'need_description must be a string' })
  need_description?: string | null;
}
