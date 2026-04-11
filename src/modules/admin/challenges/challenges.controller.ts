import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import {
  ChallengesService,
  GetChallengesAdminParams,
} from './challenges.service';
import { CreateMonthlyChallengeDto } from './dto/create-monthly-challenge.dto';
import { CreateVirtualAdventureChallengeDto } from './dto/create-virtual-adventure-challenge.dto';
import { CreateEliteChallengeDto } from './dto/create-elite-challenge.dto';
import { CreateCommunityChallengeDto } from './dto/create-community-challenge.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import {
  ChallengeCategory,
  ChallengeDifficulty,
  ChallengePath,
  ChallengeStatus,
} from '@prisma/client';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';

const MONTHLY_MAIN_EVENT_CHALLENGE_EXAMPLE = {
  title: 'The Vertical 1000',
  subtitle: "November's Main Event",
  description: 'Climb 1,000 meters in one month.',
  category: 'RUNNING',
  difficulty: 'HARD',
  require_device_connection: true,
  allow_manual_submission: true,
  enable_chat: true,
  is_active: true,
  is_featured: true,
  max_participants: 5000,
  reward_title: 'Vertical Victor Digital Medal',
  reward_description: 'Awarded after completing monthly target.',
  monthly_config: {
    challenge_kind: 'main_event',
    monthly_reset: true,
    metadata: {
      month_name: 'November',
    },
  },
  metrics: [
    {
      metric_type: 'ELEVATION_M',
      sequence: 1,
      target_value: 1000,
      min_threshold: 50,
      is_required: true,
    },
  ],
  // No checkpoints allowed for monthly challenges
  // No checkpoints allowed for monthly challenges
};

const MONTHLY_BENCHMARK_CHALLENGE_EXAMPLE = {
  title: '5KM Time Benchmark',
  subtitle: 'Monthly Benchmark',
  description: 'Track your 5KM performance against your own history.',
  category: 'RUNNING',
  difficulty: 'MEDIUM',
  require_device_connection: true,
  allow_manual_submission: false,
  enable_chat: true,
  is_active: true,
  is_featured: false,
  reward_title: 'Benchmark Completion Badge',
  reward_description: 'Awarded for finishing this benchmark cycle.',
  monthly_config: {
    challenge_kind: 'benchmark',
    monthly_reset: false,
    metadata: {
      benchmark_group: '5KM_TIME_TRIAL',
      month_name: 'November',
    },
  },
  metrics: [
    {
      metric_type: 'DISTANCE_KM',
      sequence: 1,
      target_value: 5,
      is_required: true,
    },
    {
      metric_type: 'DURATION_MIN',
      sequence: 2,
      target_value: 30,
      is_required: true,
    },
  ],
};

