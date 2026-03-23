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
    summary: 'Create admin-managed user',
    description: 'Creates a user from admin panel.',
  })
  @ApiBody({ type: CreateUserAdminDto })
  @ApiOkResponse({ description: 'User created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post()
  async create(@Body() createUserAdminDto: CreateUserAdminDto) {
    try {
      const user = await this.userService.create(createUserAdminDto);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get all users',
    description: 'Returns users with optional search/type/approval filtering.',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search text.', example: 'john' })
  @ApiQuery({ name: 'type', required: false, description: 'User type filter.', example: 'coach' })
  @ApiQuery({ name: 'approved', required: false, description: 'Approval status filter.', example: '1' })
  @ApiOkResponse({ description: 'Users fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Get()
  async findAll(
    @Query() query: { q?: string; type?: string; approved?: string },
  ) {
    try {
      const q = query.q;
      const type = query.type;
      const approved = query.approved;

      const users = await this.userService.findAll({ q, type, approved });
      return users;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // approve user
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Approve user',
    description: 'Approves a pending user by id.',
  })
  @ApiParam({ name: 'id', description: 'User id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiOkResponse({ description: 'User approved successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    try {
      const user = await this.userService.approve(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // reject user
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reject user',
    description: 'Rejects a pending user by id.',
  })
  @ApiParam({ name: 'id', description: 'User id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiOkResponse({ description: 'User rejected successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user id.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    try {
      const user = await this.userService.reject(id);
      return user;
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
  @ApiParam({ name: 'id', description: 'User id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
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
    summary: 'Update user',
    description: 'Updates an existing user by id.',
  })
  @ApiParam({ name: 'id', description: 'User id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
  @ApiBody({ type: UpdateUserAdminDto })
  @ApiOkResponse({ description: 'User updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid user id or payload.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserAdminDto: UpdateUserAdminDto) {
    try {
      const user = await this.userService.update(id, updateUserAdminDto);
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
  @ApiParam({ name: 'id', description: 'User id.', example: 'cm8q1n1f50000kq3g7d9h2zab' })
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
