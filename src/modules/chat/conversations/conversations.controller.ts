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
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConversationsService } from './conversations.service';
import { CreateDmDto } from './dto/create-dm.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';
import { MemberRole } from '@prisma/client';


@UseGuards(JwtAuthGuard)
@ApiTags('chat-conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Post('dm')
  @ApiOperation({ summary: 'Create or return a DM conversation' })
  @ApiBody({ type: CreateDmDto })
  @ApiOkResponse({ description: 'DM conversation created or existing conversation returned.' })
  createDm(@GetUser() user: any, @Body() dto: CreateDmDto) {
    return this.service.createDm(user.userId, dto.otherUserId);
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a group conversation' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Product Team' },
        memberIds: {
          oneOf: [
            {
              type: 'array',
              items: { type: 'string' },
              example: ['cmmlhoxaa0000v83s6kxio16b', 'cmmliufke0000v8xs48uyxj6p'],
            },
            {
              type: 'string',
              example: 'cmmlhoxaa0000v83s6kxio16b,cmmliufke0000v8xs48uyxj6p',
            },
            {
              type: 'string',
              example: '["cmmlhoxaa0000v83s6kxio16b","cmmliufke0000v8xs48uyxj6p"]',
            },
          ],
          description:
            'Member ids as an array, a comma-separated string, or a JSON array string in multipart form-data.',
        },
        avatar: { type: 'string', format: 'binary' },
      },
      required: ['title', 'memberIds'],
    },
  })
  @ApiOkResponse({ description: 'Group conversation created successfully.' })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
    }),
  )
  createGroup(
    @GetUser() user: any,
    @Body() dto: CreateGroupDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.service.createGroup(
      user.userId,
      dto.title,
      dto.memberIds,
      avatar,
    );
  }

  @Get('group-conversations')
  @ApiOperation({ summary: 'List group conversations for current user' })
  @ApiOkResponse({ description: 'Group conversations fetched successfully.' })
  listGroupConversations(@GetUser() user: any) {
    return this.service.listGroupConversations(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List my conversations' })
  @ApiQuery({ name: 'take', required: false, description: 'Page size', example: '20' })
  @ApiQuery({ name: 'skip', required: false, description: 'Records to skip', example: '0' })
  @ApiOkResponse({ description: 'Conversations fetched successfully.' })
  listMine(
    @GetUser() user: any,
    @Query('take') take = '20',
    @Query('skip') skip = '0',
  ) {
    return this.service.myConversations(
      user.userId,
      Number(take),
      Number(skip),
    );
  }

  // unread for one conversation
  @Get(':id/unread')
  @ApiOperation({ summary: 'Get unread count for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation id', example: 'cmmlk8qn20002v8xsglb2csrh' })
  @ApiOkResponse({ description: 'Unread count fetched successfully.' })
  unread(@Param('id') id: string, @GetUser() user: any) {
    return this.service.unreadFor(id, user.userId);
  }

  // mark read up to now or specific timestamp
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation id', example: 'cmmlk8qn20002v8xsglb2csrh' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        at: { type: 'string', format: 'date-time', example: '2026-03-11T04:50:24.905Z' },
        messageCreatedAt: { type: 'string', format: 'date-time', example: '2026-03-11T04:50:24.905Z' },
      },
    },
  })
  @ApiOkResponse({ description: 'Conversation read marker updated.' })
  markRead(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() body: { at?: string; messageCreatedAt?: string },
  ) {
    const at = body?.at
      ? new Date(body.at)
      : body?.messageCreatedAt
        ? new Date(body.messageCreatedAt)
        : undefined;
    return this.service.markRead(id, user.userId, at);
  }

  // --- member management ---
  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to a group conversation (admin only)' })
  @ApiParam({ name: 'id', description: 'Conversation id', example: 'cmmlk8qn20002v8xsglb2csrh' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        memberIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['cmmlhoxaa0000v83s6kxio16b', 'cmmliufke0000v8xs48uyxj6p'],
        },
      },
      required: ['memberIds'],
    },
  })
  @ApiOkResponse({ description: 'Members added successfully.' })
  addMembers(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() body: { memberIds: string[] },
  ) {
    return this.service.addMembers(id, user.userId, body.memberIds || []);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get group members' })
  @ApiParam({ name: 'id', description: 'Conversation id', example: 'cmmlk8qn20002v8xsglb2csrh' })
  @ApiOkResponse({ description: 'Group members fetched successfully.' })
  getMembers(@Param('id') id: string, @GetUser() user: any) {
    return this.service.getGroupMembers(id, user.userId);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Set role for a group member (admin only)' })
  @ApiParam({ name: 'id', description: 'Conversation id', example: 'cmmlk8qn20002v8xsglb2csrh' })
  @ApiParam({ name: 'userId', description: 'Target user id', example: 'cmmliufke0000v8xs48uyxj6p' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['MEMBER', 'ADMIN'], example: 'ADMIN' },
      },
      required: ['role'],
    },
  })
  @ApiOkResponse({ description: 'Member role updated successfully.' })
  setRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @GetUser() user: any,
    @Body() body: { role: MemberRole },
  ) {
    return this.service.setRole(id, user.userId, targetUserId, body.role);
  }

  @Post(':id/members/:userId/remove')
  @ApiOperation({ summary: 'Remove member from group (admin only)' })
  @ApiParam({ name: 'id', description: 'Conversation id', example: 'cmmlk8qn20002v8xsglb2csrh' })
  @ApiParam({ name: 'userId', description: 'Target user id', example: 'cmmliufke0000v8xs48uyxj6p' })
  @ApiOkResponse({ description: 'Member removed successfully.' })
  remove(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @GetUser() user: any,
  ) {
    return this.service.removeMember(id, user.userId, targetUserId);
  }

  //------ clear conversation for me----
  @Patch(':id/clear')
  @ApiOperation({ summary: 'Clear conversation history for current user only' })
  @ApiParam({ name: 'id', description: 'Conversation id', example: 'cmmlk8qn20002v8xsglb2csrh' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        upTo: { type: 'string', format: 'date-time', example: '2026-03-11T07:17:31.311Z' },
      },
    },
  })
  @ApiOkResponse({ description: 'Conversation cleared for current user.' })
  clearForMe(
    @Param('id') id,
    @GetUser() user: any,
    @Body() body?: { upTo?: string },
  ) {
    const upTo = body?.upTo ? new Date(body.upTo) : undefined;
    return this.service.clearForUser(id, user.userId, upTo);
  }
}
