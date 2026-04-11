import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { SazedStorage } from '../../../common/lib/Disk/SazedStorage';
import { StringHelper } from '../../../common/helper/string.helper';
import appConfig from '../../../config/app.config';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminProfile(adminId: string) {
    try {
      if (!adminId?.trim()) {
        throw new BadRequestException('Admin ID is required');
      }

      const admin = await this.prisma.user.findFirst({
        where: {
          id: adminId,
          type: {
            in: ['admin', 'su_admin'],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          phone_number: true,
          gender: true,
          created_at: true,
          updated_at: true,
          type: true,
        },
      });

      if (!admin) {
        throw new NotFoundException('Admin user not found');
      }

      const avatarUrl = admin.avatar
        ? SazedStorage.url(appConfig().storageUrl.avatar + admin.avatar)
        : null;

      return {
        success: true,
        message: 'Admin profile fetched successfully',
        data: {
          ...admin,
          avatarUrl,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to fetch admin profile',
      );
    }
  }

  async updateAdminProfile(
    adminId: string,
    dto: UpdateAdminProfileDto,
    avatar?: Express.Multer.File,
  ) {
    try {
      if (!adminId?.trim()) {
        throw new BadRequestException('Admin ID is required');
      }

      const admin = await this.prisma.user.findFirst({
        where: {
          id: adminId,
          type: {
            in: ['admin', 'su_admin'],
          },
        },
      });

      if (!admin) {
        throw new NotFoundException('Admin user not found');
      }

      // Check if email is being changed and verify it's unique
      if (
        dto.email &&
        dto.email.trim().toLowerCase() !== admin.email.toLowerCase()
      ) {
        const existingEmail = await this.prisma.user.findFirst({
          where: {
            email: dto.email.trim().toLowerCase(),
            id: { not: adminId },
          },
        });

        if (existingEmail) {
          throw new ConflictException('Email already in use by another user');
        }
      }

      let avatarPath = admin.avatar;

      // Handle avatar upload if provided
      if (avatar?.buffer) {
        try {
          // 1. Create safe filename
          const safeName = avatar.originalname
            .toLowerCase()
            .replace(/[^a-z0-9.\s-_]/g, '') // keep only valid chars
            .replace(/\s+/g, '-') // spaces → -
            .replace(/-+/g, '-'); // remove double dashes

          const fileName = `${StringHelper.randomString()}-${safeName}`;
          const key = `${appConfig().storageUrl.avatar}/${fileName}`;

          // 2. Upload new avatar
          await SazedStorage.put(key, avatar.buffer);
          avatarPath = SazedStorage.url(encodeURI(key));

          // 3. Delete old avatar if exists
          if (admin?.avatar) {
            try {
              const url = new URL(admin.avatar);
              const oldKey = url.pathname.replace(/^\/+/, '');
              await SazedStorage.delete(oldKey);
            } catch {
              await SazedStorage.delete(admin.avatar);
            }
          }
        } catch (uploadError) {
          throw new BadRequestException(
            'Failed to upload avatar: ' + uploadError?.message,
          );
        }
      }

      // Build update data (only include provided fields)
      const updateData: any = {};
      if (dto.name !== undefined && dto.name !== null) {
        updateData.name = dto.name.trim();
      }
      if (dto.email !== undefined && dto.email !== null) {
        updateData.email = dto.email.trim().toLowerCase();
      }
      if (dto.bio !== undefined && dto.bio !== null) {
        updateData.bio = dto.bio.trim() || null;
      }
      if (avatarPath !== undefined) {
        updateData.avatar = avatarPath;
      }
      if (dto.phone_number !== undefined && dto.phone_number !== null) {
        updateData.phone_number = dto.phone_number.trim() || null;
      }
      if (dto.gender !== undefined && dto.gender !== null) {
        updateData.gender = dto.gender.trim() || null;
      }

      const updatedAdmin = await this.prisma.user.update({
        where: { id: adminId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          phone_number: true,
          gender: true,
          updated_at: true,
          type: true,
        },
      });

      const avatarUrl = updatedAdmin.avatar
        ? SazedStorage.url(appConfig().storageUrl.avatar + updatedAdmin.avatar)
        : null;

      return {
        success: true,
        message: 'Admin profile updated successfully',
        data: {
          ...updatedAdmin,
          avatarUrl,
        },
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to update admin profile',
      );
    }
  }
}