const VIRTUAL_ADVENTURE_CHALLENGE_EXAMPLE = {
  title: 'Kokoda Trail',
  subtitle: 'Virtual Adventures',
  description:
    'Retrace the footsteps of heroes along the grueling 96km Kokoda Trail in Papua New Guinea. This is a challenge: it’s a pilgrimage through dense jungle, over steep passes, and across rushing rivers, where courage and endurance were tested to their absolute limits during World War II.',
  category: 'RUNNING',
  difficulty: 'CHALLENGING',
  require_device_connection: true,
  allow_manual_submission: false,
  enable_chat: true,
  is_active: true,
  max_participants: 10000,
  reward_title: 'Exclusive Finisher Gear',
  reward_description: 'Unlocked after completing the full route.',
  challenge_country: 'Papua New Guinea',
  virtual_config: {
    route_name: 'Kokoda Trail',
    route_distance_km: 96,
    require_gps: true,
    enable_journey_log: true,
    route_points: {
      route_start: { lat: -9.4438, lng: 147.1803 },
      route_end: { lat: -8.77, lng: 147.74 },
      waypoints: [
        { lat: -9.4, lng: 147.2, name: "Owers' Corner" },
        { lat: -9.3, lng: 147.3, name: 'Templeton’s Crossing' },
        { lat: -9.2, lng: 147.4, name: 'Isurava Battlefield' },
        { lat: -8.8, lng: 147.7, name: 'Kokoda Village' },
      ],
    },
  },
  metrics: [
    {
      metric_type: 'DISTANCE_KM',
      sequence: 1,
      target_value: 96,
      is_required: true,
    },
    {
      metric_type: 'ELEVATION_M',
      sequence: 2,
      target_value: 2500,
      is_required: false,
    },
  ],
  checkpoints: [
    {
      sequence: 1,
      title: "Owers' Corner",
      description: 'Trailhead and starting point',
      metric_targets: { DISTANCE_KM: 10 },
      is_visible: true,
      is_required: true,
      unlock_after_checkpoint_seq: null,
    },
    {
      sequence: 2,
      title: 'Ioribaiwa Ridge',
      description: 'Steep climb and first major test',
      metric_targets: { DISTANCE_KM: 25 },
      is_visible: true,
      is_required: true,
      unlock_after_checkpoint_seq: 1,
    },
    {
      sequence: 3,
      title: 'Templeton’s Crossing',
      description: 'Midway point, river crossing',
      metric_targets: { DISTANCE_KM: 50 },
      is_visible: true,
      is_required: true,
      unlock_after_checkpoint_seq: 2,
    },
    {
      sequence: 4,
      title: 'Isurava Battlefield',
      description: 'Historic WWII site',
      metric_targets: { DISTANCE_KM: 75 },
      is_visible: true,
      is_required: true,
      unlock_after_checkpoint_seq: 3,
    },
    {
      sequence: 5,
      title: 'Kokoda Village',
      description: 'Finish line and celebration',
      metric_targets: { DISTANCE_KM: 96 },
      is_visible: true,
      is_required: true,
      unlock_after_checkpoint_seq: 4,
    },
  ],
};

const ELITE_CHALLENGE_EXAMPLE = {
  title: '50KM Ultra Run',
  subtitle: 'Elite Challenge',
  description: 'Complete a 50km run within 6 hours.',
  category: 'RUNNING',
  difficulty: 'EASY',
  challenge_country: 'Papua New Guinea',
  require_device_connection: true,
  allow_manual_submission: true,
  enable_chat: true,
  is_active: true,
  metrics: [
    {
      metric_type: 'DISTANCE_KM',
      sequence: 1,
      target_value: 50,
      is_required: true,
    },
    {
      metric_type: 'DURATION_MIN',
      sequence: 2,
      target_value: 360,
      is_required: true,
    },
  ],
};

const COMMUNITY_CHALLENGE_EXAMPLE = {
  title: 'The Vertical 1000',
  subtitle: 'Community Hub',
  description:
    'Climb 1,000 meters of elevation in a single, continuous session. Use hills, stairs, or a Stairmaster. A pure test of climbing power and grit.',
  category: 'RUNNING',
  difficulty: 'HARD',
  require_device_connection: true,
  allow_manual_submission: true,
  enable_chat: true,
  is_active: true,
  reward_title: 'Community Finisher',
  reward_description: 'Awarded for completing the challenge.',
  metrics: [
    {
      metric_type: 'ELEVATION_M',
      sequence: 1,
      target_value: 1000,
      is_required: true,
    },
    {
      metric_type: 'DISTANCE_KM',
      sequence: 2,
      target_value: 60,
      is_required: false,
    },
    {
      metric_type: 'DURATION_MIN',
      sequence: 3,
      target_value: 300,
      is_required: false,
    },
  ],
  checkpoints: [
    {
      sequence: 1,
      title: "Owers' Corner",
      display_name: "Owers' Corner",
      location: { lat: -9.4438, lng: 147.1803 },
      description:
        'Carefully approach the intersection and watch for vehicles from all directions. Use the designated crossing area, wait for a safe gap in traffic, and cross the road steadily while staying alert.',
      metric_targets: { DISTANCE_KM: 10 },
      is_visible: true,
      is_required: true,
      unlock_after_checkpoint_seq: null,
    },
  ],
};

