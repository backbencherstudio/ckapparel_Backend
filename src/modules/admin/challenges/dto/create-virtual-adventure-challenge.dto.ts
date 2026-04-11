import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { CreateChallengeBaseDto } from './create-challenge-base.dto';

export class VirtualAdventureConfigDto {
  @ApiProperty({ example: 'Kokoda Trail' })
  @IsString()
  route_name: string;

  @ApiProperty({ example: 96 })
  @IsNumber()
  @Min(0)
  route_distance_km: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  require_gps: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  enable_journey_log: boolean;

  @ApiProperty({ example: { route_start: { lat: -9.0, lng: 147.7 }, route_end: { lat: -8.8, lng: 147.9 } } })
  @IsOptional()
  @IsObject()
  route_points?: Record<string, any>;
}

export class CreateVirtualAdventureChallengeDto extends CreateChallengeBaseDto {
  @ApiProperty({ type: VirtualAdventureConfigDto })
  @IsObject()
  virtual_config: VirtualAdventureConfigDto;
}
