import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinChallengeDto {
  @ApiProperty({
    description: 'Optional Strava external connection ID if user already has Strava connected',
    required: false,
    example: 'extconn_abc123',
  })
  @IsOptional()
  @IsString()
  externalConnectionId?: string;
}

export class JoinChallengeResponseDto {
  id: string;
  challengeId: string;
  userId: string;
  status: string;
  joinedAt: Date;
  conversation: {
    id: string;
    title: string;
    type: string;
    membersCount: number;
  } | null;
  strava: {
    connected: boolean;
    required: boolean;
    connectionUrl?: string; // URL to redirect user for Strava OAuth
    externalConnectionId?: string;
  };
  canStart: boolean; // whether user can start the challenge now
  message?: string;
}

export class LeaveChallengeResponseDto {
  challengeId: string;
  userId: string;
  status: string;
  leftAt: Date;
  conversation: {
    id: string;
    title: string;
    type: string;
    membersCount: number;
  } | null;
  message: string;
}
