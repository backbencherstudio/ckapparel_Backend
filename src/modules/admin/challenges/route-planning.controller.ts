import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ChallengesService } from './challenges.service';
import { CreateRoutePlanDto } from './dto/create-route-plan.dto';

@ApiBearerAuth('admin_token')
@ApiTags('Admin Route Planning Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/challenges')
export class RoutePlanningController {
  constructor(private readonly challengesService: ChallengesService) {}

  @ApiOperation({
    summary: 'Get route plans list',
    description:
      'Returns route plans with pagination. Optional filters by challengeId and search text.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Page size (default: 20, max: 100).',
  })
  @ApiQuery({
    name: 'challengeId',
    required: false,
    type: String,
    example: 'cm8q1n1f50000kq3g7d9h2zab',
    description: 'Filter route plans by challenge ID.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'Kokoda',
    description:
      'Search by challenge title, route location, or about_challenge text.',
  })
  @ApiOkResponse({ description: 'Route plans fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('route-plan/list')
  async getRoutePlans(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('challengeId') challengeId?: string,
    @Query('search') search?: string,
  ) {
    try {
      return await this.challengesService.getRoutePlans({
        page,
        limit,
        challengeId,
        search,
      });
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get route plan details',
    description:
      'Returns a single route plan by id including challenge info and day plans.',
  })
  @ApiParam({
    name: 'routePlanId',
    description: 'Route plan id.',
    example: 'cmnljrab70001v8jsc91f8boz',
  })
  @ApiOkResponse({ description: 'Route plan fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid route plan id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('route-plan/:routePlanId')
  async getRoutePlanDetails(@Param('routePlanId') routePlanId: string) {
    try {
      return await this.challengesService.getRoutePlanById(routePlanId);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Create route plan for a challenge',
    description:
      'Creates a route plan for a specific challenge. This is used for challenges that have a route component, such as virtual adventures.',
  })
  @ApiParam({
    name: 'challengeId',
    description: 'Challenge id for which to create the route plan.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Multipart payload for route plan creation. Upload `banner_image` to store route banner and provide `day_plans` as JSON array or object array.',
    schema: {
      type: 'object',
      properties: {
        about_challenge: {
          type: 'string',
          example:
            'A multi-day endurance route across mountain terrain designed for virtual adventure participants.',
        },
        location: {
          type: 'string',
          example: 'Kokoda Trail, Papua New Guinea',
        },
        total_distance: {
          type: 'string',
          example: '96km',
        },
        average_completion_time: {
          type: 'string',
          example: '5-7 days',
        },
        highest_point: {
          type: 'string',
          example: '2,190 meters',
        },
        dificulty_rating: {
          type: 'string',
          example: 'Hard',
        },
        climate_terrain: {
          type: 'string',
          example: 'Tropical rainforest, steep climbs, muddy tracks',
        },
        banner_image: {
          type: 'string',
          format: 'binary',
          description: 'Optional banner image file (jpeg/png/webp, max 5MB).',
        },
        day_plans: {
          oneOf: [
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sequence: { type: 'number', example: 1 },
                  day_number: { type: 'string', example: '1-2 days' },
                  title: { type: 'string', example: "Owers' Corner to Ua-Ule" },
                  description: {
                    type: 'string',
                    example:
                      'Start from Owers Corner and move through gradual ascents with hydration points.',
                  },
                  distance: { type: 'string', example: '18km' },
                },
              },
            },
            {
              type: 'string',
              example:
                '[{"sequence":1,"day_number":"1-2 days","title":"Owers\' Corner to Ua-Ule","description":"Start from Owers Corner","distance":"18km"}]',
              description:
                'JSON stringified array (useful for multipart/form-data).',
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Route plan created successfully for the challenge.',
  })
  @ApiBadRequestResponse({ description: 'Invalid challenge id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @UseInterceptors(
    FileInterceptor('banner_image', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(
            new BadRequestException(
              'Only image files are allowed for banner_image',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Post(':challengeId/route-plan')
  async createRoutePlan(
    @Param('challengeId') challengeId: string,
    @Body() createRoutePlanDto: CreateRoutePlanDto,
    @UploadedFile() bannerImage?: Express.Multer.File,
  ) {
    try {
      const routePlan = await this.challengesService.createRoutePlan(
        challengeId,
        createRoutePlanDto,
        bannerImage,
      );
      return routePlan;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update route plan for a challenge',
    description:
      'Updates an existing route plan. Optionally upload new banner_image to replace the existing one. To update day_plans: include `id` in items to update existing days, omit `id` to create new days, and days not in list are deleted.',
  })
  @ApiParam({
    name: 'routePlanId',
    description: 'Route plan id to update.',
    example: 'cmnljrab70001v8jsc91f8boz',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Multipart payload for route plan update. All fields are optional. If day_plans is provided, existing days are replaced.',
    schema: {
      type: 'object',
      properties: {
        about_challenge: {
          type: 'string',
          example: 'Updated multi-day endurance route across mountain terrain.',
        },
        location: {
          type: 'string',
          example: 'Updated location',
        },
        total_distance: {
          type: 'string',
          example: '100km',
        },
        average_completion_time: {
          type: 'string',
          example: '6-8 days',
        },
        highest_point: {
          type: 'string',
          example: '2,500 meters',
        },
        dificulty_rating: {
          type: 'string',
          example: 'Very Hard',
        },
        climate_terrain: {
          type: 'string',
          example: 'Updated terrain description',
        },
        banner_image: {
          type: 'string',
          format: 'binary',
          description:
            'Optional new banner image file (jpeg/png/webp, max 5MB). If provided, replaces existing image.',
        },
        day_plans: {
          oneOf: [
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: 'cmnljrabw0002v8jsa0t1g3t8',
                    description:
                      'Optional existing route day ID. If provided, updates that day; if omitted, creates new day.',
                  },
                  day_number: { type: 'string', example: '1-2 days' },
                  title: { type: 'string', example: 'Checkpoint 1' },
                  description: { type: 'string', example: 'Day description' },
                  distance: { type: 'string', example: '20km' },
                },
              },
              description:
                'Array of day plans. Items with `id` update existing days; items without `id` create new days. Days not in list are deleted.',
            },
            {
              type: 'string',
              example:
                '[{"id":"cmnljrabw0002v8jsa0t1g3t8","day_number":"1-2","title":"CP1-Updated","description":"Start","distance":"20km"},{"day_number":"2-3","title":"CP2","description":"Continue","distance":"18km"}]',
              description:
                'JSON stringified array (same structure as array above).',
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      'Route plan updated successfully. Day plans with `id` are updated; without `id` are created; omitted days are deleted.',
  })
  @ApiBadRequestResponse({ description: 'Invalid route plan id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @UseInterceptors(
    FileInterceptor('banner_image', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(
            new BadRequestException(
              'Only image files are allowed for banner_image',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Patch(':routePlanId/edit')
  async updateRoutePlan(
    @Param('routePlanId') routePlanId: string,
    @Body() updateRoutePlanDto: CreateRoutePlanDto,
    @UploadedFile() bannerImage?: Express.Multer.File,
  ) {
    try {
      const routePlan = await this.challengesService.updateRoutePlan(
        routePlanId,
        updateRoutePlanDto,
        bannerImage,
      );
      return routePlan;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
