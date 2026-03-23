import {
  Controller,
  Param,
  Post,
  Delete,
  UseGuards,
  Query,
  Get,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@ApiTags('chat-users')
@ApiBearerAuth('user_token')
@ApiBearerAuth('admin_token')
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('suggest')
  @ApiOperation({ summary: 'Suggest users for chat and member picker' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query',
    example: 'anik',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Maximum users to return',
    example: '10',
  })
  @ApiOkResponse({ description: 'User suggestions fetched successfully.' })
  async suggest(
    @GetUser() me: any,
    @Query('q') q: string,
    @Query('take') take = '10',
  ) {
    const takeNumber = Number(take) || 10;

    return this.users.suggestUsers(me.userId, q, takeNumber);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block a user for DM messaging' })
  @ApiParam({
    name: 'id',
    description: 'Target user id',
    example: 'cmmliufke0000v8xs48uyxj6p',
  })
  @ApiOkResponse({ description: 'User blocked successfully.' })
  block(@GetUser() me: any, @Param('id') id: string) {
    return this.users.block(me.userId, id);
  }

  @Delete(':id/block')
  @ApiOperation({ summary: 'Unblock a previously blocked user' })
  @ApiParam({
    name: 'id',
    description: 'Target user id',
    example: 'cmmliufke0000v8xs48uyxj6p',
  })
  @ApiOkResponse({ description: 'User unblocked successfully.' })
  unblock(@GetUser() me: any, @Param('id') id: string) {
    return this.users.unblock(me.userId, id);
  }
}
