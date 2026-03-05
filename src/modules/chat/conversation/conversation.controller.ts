import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';

@ApiBearerAuth()
@ApiTags('Conversation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @ApiOperation({
    summary: 'Create conversation',
    description:
      'Creates a conversation between two users. If conversation already exists, existing record is returned.',
  })
  @ApiOkResponse({
    description: 'Conversation created successfully or existing conversation returned.',
  })
  @ApiBadRequestResponse({ description: 'Invalid conversation payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Post()
  async create(@Body() createConversationDto: CreateConversationDto) {
    try {
      const conversation = await this.conversationService.create(
        createConversationDto,
      );
      return conversation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all conversations',
    description: 'Returns all conversations ordered by latest update.',
  })
  @ApiOkResponse({ description: 'Conversations fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Get()
  async findAll() {
    try {
      const conversations = await this.conversationService.findAll();
      return conversations;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get conversation by id',
    description: 'Returns a single conversation and participants by conversation id.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Conversation unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Conversation fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid conversation id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const conversation = await this.conversationService.findOne(id);
      return conversation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Deletes a conversation by id. Only ADMIN users are authorized.',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Conversation unique identifier.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'Conversation deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid conversation id.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiForbiddenResponse({ description: 'Only admin users can delete a conversation.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const conversation = await this.conversationService.remove(id);
      return conversation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
