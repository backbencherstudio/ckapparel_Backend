import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchMessagesDto {
  @ApiProperty({
    description: 'Search keyword',
    example: 'project update',
    maxLength: 200,
  })
  @IsString()
  @Length(0, 200)
  @Transform(({ value }) => (value ?? '').toString().trim())
  q: string = '';

  @ApiPropertyOptional({
    description: 'Limit results to one conversation',
    example: 'cmmn2apd30005v86czackjfox',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  skip: number = 0;

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  take: number = 20;
}
