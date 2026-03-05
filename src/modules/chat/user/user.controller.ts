import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('User')
@Controller('chat/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Get chat user list',
    description:
      'Returns active users available for chat list view with basic profile fields.',
  })
  @ApiOkResponse({
    description: 'User list fetched successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cm8q1n1f50000kq3g7d9h2zab' },
              email: { type: 'string', example: 'john.doe@example.com' },
              name: { type: 'string', example: 'John Doe' },
              type: { type: 'string', example: 'coach' },
            },
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error while fetching chat users.',
  })
  @Get()
  async findAll() {
    try {
      const users = await this.userService.findAll();
      return users;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
