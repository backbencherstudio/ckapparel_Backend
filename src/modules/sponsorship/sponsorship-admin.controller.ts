import {
  Controller,
  UseGuards,
  Get,
  Query,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SponsorshipService } from './sponsorship.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { AdminGetAllSponsorshipsQueryDto } from './dto/admin-get-all-sponsorships-query.dto';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { AdminSponsorshipHubQueryDto } from './dto/admin-sponsorship-hub-query.dto';
import { AdminUpdateSponsorshipStatusBodyDto } from './dto/admin-update-sponsorship-status-body.dto';

@ApiTags('Admin Sponsorship Management')
@ApiBearerAuth('admin_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/sponsorship')
export class SponsorshipController {
  constructor(private readonly sponsorshipService: SponsorshipService) {}

  @ApiOperation({
    summary: 'Get Sponsorship Hub summary cards',
    description:
      'Returns top card metrics: open listing, pending requests, fully completed, and total raised.',
  })
  @ApiOkResponse({ description: 'Sponsorship summary fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Get('hub/summary')
  async getHubSummary() {
    return this.sponsorshipService.adminGetSponsorshipHubSummary();
  }

  @ApiOperation({
    summary: 'Get pending review sponsorship list',
    description:
      'Returns pending sponsorship requests for admin review table with search, category and pagination.',
  })
  @ApiOkResponse({
    description: 'Pending sponsorship review list fetched successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Get('hub/pending-review')
  async getPendingReview(@Query() query: AdminSponsorshipHubQueryDto) {
    return this.sponsorshipService.adminGetPendingReview(query);
  }

  @ApiOperation({
    summary: 'Get active sponsorship listing',
    description:
      'Returns active sponsorship listing table data with status/category/search filters and pagination.',
  })
  @ApiOkResponse({
    description: 'Active sponsorship listings fetched successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Get('hub/active-listings')
  async getActiveListings(@Query() query: AdminSponsorshipHubQueryDto) {
    return this.sponsorshipService.adminGetActiveListings(query);
  }

  @ApiOperation({
    summary: 'Get single sponsorship hub details',
    description:
      'Returns complete sponsorship details for admin view drawer/modal including needs, creator and contributions.',
  })
  @ApiParam({
    name: 'id',
    description: 'Sponsorship id',
    required: true,
    example: 'cm9xyzabc0001sponsorship',
  })
  @ApiOkResponse({ description: 'Sponsorship details fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Get('hub/:id')
  async getHubDetails(@Param('id') sponsorshipId: string) {
    return this.sponsorshipService.adminGetSponsorshipHubDetails(sponsorshipId);
  }

  @ApiOperation({
    summary: 'Get All Sponsorships',
    description:
      'Generic admin sponsorship list endpoint with optional status/category/search and pagination.',
  })
  @ApiOkResponse({
    description: 'List of sponsorships retrieved successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Get()
  async adminGetAllSponsorships(
    @Query() query: AdminGetAllSponsorshipsQueryDto,
  ) {
    return this.sponsorshipService.adminGetAllSponsorships(query);
  }

  @ApiOperation({
    summary: 'Update sponsorship status',
    description: 'Allows an admin to update the status of a sponsorship.',
  })
  @ApiParam({
    name: 'id',
    description: 'Sponsorship id',
    required: true,
    example: 'cm9xyzabc0001sponsorship',
  })
  @ApiBody({ type: AdminUpdateSponsorshipStatusBodyDto })
  @ApiOkResponse({ description: 'Sponsorship status updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Patch(':id/status')
  async adminUpdateSponsorshipStatus(
    @Param('id') sponsorshipId: string,
    @Body() body: AdminUpdateSponsorshipStatusBodyDto,
  ) {
    return this.sponsorshipService.adminUpdateSponsorshipStatus(
      sponsorshipId,
      body.status,
    );
  }

  @ApiOperation({
    summary: 'Delete sponsorship',
    description: 'Deletes a sponsorship record from admin panel action table.',
  })
  @ApiParam({
    name: 'id',
    description: 'Sponsorship id',
    required: true,
    example: 'cm9xyzabc0001sponsorship',
  })
  @ApiOkResponse({ description: 'Sponsorship deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Delete(':id')
  async adminDeleteSponsorship(@Param('id') sponsorshipId: string) {
    return this.sponsorshipService.adminDeleteSponsorship(sponsorshipId);
  }
}
