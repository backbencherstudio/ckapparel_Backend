import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StravaSyncDto {
  @ApiPropertyOptional({
    description:
      'Optional specific external connection id (must belong to authenticated user). Read this value from GET /api/strava/connection response.',
    example: 'cm9xyzconnection123',
  })
  @IsOptional()
  @IsString()
  externalConnectionId?: string;

  @ApiPropertyOptional({
    description:
      'Optional filter. Sync activities strictly after this UNIX timestamp (seconds). Example source: convert your target date/time to epoch seconds.',
    example: 1712000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  after?: number;

  @ApiPropertyOptional({
    description:
      'Optional filter. Sync activities strictly before this UNIX timestamp (seconds).',
    example: 1719999999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;

  @ApiPropertyOptional({
    description: 'Optional pagination start page. Defaults to 1.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Optional pagination size. Strava max is 200. Practical test value is 20 or 50.',
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  perPage?: number;

  @ApiPropertyOptional({
    description:
      'Optional safety limit for pages in one request. Start with 1 for testing to avoid large backfills.',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  maxPages?: number;
}
