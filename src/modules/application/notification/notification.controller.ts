import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Delete,
  Body,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@ApiTags('User Notifications')
@ApiBearerAuth('user_token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiBearerAuth('admin_token')
  @ApiTags('Admin Notifications')
  @ApiOperation({
    summary: 'Get current user notification settings',
    description:
      'Returns on/off preferences for push notifications, sponsorship alerts, and chat notifications.',
  })
  @ApiOkResponse({ description: 'Notification settings fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden request.' })
  @Get('settings')
  getNotificationSettings(@GetUser('userId') userId: string) {
    return this.notificationService.getNotificationSettings(userId);
  }

  @ApiBearerAuth('admin_token')
  @ApiTags('Admin Notifications')
  @ApiOperation({
    summary: 'Update current user notification settings',
    description:
      'Updates one or more notification preferences. Omitted fields remain unchanged.',
  })
  @ApiBody({ type: UpdateNotificationSettingsDto })
  @ApiOkResponse({ description: 'Notification settings updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid settings payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden request.' })
  @Patch('settings')
  updateNotificationSettings(
    @GetUser('userId') userId: string,
    @Body() body: UpdateNotificationSettingsDto,
  ) {
    return this.notificationService.updateNotificationSettings(userId, body);
  }

  @ApiOperation({
    summary: 'Get current user notifications',
    description:
      'Returns all notifications for the authenticated user in descending order.',
  })
  @ApiOkResponse({ description: 'Notifications fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden request.' })
  @Get()
  getAllNotifications(@GetUser('userId') userId: string) {
    return this.notificationService.getAllNotifications(userId);
  }

  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Marks all unread notifications of the authenticated user as read.',
  })
  @ApiOkResponse({
    description:
      'All notifications marked as read (or no unread notifications).',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden request.' })
  @Patch('read-all')
  markAllAsRead(@GetUser('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @ApiOperation({
    summary: 'Mark notification as read',
    description:
      'Marks a specific notification as read for the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Notification unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Notification marked as read successfully.' })
  @ApiBadRequestResponse({
    description: 'Notification not found or unauthorized access.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden request.' })
  @Patch(':id/read')
  markAsRead(@GetUser('userId') userId: string, @Param('id') id: string) {
    return this.notificationService.markAsRead(userId, id);
  }

  @ApiOperation({
    summary: 'Mark notification as unread',
    description:
      'Marks a specific notification as unread for the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Notification unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Notification marked as unread successfully.' })
  @ApiBadRequestResponse({
    description: 'Notification not found or unauthorized access.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden request.' })
  @Patch(':id/unread')
  markAsUnread(@GetUser('userId') userId: string, @Param('id') id: string) {
    return this.notificationService.markAsUnread(userId, id);
  }

  @ApiOperation({
    summary: 'Delete notification',
    description:
      'Deletes a specific notification belonging to the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Notification unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Notification deleted successfully.' })
  @ApiBadRequestResponse({
    description: 'Notification not found or unauthorized access.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden request.' })
  @Delete(':id')
  deleteNotification(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationService.deleteNotification(userId, id);
  }
}
