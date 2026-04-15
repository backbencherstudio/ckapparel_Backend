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
  PauseChallengeResponseDto,
  ResumeChallengeResponseDto,
  StartChallengeResponseDto,
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
      'Returns comprehensive challenge information including title, description, metrics, checkpoints, user participation status, progress percentage, active checkpoint sequence, and chat metadata. Includes Strava connection requirements and leaderboard context for user positioning.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID (CUID format)',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Challenge detail fetched successfully.',
    schema: {
      example: {
        success: true,
        message: 'Challenge detail fetched',
        data: {
          id: 'cm8q1n1f50000kq3g7d9h2zab',
          title: '100K Ultra Challenge',
          subtitle: 'Winter 2026 Edition',
          description: 'Complete 100 kilometers within 30 days',
          path: 'ELITE_ATHLETE',
          category: 'RUNNING',
          difficulty: 'ADVANCED',
          require_device_connection: true,
          allow_manual_submission: false,
          enable_chat: true,
          is_featured: true,
          challenge_country: 'US',
          status: 'ACTIVE',
          metrics: [{ metric_type: 'DISTANCE_KM', target_value: 100, is_required: true }],
          checkpoints: [
            { sequence: 1, title: '25K Milestone', metric_targets: { DISTANCE_KM: 25 }, is_required: true },
            { sequence: 2, title: '50K Milestone', metric_targets: { DISTANCE_KM: 50 }, is_required: true }
          ],
          participation: {
            id: 'part123',
            status: 'IN_PROGRESS',
            joined_at: '2026-04-15T10:00:00Z',
            started_at: '2026-04-15T10:05:00Z',
            completed_at: null,
            progress_percent: 45,
            active_checkpoint_seq: 2
          },
          conversation: {
            id: 'conv123',
            title: 'Ultra Challenge 2026',
            type: 'GROUP',
            membersCount: 23
          }
        }
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({ description: 'Challenge not found or has been deleted.' })
  @Get(':id')
  async getUserChallengeDetail(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
  ) {
    return this.challengesService.getUserChallengeDetail(userId, challengeId);
  }

  @ApiOperation({
    summary: 'Get challenge leaderboard with ranked standings',
    description:
      'Returns ranked leaderboard for the specified challenge. Rankings based on: (1) completion status, (2) progress percentage, (3) finish_time_sec (excludes paused duration for fair comparison), (4) start time. Includes user profiles, metrics achieved, and your current position relative to other participants.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID (CUID format)',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of top leaderboard rows to return (default: 50, max: 500)',
    example: 50,
  })
  @ApiOkResponse({
    description: 'Leaderboard fetched and ranked by completion criteria.',
    schema: {
      example: {
        success: true,
        message: 'Challenge leaderboard fetched',
        data: {
          challengeId: 'cm8q1n1f50000kq3g7d9h2zab',
          totalParticipants: 23,
          completed: 8,
          yourRank: 5,
          yourStatus: 'IN_PROGRESS',
          leaderboard: [
            {
              rank: 1,
              user: { id: 'usr1', name: 'John Doe', avatar: 'https://...' },
              status: 'COMPLETED',
              progress_percent: 100,
              finished_at: '2026-04-10T15:30:00Z',
              finish_time_sec: 86400,
              metric_values: { DISTANCE_KM: 100, ELEVATION_M: 2000 }
            },
            {
              rank: 2,
              user: { id: 'usr2', name: 'Jane Smith', avatar: 'https://...' },
              status: 'COMPLETED',
              progress_percent: 100,
              finished_at: '2026-04-11T08:00:00Z',
              finish_time_sec: 130320,
              metric_values: { DISTANCE_KM: 100, ELEVATION_M: 2000 }
            },
            {
              rank: 5,
              user: { id: 'usr_me', name: 'Your Name', avatar: 'https://...' },
              status: 'IN_PROGRESS',
              progress_percent: 45,
              finished_at: null,
              finish_time_sec: null,
              metric_values: { DISTANCE_KM: 45, ELEVATION_M: 900 }
            }
          ]
        }
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({ description: 'Challenge not found or leaderboard not available.' })
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
    summary: 'Join challenge - register as participant (NO timing start)',
    description:
      'Registers user as a challenge participant with status=JOINED and sets joined_at timestamp. Does NOT start challenge timing (started_at remains null). Validates Strava connection requirement. User must call POST /challenges/:id/start separately when ready to begin timing. Optional externalConnectionId body parameter: if provided, uses that specific connection; if omitted, uses primary active Strava connection.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID (CUID format)',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiBody({
    type: JoinChallengeDto,
    description: 'Join request. externalConnectionId is optional - omit to use default Strava connection.',
    examples: {
      minimal: {
        summary: 'Use default Strava connection',
        value: {},
      },
      withConnection: {
        summary: 'Override with specific connection',
        value: {
          externalConnectionId: 'extconn_abc123xyz',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Successfully registered for challenge. Ready to call start endpoint.',
    type: JoinChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({
    description: 'Challenge not found, already in progress, requires Strava but not connected, or participation already exists.',
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
    summary: 'Start challenge timing - begin active attempt',
    description:
      'Begins challenge timing for an already-joined participation (status must be JOINED). Sets started_at timestamp and transitions status to IN_PROGRESS. Subsequent Strava activities with activity_date >= started_at are eligible for progress calculation. Activities during pause windows (logged challenge_paused/challenge_resumed events) are excluded. MUST be called after join endpoint. Empty body - uses Strava connection already selected/confirmed at join time.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID (CUID format)',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Challenge started. Timing is now active. Ready for activities to be tracked.',
    type: StartChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({
    description: 'Challenge not found, not joined first, already completed, Strava required but not connected, or invalid participation state.',
  })
  @Post(':id/start')
  async startChallenge(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
  ): Promise<StartChallengeResponseDto> {
    return this.challengesService.startChallenge(userId, challengeId);
  }

  @ApiOperation({
    summary: 'Pause challenge - suspend timer and exclude activities',
    description:
      'Pauses an active IN_PROGRESS challenge. Sets status=PAUSED and logs challenge_paused event with timestamp. Strava activities with timestamps within pause window (between pause and resume) are automatically excluded from progress calculation. Pause duration is subtracted from final finish_time_sec for fair leaderboard ranking. Only callable when status=IN_PROGRESS. Call resume endpoint to continue from pause point with original started_at preserved.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID (CUID format)',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Challenge paused successfully. Pause event logged. Activities during pause excluded.',
    type: PauseChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({
    description: 'Challenge not found, not in IN_PROGRESS status, already completed, or already paused.',
  })
  @Post(':id/pause')
  async pauseChallenge(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
  ): Promise<PauseChallengeResponseDto> {
    return this.challengesService.pauseChallenge(userId, challengeId);
  }

  @ApiOperation({
    summary: 'Resume paused challenge - continue from pause point',
    description:
      'Resumes a PAUSED challenge to IN_PROGRESS status. Logs challenge_resumed event with timestamp. Original started_at timestamp is preserved (NOT reset). Pause window is recorded in journey logs. Activities after resume continue counting toward progress. Pause duration automatically excluded from leaderboard finish_time_sec calculation for fair ranking. Only callable when status=PAUSED. Validates Strava connection still active if required by challenge.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID (CUID format)',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Challenge resumed successfully. Pause window recorded. Ready for continued activity tracking.',
    type: ResumeChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({
    description: 'Challenge not found, not in PAUSED status, Strava required but disconnected, or invalid participation state.',
  })
  @Post(':id/resume')
  async resumeChallenge(
    @GetUser('userId') userId: string,
    @Param('id') challengeId: string,
  ): Promise<ResumeChallengeResponseDto> {
    return this.challengesService.resumeChallenge(userId, challengeId);
  }

  @ApiOperation({
    summary: 'Leave challenge - abandon participation',
    description:
      'Abandons current challenge attempt and marks participation as ABANDONED. Removes user from challenge group conversation (if member). Can be called from any status (JOINED, IN_PROGRESS, PAUSED) except COMPLETED/ABANDONED. User can re-join using POST /challenges/:id/join endpoint afterward.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge ID (CUID format)',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Left challenge successfully. Removed from group conversation.',
    type: LeaveChallengeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({
    description: 'Challenge not found, not joined, or already completed/abandoned.',
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
