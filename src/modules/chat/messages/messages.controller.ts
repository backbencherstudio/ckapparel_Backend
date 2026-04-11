import type { Express } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExcludeEndpoint,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MessageKind } from '@prisma/client';
import { MessagesService } from './messages.service';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';
import { SendMessageDto } from '../conversations/dto/send-message.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { CursorPaginationDto } from './dto/pagination.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

const MAX_MEDIA_SIZE = 20 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'video/mp4',
  'audio/mpeg',
  'application/pdf',
  'text/plain',
];

function mediaFilter(_: any, file: Express.Multer.File, cb: any) {
  if (ALLOWED_MEDIA_TYPES.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(
    new BadRequestException(
      `Unsupported media type: ${file.mimetype}. Allowed types: ${ALLOWED_MEDIA_TYPES.join(', ')}`,
    ),
    false,
  );
}

@UseGuards(JwtAuthGuard)
@ApiTags('chat-messages')
@ApiBearerAuth('user_token')
@ApiBearerAuth('admin_token')
@Controller()
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'List messages in a conversation (cursor pagination)',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation id',
    example: 'cmmlk8qn20002v8xsglb2csrh',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor message id',
    example: 'cmmlpi7n2000bv8zocsggy7ze',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Page size',
    example: 20,
  })
  @ApiOkResponse({ description: 'Messages fetched successfully.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  list(
    @Param('id') conversationId: string,
    @GetUser() user: any,
    @Query() query: CursorPaginationDto,
  ) {
    return this.service.list(
      conversationId,
      user.userId,
      query.cursor,
      query.take,
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Send a plain text message in a conversation',
    description:
      'Production flow: use this endpoint for messages in a conversation. ' +
      'For pure realtime text-only messages, use websocket event "message:send" on namespace "/ws". ' +
      'This endpoint creates and stores the message in DB and now also emits realtime "message:new" to the conversation room.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation id',
    example: 'cmmlk8qn20002v8xsglb2csrh',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          example: 'Hello team',
        },
      },
      required: ['text'],
    },
  })
  @ApiOkResponse({
    description: 'Text message sent successfully.',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  sendTextMessage(
    @Param('id') conversationId: string,
    @GetUser() user: any,
    @Body() body: { text: string },
  ) {
    if (!body?.text || !String(body.text).trim()) {
      throw new BadRequestException('text is required');
    }

    return this.service.sendMessage(
      conversationId,
      user.userId,
      MessageKind.TEXT,
      { text: String(body.text).trim() },
    );
  }

  // /messages/search?q=hello&conversationId=...&take=20&skip=0
  @Get('messages/search')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Search messages by keyword' })
  @ApiOkResponse({ description: 'Search results fetched successfully.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@GetUser() user: any, @Query() dto: SearchMessagesDto) {
    return this.service.search(
      user.userId,
      dto.q,
      dto.conversationId,
      dto.take,
      dto.skip,
    );
  }

  @Post('conversations/:id/messages/upload')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Upload media and send message',
    description:
      'Production flow: use this endpoint for media/file messages in a conversation. ' +
      'For pure realtime text-only messages, use websocket event "message:send" on namespace "/ws". ' +
      'This endpoint creates and stores the message in DB and now also emits realtime "message:new" to the conversation room.',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation id',
    example: 'cmmlk8qn20002v8xsglb2csrh',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        media: { type: 'string', format: 'binary' },
        kind: {
          type: 'string',
          enum: ['IMAGE', 'VIDEO', 'FILE', 'AUDIO'],
          example: 'FILE',
        },
        content: {
          oneOf: [
            {
              type: 'string',
              example:
                '{"text":"caption","fileName":"doc.pdf","mime":"application/pdf"}',
            },
            { type: 'object', additionalProperties: true },
          ],
        },
        media_Url: {
          type: 'string',
          description:
            'Optional pre-uploaded media URL. If media file is provided, uploaded file URL is used.',
          example: 'https://cdn.example.com/file.pdf',
        },
      },
      required: ['media'],
    },
  })
  @ApiOkResponse({
    description: 'Message uploaded and stored successfully.',
    schema: {
      example: {
        id: 'cmn123abc456',
        kind: 'FILE',
        content: { text: 'Proposal attached', fileName: 'proposal.pdf' },
        createdAt: '2026-03-12T12:00:00.000Z',
        senderId: 'cmmmysivw0000v8fgdk4animh',
        conversationId: 'cmmlk8qn20002v8xsglb2csrh',
        media_Url: 'http://localhost:9000/sazed/attachment/abc_proposal.pdf',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid payload, invalid content JSON, missing required fields, or unsupported media type.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized token or user not authenticated.',
  })
  @UseInterceptors(
    FileInterceptor('media', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_MEDIA_SIZE },
      fileFilter: mediaFilter,
    }),
  )
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async uploadAndSend(
    @Param('id') conversationId: string,
    @GetUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SendMessageDto,
  ) {
    // Accept empty string or '{}' for content
    if (typeof dto.content === 'string') {
      if (dto.content === '' || dto.content === '{}') {
        dto.content = {};
      } else {
        try {
          dto.content = JSON.parse(dto.content);
        } catch {
          throw new BadRequestException('content must be a valid JSON object');
        }
      }
    }
    const message = await this.service.sendMessage(
      conversationId,
      user.userId,
      dto.kind,
      dto.content,
      file,
      dto.media_Url,
    );

    this.realtimeGateway.emitMessageNew(conversationId, message, user.userId);

    return message;
  }

  @Delete('messages/:messageId')
  @ApiOperation({
    summary: 'Delete a message for current user permissions scope',
    description:
      'Deletes a message by id. User can only delete messages they have permission to delete (e.g. their own messages, or any messages if they are admin).',
  })
  @ApiParam({
    name: 'messageId',
    description: 'Message id',
    example: 'cmmlpi7n2000bv8zocsggy7ze',
  })
  @ApiOkResponse({ description: 'Message deleted successfully.' })
  remove(@Param('messageId') messageId: string, @GetUser() user: any) {
    return this.service.deleteMessage(messageId, user.userId);
  }

  @ApiExcludeEndpoint()
  @Post('messages/:messageId/report')
  @ApiOperation({ summary: 'Report a message' })
  @ApiParam({
    name: 'messageId',
    description: 'Message id',
    example: 'cmmlpi7n2000bv8zocsggy7ze',
  })
  @ApiBody({ type: ReportMessageDto })
  @ApiOkResponse({ description: 'Message report submitted successfully.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  report(
    @Param('messageId') messageId: string,
    @GetUser() user: any,
    @Body() body: ReportMessageDto,
  ) {
    return this.service.reportMessage(
      messageId,
      user?.userId,
      body?.reason || 'Reported by user',
    );
  }

  // --- media & files ---
  @Get('conversations/:id/media')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'List image/video/audio messages in a conversation',
  })
  @ApiParam({
    name: 'id',
    description: 'Conversation id',
    example: 'cmmlk8qn20002v8xsglb2csrh',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor message id',
    example: 'cmmlpi7n2000bv8zocsggy7ze',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Page size',
    example: 20,
  })
  @ApiOkResponse({ description: 'Media messages fetched successfully.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  listMedia(
    @Param('id') conversationId: string,
    @GetUser() user: any,
    @Query() query: CursorPaginationDto,
  ) {
    return this.service.listMedia(
      conversationId,
      user.userId,
      query.cursor,
      query.take,
    );
  }

  @Get('conversations/:id/files')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'List file messages in a conversation' })
  @ApiParam({
    name: 'id',
    description: 'Conversation id',
    example: 'cmmlk8qn20002v8xsglb2csrh',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Cursor message id',
    example: 'cmmlpi7n2000bv8zocsggy7ze',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Page size',
    example: 20,
  })
  @ApiOkResponse({ description: 'File messages fetched successfully.' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  listFiles(
    @Param('id') conversationId: string,
    @GetUser() user: any,
    @Query() query: CursorPaginationDto,
  ) {
    return this.service.listFiles(
      conversationId,
      user.userId,
      query.cursor,
      query.take,
    );
  }

  @ApiOperation({
    summary: 'Block group conversation messaging (admin only)',
    description:
      'Admin-only action for GROUP conversations. This blocks messaging for all current participants. ' +
      'After blocking, message sending is denied for both HTTP APIs and websocket realtime sends.',
  })
  @Post('conversations/:id/block')
  @ApiParam({
    name: 'id',
    description: 'Conversation id',
    example: 'cmmlk8qn20002v8xsglb2csrh',
  })
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({
    description: 'Conversation messaging blocked for all participants.',
    schema: {
      example: {
        ok: true,
        conversationId: 'cmmlk8qn20002v8xsglb2csrh',
        blockedBy: 'cmmmysivw0000v8fgdk4animh',
        blockedAt: '2026-04-04T10:30:00.000Z',
        participantsAffected: 14,
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Admin only or requester is not a member of this conversation.',
  })
  @ApiBadRequestResponse({
    description: 'Only group conversations can be blocked.',
  })
  @ApiNotFoundResponse({ description: 'Conversation not found.' })
  blockConversation(@Param('id') conversationId: string, @GetUser() user: any) {
    return this.service.blockConversation(conversationId, user.userId);
  }
}
