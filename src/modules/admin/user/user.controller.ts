import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserAdminDto } from './dto/create-user.dto';
import { UpdateUserAdminDto } from './dto/update-user.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth('admin_token')
@ApiTags('Admin User Management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Get all users',
    description: 'Returns users with optional search/type/approval filtering.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search text.',
    example: 'john',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'User country filter.',
    example: 'US',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'User status filter.',
    example: 1,
  })
  @ApiOkResponse({ description: 'Users fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get()
  async findAll(
    @Query() query: { q?: string; country?: string; status?: number },
  ) {
    try {
      const q = query.q;
      const country = query.country;
      const status = query.status;

      const users = await this.userService.findAll({ q, country, status });
      return users;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get user by id',
    description: 'Returns details of one user by id.',
  })
  @ApiParam({
    name: 'id',
    description: 'User id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'User fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const user = await this.userService.findOne(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Ban or unban a user',
    description: 'Bans or unbans an existing user by id.',
  })
  @ApiParam({
    name: 'id',
    description: 'User id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiBody({
    schema: { properties: { status: { type: 'number', example: 0 } } },
  })
  @ApiOkResponse({ description: 'User banned or unbanned successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch('ban-unban/:id')
  async banUnbanUser(@Param('id') id: string, @Body('status') status: number) {
    try {
      const user = await this.userService.banUnbanUser(id, status);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Delete user',
    description: 'Deletes a user by id.',
  })
  @ApiParam({
    name: 'id',
    description: 'User id.',
    example: 'cm8q1n1f50000kq3g7d9h2zab',
  })
  @ApiOkResponse({ description: 'User deleted successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const user = await this.userService.remove(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
