import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupportPlanService } from './support-plan.service';
import { CreateSupportPlanDto } from './dto/create-support-plan.dto';
import { UpdateSupportPlanDto } from './dto/update-support-plan.dto';
import { UpdateSupportPlanStatusDto } from './dto/update-support-plan-status.dto';
import { SupportPlanCardsQueryDto } from './dto/support-plan-cards-query.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@ApiBearerAuth('admin_token')
@ApiTags('Admin Support Plan Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/support-plan')
export class SupportPlanController {
  constructor(private readonly supportPlanService: SupportPlanService) {}

  @ApiOperation({
    summary: 'Get plan types',
    description: 'Fetch all plan types seeded in database for dropdown usage.',
  })
  @ApiOkResponse({ description: 'Plan types fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('plan-types')
  async getPlanTypes() {
    try {
      return await this.supportPlanService.getPlanTypes();
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get admin dashboard cards',
    description:
      'Returns summary counters for Admin Support Plans screen: total support plans, active plans, total challenges, and active challenges with weekly change values.',
  })
  @ApiOkResponse({
    description: 'Admin dashboard cards fetched successfully.',
    schema: {
      example: {
        success: true,
        message: 'Support plan dashboard cards fetched successfully',
        data: {
          totalSupportPlans: { value: 38, weeklyChange: 6 },
          activePlans: { value: 2, weeklyChange: 2 },
          totalChallenges: { value: 12, weeklyChange: 2 },
          activeChallenges: { value: 19, weeklyChange: 8 },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('dashboard-cards')
  async getAdminDashboardCards() {
    try {
      return await this.supportPlanService.getAdminDashboardCards();
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get admin support plan card list',
    description:
      'Returns card-ready support plan data for admin UI, including status, upload date, resource metadata, route availability, and plan type details.',
  })
  @ApiQuery({
    name: 'planTypeId',
    required: false,
    description: 'Filter by plan type ID',
    example: '1',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'HIIT'],
    description: 'Filter by plan category',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (1 = active, 0 = inactive)',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Support plan cards fetched successfully.',
    schema: {
      example: {
        success: true,
        message: 'Support plan cards fetched successfully',
        data: [
          {
            id: 'cmx...',
            title: 'Marathon (42km)',
            planType: { id: '1', name: 'Nutrition Plans' },
            status: { value: 1, isActive: true },
            uploadDate: '2026-04-01T10:22:33.000Z',
            category: 'RUNNING',
            resource: {
              url: 'https://example.com/storage/support-plans/marathon.pdf',
              name: 'marathon.pdf',
              type: 'pdf',
            },
            route: { url: null, isAvailable: false },
            download: { downloadedUsers: 0, totalUsers: 0, label: '0/0 users' },
          },
        ],
        meta: {
          total: 1,
          filters: { planTypeId: '1', category: 'RUNNING', status: 1 },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('cards')
  async getAdminSupportPlanCards(@Query() query: SupportPlanCardsQueryDto) {
    try {
      return await this.supportPlanService.getAdminSupportPlanCards(query);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Create support plan',
    description:
      'Creates a new support plan. planTypeId must come from GET /admin/support-plan/plan-types. Resource file (PDF/Document) is optional. Update the UI input filed based on the Plantype selected. For example, if the plan type is a running plan, show distance input; if it is a training plan, show training difficulty dropdown, etc.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['planTypeId', 'category', 'title'],
      properties: {
        planTypeId: {
          type: 'string',
          example: '1',
          description: 'Plan type ID from /admin/support-plan/plan-types',
        },
        category: {
          type: 'string',
          enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'HIIT'],
          example: 'RUNNING',
          description: 'Plan category from Prisma schema',
        },
        title: {
          type: 'string',
          example: '5km Ultra Running',
          description: 'Support plan title',
        },
        description: {
          type: 'string',
          example:
            'A comprehensive 12-week training plan for 5km ultra running.',
          description: 'Optional plan description',
        },
        distance: {
          type: 'number',
          example: 5000,
          description: 'Distance in meters',
        },
        resource_url: {
          type: 'string',
          format: 'binary',
          description: 'PDF or document file for resource material (optional)',
        },
        route_url: {
          type: 'string',
          example: 'https://example.com/route',
          description: 'Route URL (optional)',
        },
        trainingPlansCategory: {
          type: 'string',
          enum: ['Beginner', 'Intermediate', 'Advanced'],
          example: 'Beginner',
          description: 'Training difficulty level (optional)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Support plan created successfully.' })
  @ApiBadRequestResponse({
    description:
      'Invalid payload. Accepted file types: PDF, DOC, DOCX, TXT. Max size: 10MB. Category must be one of: RUNNING, CYCLING, SWIMMING, HIIT. TrainingPlansCategory must be one of: Beginner, Intermediate, Advanced.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @UseInterceptors(
    FileInterceptor('resource_url', {
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PDF, DOC, DOCX, and TXT files are allowed',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @Post()
  async createSupportPlan(
    @Body() createSupportPlanDto: CreateSupportPlanDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      const supportPlan = await this.supportPlanService.createSupportPlan(
        createSupportPlanDto,
        file,
      );
      return supportPlan;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update support plan',
    description:
      'Update an existing support plan with the same fields as create. You can upload a new resource file (PDF/DOC/DOCX/TXT).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        planTypeId: {
          type: 'string',
          example: '1',
          description: 'Plan type ID from /admin/support-plan/plan-types',
        },
        category: {
          type: 'string',
          enum: ['RUNNING', 'CYCLING', 'SWIMMING', 'HIIT'],
          example: 'RUNNING',
          description: 'Plan category from Prisma schema',
        },
        title: {
          type: 'string',
          example: 'Updated 10km Plan',
          description: 'Support plan title',
        },
        description: {
          type: 'string',
          example: 'Updated description for support plan.',
          description: 'Optional plan description',
        },
        distance: {
          type: 'number',
          example: 10000,
          description: 'Distance in meters',
        },
        resource_url: {
          type: 'string',
          format: 'binary',
          description: 'PDF or document file for resource material (optional)',
        },
        route_url: {
          type: 'string',
          example: 'https://example.com/updated-route',
          description: 'Route URL (optional)',
        },
        trainingPlansCategory: {
          type: 'string',
          enum: ['Beginner', 'Intermediate', 'Advanced'],
          example: 'Intermediate',
          description: 'Training difficulty level (optional)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Support plan updated successfully.' })
  @ApiBadRequestResponse({
    description:
      'Invalid payload or support plan ID. Accepted file types: PDF, DOC, DOCX, TXT. Max size: 10MB.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @UseInterceptors(
    FileInterceptor('resource_url', {
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Only PDF, DOC, DOCX, and TXT files are allowed',
            ),
            false,
          );
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @Patch(':id')
  async updateSupportPlan(
    @Param('id') id: string,
    @Body() updateSupportPlanDto: UpdateSupportPlanDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      return await this.supportPlanService.updateSupportPlan(
        id,
        updateSupportPlanDto,
        file,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Update support plan status',
    description: 'Toggle support plan status (1 = active, 0 = inactive).',
  })
  @ApiBody({ type: UpdateSupportPlanStatusDto })
  @ApiOkResponse({ description: 'Support plan status updated successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid status or support plan ID.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch(':id/status')
  async updateSupportPlanStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSupportPlanStatusDto,
  ) {
    try {
      return await this.supportPlanService.updateSupportPlanStatus(id, dto.status);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Delete support plan',
    description: 'Delete a support plan by ID.',
  })
  @ApiOkResponse({ description: 'Support plan deleted successfully.' })
  @ApiBadRequestResponse({
    description: 'Invalid support plan ID.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Delete(':id')
  async deleteSupportPlan(@Param('id') id: string) {
    try {
      return await this.supportPlanService.deleteSupportPlan(id);
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }



  

}
