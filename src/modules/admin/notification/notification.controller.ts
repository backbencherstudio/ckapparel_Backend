import { Controller, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';

@ApiBearerAuth('admin_token')
@ApiTags('Admin Notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN || Role.SUPER_ADMIN)
@Controller('admin/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    summary: 'Get all admin notifications',
    description: 'Returns notifications for the currently authenticated admin user.',
  })
  @ApiOkResponse({ description: 'Notifications fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Get()
  async findAll(@GetUser('userId') userId: string) {
    return this.notificationService.findAll(userId);
  }

  @ApiOperation({
    summary: 'Delete notification',
    description: 'Deletes a notification by id for current admin user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification id.',
    required: true,
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Notification deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid notification id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Delete(':id')
  async remove(@GetUser('userId') userId: string, @Param('id') id: string) {
    return this.notificationService.remove(id, userId);
  }

  @ApiOperation({
    summary: 'Delete all notifications',
    description: 'Deletes all notifications for current admin user.',
  })
  @ApiOkResponse({ description: 'All notifications deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Delete()
  async removeAll(@GetUser('userId') userId: string) {
    return this.notificationService.removeAll(userId);
  }
}