@ApiBearerAuth('admin_token')
@ApiTags('Admin Challenges Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @ApiOperation({
    summary: 'Create Monthly Challenge',
    description:
      'Creates a monthly challenge and auto-creates a dedicated group conversation for this challenge with admin users.',
  })
  @ApiBody({
    type: CreateMonthlyChallengeDto,
    description:
      'Frontend JSON payload for monthly challenge creation. Use main_event for flagship monthly campaign and benchmark for repeatable performance tracking.',
    examples: {
      mainEvent: {
        summary: 'Monthly main_event payload',
        value: MONTHLY_MAIN_EVENT_CHALLENGE_EXAMPLE,
      },
      benchmark: {
        summary: 'Monthly benchmark payload',
        value: MONTHLY_BENCHMARK_CHALLENGE_EXAMPLE,
      },
    },
  })
  @ApiOkResponse({
    description:
      'Challenge created successfully. Response includes challenge and auto-created conversation metadata.',
  })
  @ApiBadRequestResponse({ description: 'Invalid challenge payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post('monthly')
  async createMonthly(
    @Body() createChallengeDto: CreateMonthlyChallengeDto,
    @GetUser('userId') userId: string,
  ) {
    try {
      const challenge = await this.challengesService.createMonthlyChallenge(
        createChallengeDto,
        userId,
      );
      return challenge;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Create Virtual Adventure Challenge',
    description:
      'Creates a virtual adventure challenge and auto-creates a dedicated group conversation for this challenge with admin users.',
  })
  @ApiBody({
    type: CreateVirtualAdventureChallengeDto,
    description:
      'Frontend JSON payload for virtual adventure challenge creation.',
    examples: {
      virtualAdventure: {
        summary: 'Virtual adventure payload',
        value: VIRTUAL_ADVENTURE_CHALLENGE_EXAMPLE,
      },
    },
  })
  @ApiOkResponse({
    description:
      'Challenge created successfully. Response includes challenge and auto-created conversation metadata.',
  })
  @ApiBadRequestResponse({ description: 'Invalid challenge payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post('virtual-adventure')
  async createVirtualAdventure(
    @Body() createChallengeDto: CreateVirtualAdventureChallengeDto,
    @GetUser('userId') userId: string,
  ) {
    try {
      return await this.challengesService.createVirtualAdventureChallenge(
        createChallengeDto,
        userId,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Create Elite Challenge',
    description:
      'Creates an elite athlete challenge and auto-creates a dedicated group conversation for this challenge with admin users.',
  })
  @ApiBody({
    type: CreateEliteChallengeDto,
    description: 'Frontend JSON payload for elite challenge creation.',
    examples: {
      elite: {
        summary: 'Elite challenge payload',
        value: ELITE_CHALLENGE_EXAMPLE,
      },
    },
  })
  @ApiOkResponse({
    description:
      'Challenge created successfully. Response includes challenge and auto-created conversation metadata.',
  })
  @ApiBadRequestResponse({ description: 'Invalid challenge payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post('elite')
  async createElite(
    @Body() createChallengeDto: CreateEliteChallengeDto,
    @GetUser('userId') userId: string,
  ) {
    try {
      return await this.challengesService.createEliteChallenge(
        createChallengeDto,
        userId,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Create Community Challenge',
    description:
      'Creates a community challenge. Checkpoints are optional. No sponsor or extra config. Also auto-creates a dedicated group conversation for this challenge with admin users.',
  })
  @ApiBody({
    type: CreateCommunityChallengeDto,
    description:
      'Frontend JSON payload for community challenge creation. Checkpoints are optional.',
    examples: {
      withCheckpoints: {
        summary: 'Community challenge with checkpoints',
        value: COMMUNITY_CHALLENGE_EXAMPLE,
      },
      noCheckpoints: {
        summary: 'Community challenge without checkpoints',
        value: {
          ...COMMUNITY_CHALLENGE_EXAMPLE,
          checkpoints: undefined,
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Challenge created successfully. Response includes challenge and auto-created conversation metadata.',
  })
  @ApiBadRequestResponse({ description: 'Invalid challenge payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post('community')
  async createCommunity(
    @Body() createChallengeDto: CreateCommunityChallengeDto,
    @GetUser() user,
  ) {
    try {
      return await this.challengesService.createCommunityChallenge(
        createChallengeDto,
        user.userId,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ================================================
  // Get challenges with filtering, pagination, etc. can be implemented here
  // ================================================

  @ApiOperation({
    summary: 'Get challenges with filters',
    description:
      'Returns a list of challenges with optional filtering by path, category, difficulty, and active status.',
  })
  @ApiQuery({
    name: 'path',
    required: false,
    enum: ChallengePath,
    description: 'Challenge path filter',
    example: 'monthly',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ChallengeCategory,
    description: 'Challenge category filter',
    example: 'RUNNING',
  })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: ChallengeDifficulty,
    description: 'Challenge difficulty filter',
    example: 'HARD',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ChallengeStatus,
    description: 'Filter by active status',
    example: 'ACTIVE',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (pagination)',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size (pagination)',
    example: 20,
    type: Number,
  })
  @ApiOkResponse({ description: 'Challenges fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get()
  async getChallengesAdmin(
    @Query() query: GetChallengesAdminParams,
    @GetUser() user,
  ) {
    try {
      console.log('Admin user fetching challenges:', user);
      const challenges = await this.challengesService.getChallengesAdmin(
        query,
        user.userId,
      );
      return challenges;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get a Single challenge by id',
    description: 'Returns a single challenge by id.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Challenge fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid challenge id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get(':id')
  async getSingleChallenge(@Param('id') id: string) {
    try {
      const challenge = await this.challengesService.getSingleChallenge(id);
      return challenge;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Delete a challenge by id including related data',
    description: 'Deletes a challenge by id and all related data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({
    description: 'Challenge deleted and related data cleared successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid challenge id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Delete(':id')
  async deleteChallenge(@Param('id') id: string) {
    try {
      const deletedChallenge = await this.challengesService.deleteChallenge(id);
      return deletedChallenge;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update a challenge by id',
    description: 'Updates a challenge by id with the provided data.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiBody({
    description:
      'Any field from challenge creation can be updated. Use the same structure as the create endpoints. Only include fields that need to be updated.',
    examples: {
      updateMonthlyMainEvent: {
        summary: 'Update monthly main event challenge',
        value: MONTHLY_MAIN_EVENT_CHALLENGE_EXAMPLE,
      },
      updateMonthlyBenchmark: {
        summary: 'Update monthly benchmark challenge',
        value: MONTHLY_BENCHMARK_CHALLENGE_EXAMPLE,
      },
      updateVirtualAdventure: {
        summary: 'Update virtual adventure challenge',
        value: VIRTUAL_ADVENTURE_CHALLENGE_EXAMPLE,
      },
      updateElite: {
        summary: 'Update elite challenge',
        value: ELITE_CHALLENGE_EXAMPLE,
      },
      updateCommunity: {
        summary: 'Update community challenge',
        value: COMMUNITY_CHALLENGE_EXAMPLE,
      },
    },
  })
  @ApiOkResponse({ description: 'Challenge updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid challenge id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch('update/:id')
  async updateChallenge(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateMonthlyChallengeDto>, // Using Create DTO for simplicity, ideally should have a separate Update DTO
  ) {
    try {
      const updatedChallenge = await this.challengesService.updateChallenge(
        id,
        updateData,
      );
      return updatedChallenge;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Approve or reject a community challenge submission',
    description:
      'Approves or rejects a community challenge submission by id. Only applicable for community challenges.',
  })
  @ApiParam({
    name: 'id',
    description: 'Challenge submission id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiBody({
    schema: {
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: Object.values(ChallengeStatus),
          example: 'ACTIVE',
          description: `Allowed values: ${Object.values(ChallengeStatus).join(', ')}`,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Challenge submission status updated successfully.',
  })
  @ApiBadRequestResponse({ description: 'Invalid submission id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch('submission-review/:id')
  async reviewSubmission(
    @Param('id') id: string,
    @Body('status') status: ChallengeStatus,
    @GetUser('userId') reviewedByUserId: string,
  ) {
    try {
      const submission = await this.challengesService.reviewCommunitySubmission(
        id,
        status,
        reviewedByUserId,
      );
      return submission;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

}
