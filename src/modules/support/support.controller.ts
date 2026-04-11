import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportPlansQueryDto } from './dto/support-plans-query.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('User Support')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiOperation({
    summary: 'Get support plan types for user app',
    description:
      'Returns all support plan types with active plan counts. Use this for top-level support cards (Nutrition Plans, Route Planning, Training Plans, etc.).',
  })
  @ApiOkResponse({ description: 'Support plan types fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('plan-types')
  async getUserSupportPlanTypes() {
    return this.supportService.getUserSupportPlanTypes();
  }

  @ApiOperation({
    summary: 'Get support plans list for user app',
    description:
      'Returns active support plans created from admin side, with filtering for plan type, category, training level, and search.',
  })
  @ApiQuery({
    name: 'planTypeId',
    required: false,
    description: 'Filter by plan type id',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'HIIT'],
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'trainingPlansCategory',
    required: false,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    description: 'Filter training plan level',
  })
  @ApiOkResponse({ description: 'Support plans fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('plans')
  async getUserSupportPlans(@Query() query: SupportPlansQueryDto) {
    return this.supportService.getUserSupportPlans(query);
  }

  @ApiOperation({
    summary: 'Download support plan file',
    description:
      'Returns the file download information for an active support plan. The client can open downloadUrl directly to access the file.',
  })
  @ApiQuery({
    name: 'planId',
    required: true,
    description: 'The id of the support plan to download the file for',
  })
  @ApiOkResponse({
    description: 'Support plan file details returned successfully.',
    schema: {
      example: {
        success: true,
        message: 'Support plan file ready for download',
        data: {
          planId: 'cmnhplan0001v8abc123xyz',
          title: '5km Ultra Running',
          planType: { id: '1', name: 'Nutrition Plans' },
          downloadUrl: 'https://example.com/storage/support-plans/plan.pdf',
          fileName: 'plan.pdf',
          fileType: 'pdf',
          createdAt: '2026-04-04T10:30:00.000Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiBadRequestResponse({ description: 'Invalid planId or plan is inactive.' })
  @ApiNotFoundResponse({ description: 'Support plan or file not found.' })
  @Get('download-plan-file')
  async downloadSupportPlanFile(
    @Query('planId') planId: string,
    @GetUser('userId') userId: string,
  ) {
    return this.supportService.downloadSupportPlanFile(planId, userId);
  }

  @ApiOperation({
    summary: 'Get all active challenges',
    description: 'Returns a list of all active challenges.',
  })
  @ApiOkResponse({ description: 'Challenges fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('challenges/list')
  async getActiveChallenges() {
    return this.supportService.getActiveChallenges();
  }


  @ApiOperation({
    summary: 'Get challenge route planning details by id',
    description:
      'Returns the active challenge and its route plan details, including ordered route days.',
  })
  @ApiQuery({
    name: 'challengeId',
    required: true,
    description: 'The id of the challenge to get route planning details for',
  })
  @ApiOkResponse({
    description: 'Challenge route planning details fetched successfully.',
    schema: {
      example: {
        success: true,
        message: 'Challenge route planning details fetched successfully',
        data: {
          challenge: {
            id: 'cmnchallenge0001v8abc123xyz',
            title: 'Kokoda Trail',
            subtitle: 'Virtual Adventures',
            description: 'A challenging route designed for endurance and pacing.',
            path: 'VIRTUAL_ADVENTURE',
            category: 'RUNNING',
            difficulty: 'CHALLENGING',
            challenge_country: 'Papua New Guinea',
            is_active: true,
            created_at: '2026-04-04T10:30:00.000Z',
            updated_at: '2026-04-04T10:30:00.000Z',
          },
          routePlan: {
            id: 'cmnrouteplan0001v8abc123xyz',
            banner_image_url: 'https://example.com/storage/route-plans/banner.webp',
            about_challenge:
              'Route plan overview for the challenge with route-day breakdown.',
            location: 'Central Park, New York',
            total_distance: '150km',
            average_completion_time: '12 weeks',
            climate_terrain: 'Mixed terrain with moderate climate',
            highest_point: '50m',
            dificulty_rating: 'Intermediate',
            createdAt: '2026-04-04T10:30:00.000Z',
            updatedAt: '2026-04-04T10:30:00.000Z',
            routeDays: [
              {
                id: 'day1',
                sequence: 1,
                day_number: '1',
                title: 'Endurance Run',
                description:
                  'Start with a 5km run at a comfortable pace to build endurance.',
                distance: '5km',
              },
            ],
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiBadRequestResponse({ description: 'Invalid challengeId.' })
  @ApiNotFoundResponse({ description: 'Challenge or route plan not found.' })
  @Get('challenge-route-plan')
  async getChallengeRoutePlanDetails(@Query('challengeId') challengeId: string) {
    return this.supportService.getChallengeRoutePlanDetails(challengeId);
  }


}
