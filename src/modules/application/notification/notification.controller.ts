import { Controller, Get, Patch, Param, UseGuards, Delete } from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    summary: 'Get current user notifications',
    description: 'Returns all notifications for the authenticated user in descending order.',
  })
  @ApiOkResponse({ description: 'Notifications fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Get()
  getAllNotifications(@GetUser() user) {
    return this.notificationService.getAllNotifications(user.userId);
  }

  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Marks all unread notifications of the authenticated user as read.',
  })
  @ApiOkResponse({ description: 'All notifications marked as read (or no unread notifications).' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Patch('read-all')
  markAllAsRead(@GetUser() user) {
    return this.notificationService.markAllAsRead(user.userId);
  }

  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a specific notification as read for the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Notification unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Notification marked as read successfully.' })
  @ApiBadRequestResponse({ description: 'Notification not found or unauthorized access.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Patch(':id/read')
  markAsRead(@GetUser() user, @Param('id') id: string) {
    return this.notificationService.markAsRead(user.userId, id);
  }

  @ApiOperation({
    summary: 'Mark notification as unread',
    description: 'Marks a specific notification as unread for the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Notification unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Notification marked as unread successfully.' })
  @ApiBadRequestResponse({ description: 'Notification not found or unauthorized access.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Patch(':id/unread')
  markAsUnread(@GetUser() user, @Param('id') id: string) {
    return this.notificationService.markAsUnread(user.userId, id);
  }

  @ApiOperation({
    summary: 'Delete notification',
    description: 'Deletes a specific notification belonging to the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Notification unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Notification deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Notification not found or unauthorized access.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Delete(':id/delete')
  deleteNotification(@GetUser() user, @Param('id') id: string) {
    return this.notificationService.deleteNotification(user.userId, id);
  }
}
