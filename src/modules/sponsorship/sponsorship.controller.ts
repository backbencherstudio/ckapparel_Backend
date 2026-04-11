import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { SponsorshipService } from './sponsorship.service';
import { CreateSponsorshipDto } from './dto/create-sponsorship.dto';
import { AdminGetAllSponsorshipsQueryDto } from './dto/admin-get-all-sponsorships-query.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UpdateSponsorshipDto } from './dto/update-sponsorship.dto';
import { ChallengeCategory, NeedCategory } from '@prisma/client';
import { AddSponsorDto } from './dto/add-sponsor.dto';

@ApiTags('Sponsorship')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard)
@Controller('sponsorship')
export class SponsorshipController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  @ApiOperation({
    summary: 'Create a new sponsorship',
    description:
      'Allows an authenticated user to create a new sponsorship with specified needs.',
  })
  @ApiBody({ type: CreateSponsorshipDto })
  @ApiOkResponse({ description: 'Sponsorship created successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post()
  createSponsorship(
    @Body() createSponsorshipDto: CreateSponsorshipDto,
    @GetUser('userId') userId: string,
  ) {
    return this.sponsorshipService.createSponsorship(
      createSponsorshipDto,
      userId,
    );
  }

  @ApiOperation({
    summary: 'Get All OPEN Sponsorships',
    description:
      'Returns a list of all sponsorships with status OPEN, including their needs and creator information.',
  })
  @ApiOkResponse({
    description: 'List of open sponsorships retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('open')
  getOpenSponsorships() {
    return this.sponsorshipService.getOpenSponsorships();
  }

  @ApiOperation({
    summary: 'Get My Sponsorships',
    description:
      'Returns a paginated list of sponsorships created by the authenticated user, including their needs and creator information. Supports filtering by status.',
  })
  @ApiOkResponse({
    description: "List of user's sponsorships retrieved successfully.",
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('mine')
  getMySponsorships(
    @GetUser('userId') userId: string,
    @Query() query: AdminGetAllSponsorshipsQueryDto,
  ) {
    return this.sponsorshipService.getSponsorshipsByUser(userId, query);
  }

  @ApiOperation({
    summary: 'Update Sponsorship details and needs.',
    description:
      'Allows an authenticated user to update there own sponsorship details and needs.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'sponsorship-123',
          description: 'Sponsorship Id',
        },
        title: {
          type: 'string',
          example: 'Sponsorship for Marathon Training',
          description: 'Title of the sponsorship.',
        },
        description: {
          type: 'string',
          example: 'Looking for support to fund my marathon training.',
          description: 'Detailed description of the sponsorship.',
        },
        fundingGoal: {
          type: 'number',
          example: 1000,
          description: 'Funding goal of the sponsorship (e.g., 1000).',
        },
        category: {
          type: 'string',
          example: ChallengeCategory.RUNNING,
          enum: Object.values(ChallengeCategory),
          description: 'Category of the sponsorship.',
        },

        sponsorship_Needs: {
          type: 'array',
          description: 'List of needs associated with the sponsorship.',
          items: {
            type: 'object',
            properties: {
              need_category: {
                type: 'string',
                example: NeedCategory.FOOTWEAR,
                enum: Object.values(NeedCategory),
                description: 'Category of the need.',
              },
              need_description: {
                type: 'string',
                example: 'Need a new pair of running shoes.',
                description: 'Detailed description of the need.',
              },
            },
          },
        },
      },
    },

    // type: UpdateSponsorshipDto,
  })
  @ApiOkResponse({ description: 'Sponsorship updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch('update')
  updateSponsorship(
    @Body() updateSponsorshipDto: UpdateSponsorshipDto,
    @GetUser('userId') userId: string,
  ) {
    return this.sponsorshipService.updateSponsorship(
      updateSponsorshipDto,
      userId,
    );
  }

  @ApiOperation({
    summary: 'Add sponsor to my own sponsorship',
    description:
      'Allows an authenticated user to add a sponsor to their own sponsorship.',
  })
  @ApiBody({ type: AddSponsorDto })
  @ApiOkResponse({ description: 'Sponsor added to sponsorship successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post('add-sponsor')
  addSponsorToSponsorship(
    @GetUser('userId') userId: string,
    @Body() addSponsorDto: AddSponsorDto,
  ) {
    return this.sponsorshipService.addSponsorToSponsorship(
      addSponsorDto,
      userId,
    );
  }

  @ApiOperation({
    summary: 'Get sponsorship details by id',
    description:
      'Returns detailed information about a specific sponsorship, including its needs and creator and sponsor information.',
  })
  @ApiOkResponse({ description: 'Sponsorship details retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get(':sponsorshipId')
  getSponsorshipById(
    @GetUser('userId') userId: string,
    @Param('sponsorshipId') sponsorshipId: string,
  ) {
    return this.sponsorshipService.getSponsorshipById(sponsorshipId, userId);
  }
}
