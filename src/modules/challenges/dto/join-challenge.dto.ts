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
  success: boolean;
  message: string;
  data: {
    id: string;
    challengeId: string;
    userId: string;
    status: string;
    joinedAt: Date;
    startedAt?: Date | null;
    conversation: {
      id: string;
      title: string;
      type: string;
      membersCount: number;
    } | null;
    strava: {
      connected: boolean;
      required: boolean;
      connectionUrl?: string;
      externalConnectionId?: string;
    };
    canStart: boolean;
  };
}

export class StartChallengeResponseDto {
  success: boolean;
  message: string;
  data: {
    id: string;
    challengeId: string;
    userId: string;
    status: string;
    startedAt: Date;
    joinedAt: Date;
  };
}

export class PauseChallengeResponseDto {
  success: boolean;
  message: string;
  data: {
    challengeId: string;
    userId: string;
    status: string;
    pausedAt: Date;
  };
}

export class ResumeChallengeResponseDto {
  success: boolean;
  message: string;
  data: {
    challengeId: string;
    userId: string;
    status: string;
    resumedAt: Date;
    startedAt: Date;
  };
}

export class LeaveChallengeResponseDto {
  success: boolean;
  message: string;
  data: {
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
  };
}
