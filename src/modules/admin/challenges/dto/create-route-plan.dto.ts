import { ApiProperty } from '@nestjs/swagger';

export class CreateRoutePlanDto {
  @ApiProperty({
    description: 'The ID of the challenge this route plan belongs to.',
    example: 'challenge12345',
  })
  challenge_id: string;

  @ApiProperty({
    description: 'Additional details about the challenge route plan.',
    example:
      'A scenic route through the mountains with a total distance of 10km and an average completion time of 1 hour.',
  })
  about_challenge?: string;

  @ApiProperty({
    description: 'The primary location or setting of the challenge route.',
    example: 'Rocky Mountain National Park, Colorado',
  })
  location?: string;

  @ApiProperty({
    description: 'The total distance of the challenge route.',
    example: '10km',
  })
  total_distance?: string;

  @ApiProperty({
    description: 'The average time it takes to complete the challenge route.',
    example: '1 hour',
  })
  average_completion_time?: string;

  @ApiProperty({
    description: 'The highest elevation point of the challenge route.',
    example: '2,500 meters',
  })
  highest_point?: string;

  @ApiProperty({
    description: 'A subjective rating of the route difficulty.',
    example: 'Moderate',
  })
  dificulty_rating?: string;

  @ApiProperty({
    description: 'The Climate & Terrain type of the challenge route.',
    example: 'Mountainous',
  })
  climate_terrain?: string;

  @ApiProperty({
    description: 'The route Banner image URL.',
    example: 'https://example.com/route-banner.jpg',
  })
  banner_image_url?: string;

  @ApiProperty({
    description:
      "The route day plans, which is an array of objects representing each day's activities and details.",
  })
  day_plans?: RouteDayDto[];
}

export class RouteDayDto {
  @ApiProperty({
    description: 'Sequential identifier for the day within the route plan.',
    example: 1,
  })
  sequence: number;

  @ApiProperty({
    description: 'The day number in the route plan.',
    example: 1,
  })
  day_number: string;

  @ApiProperty({
    description: "The title or name of the day's activities.",
    example: 'Base Camp to Checkpoint 1',
  })
  title?: string;

  @ApiProperty({
    description: 'A description of the activities or focus for this day.',
    example: 'Start at the base camp and hike to the first checkpoint.',
  })
  description: string;

  @ApiProperty({
    description: 'The distance covered on this day.',
    example: '5km',
  })
  distance?: string;
}
