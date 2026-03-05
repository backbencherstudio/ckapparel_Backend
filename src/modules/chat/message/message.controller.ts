import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageGateway } from './message.gateway';
import { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Message')
@UseGuards(JwtAuthGuard)
@Controller('chat/message')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway,
  ) {}

  @ApiOperation({
    summary: 'Send message',
    description:
      'Sends a message to a conversation and broadcasts it over websocket to conversation room subscribers.',
  })
  @ApiOkResponse({ description: 'Message sent successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid conversation/receiver or payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Post()
  async create(
    @Req() req: Request,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    const user_id = req.user.userId;
    const message = await this.messageService.create(user_id, createMessageDto);
    if (message.success) {
      const messageData = {
        message: {
          id: message.data.id,
          message_id: message.data.id,
          body_text: message.data.message,
          from: message.data.sender_id,
          conversation_id: message.data.conversation_id,
          created_at: message.data.created_at,
        },
      };
      this.messageGateway.server
        .to(message.data.conversation_id)
        .emit('message', {
          from: message.data.sender_id,
          data: messageData,
        });
      return {
        success: message.success,
        message: message.message,
      };
    } else {
      return {
        success: message.success,
        message: message.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get conversation messages',
    description:
      'Returns message list for a conversation with optional cursor-based pagination.',
  })
  @ApiQuery({
    name: 'conversation_id',
    required: true,
    type: String,
    description: 'Target conversation id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of messages to fetch (default: 20).',
    example: 20,
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Message id cursor for pagination.',
    example: 'cm8q7i8mp0001xv57kgaf4n23',
  })
  @ApiOkResponse({ description: 'Messages fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Conversation id is missing/invalid.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Get()
  async findAll(
    @Req() req: Request,
    @Query()
    query: { conversation_id: string; limit?: number; cursor?: string },
  ) {
    const user_id = req.user.userId;
    const conversation_id = query.conversation_id as string;
    const limit = Number(query.limit);
    const cursor = query.cursor as string;
    try {
      const messages = await this.messageService.findAll({
        user_id,
        conversation_id,
        limit,
        cursor,
      });
      return messages;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
