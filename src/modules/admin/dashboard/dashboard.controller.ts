import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardAthletesTrendQueryDto } from './dto/dashboard-athletes-trend-query.dto';

@ApiBearerAuth('admin_token')
@ApiTags('Admin Dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN || Role.SUPER_ADMIN)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  //   @ApiOperation({
  //     summary: 'Get complete dashboard overview',
  //     description:
  //       'Returns all data needed for admin dashboard screen: top cards, registered vs active athletes trend, and challenge participants donut breakdown.',
  //   })
  //   @ApiQuery({
  //     name: 'months',
  //     required: false,
  //     description: 'Trend window in months (3 to 12). Default is 6.',
  //     example: 6,
  //   })
  //   @ApiOkResponse({ description: 'Dashboard overview fetched successfully.' })
  //   @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  //   @Get('overview')
  //   async getOverview(@Query() query: DashboardAthletesTrendQueryDto) {
  //     try {
  //       return await this.dashboardService.getDashboardOverview(query.months);
  //     } catch (error) {
  //       return {
  //         success: false,
  //         message: error.message,
  //       };
  //     }
  //   }

  @ApiOperation({
    summary: 'Get top summary cards',
    description:
      'Returns card metrics for admin dashboard: total athletes, active challenges, open sponsorships, and quotation requests with weekly changes.',
  })
  @ApiOkResponse({ description: 'Dashboard cards fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('cards')
  async getCards() {
    try {
      return await this.dashboardService.getSummaryCards();
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get registered vs active athletes trend',
    description:
      'Returns monthly trend for registered athletes and active athletes for chart rendering.',
  })
  @ApiQuery({
    name: 'months',
    required: false,
    description: 'Trend window in months (3 to 12). Default is 6.',
    example: 6,
  })
  @ApiOkResponse({ description: 'Athletes trend fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('athletes-trend')
  async getAthletesTrend(@Query() query: DashboardAthletesTrendQueryDto) {
    try {
      return await this.dashboardService.getRegisteredVsActiveAthletes(
        query.months,
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get challenge participants donut breakdown',
    description:
      'Returns total challenge participants and percentage split by challenge path (Monthly, Virtual, Community, Elite).',
  })
  @ApiOkResponse({
    description: 'Challenge participants breakdown fetched successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get('challenge-participants')
  async getChallengeParticipants() {
    try {
      return await this.dashboardService.getChallengeParticipantsBreakdown();
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
