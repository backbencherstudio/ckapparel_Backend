import {
  Controller,
  Get,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('Admin Profile')
@ApiBearerAuth('admin_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({
    summary: 'Get current admin profile',
    description:
      'Returns profile information for the authenticated admin user.',
  })
  @ApiOkResponse({ description: 'Admin profile fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Get('me')
  async getAdminProfile(@GetUser('userId') adminId: string) {
    return this.profileService.getAdminProfile(adminId);
  }

  @ApiOperation({
    summary: 'Update current admin profile',
    description:
      'Updates admin profile fields including name, email, bio, avatar. Avatar should be sent as multipart file.',
  })
  @ApiBearerAuth('admin_token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Admin Manager' },
        email: { type: 'string', example: 'admin@example.com' },
        bio: { type: 'string', example: 'Platform administrator' },
        phone_number: { type: 'string', example: '+1234567890' },
        gender: { type: 'string', example: 'male' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Admin profile updated successfully.' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized request.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin only.' })
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
    }),
  )
  async updateAdminProfile(
    @GetUser('userId') adminId: string,
    @Body() dto: UpdateAdminProfileDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.profileService.updateAdminProfile(adminId, dto, avatar);
  }
}
