import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UserChallengesQueryDto } from './dto/user-challenges-query.dto';
import {
  JoinChallengeDto,
  JoinChallengeResponseDto,
  LeaveChallengeResponseDto,
} from './dto/join-challenge.dto';
import { SubmitCommunityChallengeDto } from './dto/submit-community-challenge.dto';

@ApiTags('User Challenges')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @ApiOperation({
    summary: 'Submit a community challenge for admin approval',
    description:
      'User-side endpoint for creating only COMMUNITY_CHALLENGE submissions. Submission is saved as PENDING and stays inactive until reviewed by admin.',
  })
  @ApiBody({
    type: SubmitCommunityChallengeDto,
    description:
      'Community challenge payload. Uses the same structure as admin community challenge create, but this endpoint always creates a pending submission.',
  })
  @ApiOkResponse({
    description:
      'Community challenge submitted successfully and waiting for admin approval. The challenge status will be PENDING and is_active will be false.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiBadRequestResponse({ description: 'Invalid challenge payload.' })
  @Post('community/submit')
  async submitCommunityChallenge(
    @GetUser('userId') userId: string,
    @Body() createChallengeDto: SubmitCommunityChallengeDto,
  ) {
    return this.challengesService.submitCommunityChallenge(
      userId,
      createChallengeDto,
    );
  }

  @ApiOperation({
    summary: 'Get challenge feed for user app',
    description:
      'Returns user-side challenge cards for one selected path only. Category can be used to narrow the selected path further. The response is shaped for the mobile screens and includes chat, leaderboard, and attempt action metadata.',
  })
  @ApiQuery({
    name: 'path',
    required: true,
    enum: [
      'ELITE_ATHLETE',
      'MONTHLY_CHALLENGE',
      'VIRTUAL_ADVENTURE',
      'COMMUNITY_CHALLENGE',
    ],
    description: 'Filter by challenge path',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'HIIT', 'OTHER'],
    description: 'Optional category filter within the selected path',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by challenge title or subtitle',
    example: '',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size',
    example: 20,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiOkResponse({ description: 'User challenge feed fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get()
  async getUserChallengeFeed(
    @GetUser('userId') userId: string,
    @Query() query: UserChallengesQueryDto,
  ) {
    return this.challengesService.getUserChallengeFeed(userId, query);
  }

  @ApiOperation({
    summary: 'Get challenge detail for user app',
    description:
      'Returns challenge detail, user progress, checkpoints, chat action metadata, and attempt connection requirements.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Challenge detail fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get(':id')
  async getUserChallengeDetail(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
  ) {
    return this.challengesService.getUserChallengeDetail(userId, challengeId);
  }

  @ApiOperation({
    summary: 'Get challenge leaderboard',
    description:
      'Returns leaderboard rows for the selected challenge, including rank, progress, finish time, and user profile snippets.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max leaderboard rows to return',
    example: 50,
  })
  @ApiOkResponse({ description: 'Challenge leaderboard fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get(':id/leaderboard')
  async getChallengeLeaderboard(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.challengesService.getChallengeLeaderboard(
      userId,
      challengeId,
      Number(limit || 50),
    );
  }

  @ApiOperation({
    summary: 'Join a challenge as a participant',
    description:
      'Creates a new participation or re-joins an existing one by resetting status to JOINED. Also auto-adds the user to the challenge group conversation and returns connection status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Successfully joined the challenge.',
    type: JoinChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiBadRequestResponse({
    description: 'Invalid challenge or missing connection.',
  })
  @Post(':id/join')
  async joinChallenge(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
    @Body() joinDto: JoinChallengeDto,
  ): Promise<JoinChallengeResponseDto> {
    return this.challengesService.joinChallenge(userId, challengeId, joinDto);
  }

  @ApiOperation({
    summary: 'Leave a challenge as a participant',
    description:
      'Marks the current participation as abandoned and removes the user from the challenge group conversation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Successfully left the challenge.',
    type: LeaveChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiBadRequestResponse({
    description: 'Invalid challenge or participation state.',
  })
  @Delete(':id/leave')
  async leaveChallenge(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
  ): Promise<LeaveChallengeResponseDto> {
    return this.challengesService.leaveChallenge(userId, challengeId);
  }

  @ApiOperation({
    summary: 'Get user challenge history',
    description:
      'Returns a paginated list of the authenticated user challenge participation records with related challenge data.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20)',
    example: 20,
  })
  @ApiOkResponse({
    description: 'User challenge history fetched successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'User challenge history fetched successfully',
        },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'clu123abc' },
                  created_at: { type: 'string', example: '2026-03-01T08:00:00.000Z' },
                  updated_at: { type: 'string', example: '2026-03-01T09:30:00.000Z' },
                  deleted_at: { type: 'string', nullable: true, example: null },
                  user_id: { type: 'string', example: 'usr123abc' },
                  challenge_id: { type: 'string', example: 'ch123abc' },
                  status: { type: 'string', example: 'COMPLETED' },
                  joined_at: { type: 'string', example: '2026-03-01T08:05:00.000Z' },
                  started_at: { type: 'string', nullable: true, example: '2026-03-01T08:15:00.000Z' },
                  completed_at: { type: 'string', nullable: true, example: '2026-03-01T09:30:00.000Z' },
                  last_activity_at: { type: 'string', nullable: true, example: '2026-03-01T09:25:00.000Z' },
                  last_synced_at: { type: 'string', nullable: true, example: null },
                  external_connection_id: { type: 'string', nullable: true, example: null },
                  source_provider: { type: 'string', nullable: true, example: 'STRAVA' },
                  progress_percent: { type: 'number', nullable: true, example: 100 },
                  metric_values: { type: 'object', nullable: true, example: { DISTANCE_KM: 50 } },
                  active_checkpoint_seq: { type: 'number', nullable: true, example: 5 },
                  challenge: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'ch123abc' },
                      title: { type: 'string', example: '50KM Ultra Run' },
                      path: { type: 'string', example: 'ELITE_ATHLETE' },
                      category: { type: 'string', example: 'RUNNING' },
                      difficulty: { type: 'string', example: 'INTERMEDIATE' },
                      challenge_country: { type: 'string', example: 'US' },
                      subtitle: { type: 'string', example: 'Mountain edition' },
                      description: { type: 'string', example: 'A hard endurance challenge' },
                      status: { type: 'string', example: 'ACTIVE' },
                      created_at: { type: 'string', example: '2026-02-01T08:00:00.000Z' },
                      updated_at: { type: 'string', example: '2026-03-01T09:30:00.000Z' },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 14 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 20 },
                totalPages: { type: 'number', example: 1 },
                hasNextPage: { type: 'boolean', example: false },
                hasPreviousPage: { type: 'boolean', example: false },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('history/all')
  async getUserChallengeHistory(
    @GetUser('userId') userId: string,
    @Query() query: UserChallengesQueryDto,
  ) {
    return this.challengesService.getUserChallengeHistory(userId, query);
  }
}
