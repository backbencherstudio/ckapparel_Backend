import { Injectable } from '@nestjs/common';
import { CreateUserAdminDto } from './dto/create-user.dto';
import { UpdateUserAdminDto } from './dto/update-user.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { NotificationRepository } from '../../../common/repository/notification/notification.repository';
import appConfig from '../../../config/app.config';
import { SazedStorage } from '../../../common/lib/Disk/SazedStorage';
import { DateHelper } from '../../../common/helper/date.helper';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private async createAdminUserNotification(
    receiverId: string | undefined,
    text: string,
    senderId?: string,
    entityId?: string,
  ) {
    try {
      await NotificationRepository.createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        type: 'auth',
        text,
        entity_id: entityId,
      });
    } catch (error) {
      console.error('Failed to create admin-user notification:', error);
    }
  }

  async findAll({
    q,
    country,
    status,
  }: {
    q?: string;
    country?: string;
    status?: number;
  }) {
    try {
      const where_condition = {};
      if (q) {
        where_condition['OR'] = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ];
      }

      if (country) {
        where_condition['country'] = country;
      }

      if (status !== undefined) {
        where_condition['status'] = status;
      }

      const data = [];

      const users = await this.prisma.user.findMany({
        where: {
          ...where_condition,
        },
        select: {
          id: true,
          status: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          country: true,
          flag: true,
          type: true,
          created_at: true,
          updated_at: true,
        },
      });

      data.push(...users);

      // get total challenges joined by each user
      for (const user of data) {
        const challengesJoined = await this.prisma.challengeParticipation.count(
          {
            where: {
              user_id: user.id,
            },
          },
        );
        user['challenges_joined'] = challengesJoined;
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          status: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          country: true,
          flag: true,
          age: true,
          type: true,
          created_at: true,
          updated_at: true,
        },
      });

      // add avatar url to user
      // if (user.avatar) {
      //   user['avatar_url'] = SazedStorage.url(
      //     appConfig().storageUrl.avatar + user.avatar,
      //   );
      // }

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // get total challenges joined, completed, incomplete by the user
      const challengesJoined = await this.prisma.challengeParticipation.count({
        where: {
          user_id: user.id,
        },
      });

      user['challenges_joined'] = challengesJoined;

      const challengesCompleted =
        await this.prisma.challengeParticipation.count({
          where: {
            user_id: user.id,
            status: 'COMPLETED',
          },
        });
      user['challenges_completed'] = challengesCompleted;

      const challengesIncomplete =
        await this.prisma.challengeParticipation.count({
          where: {
            user_id: user.id,
            status: {
              in: [
                'JOINED',
                'IN_PROGRESS',
                'PAUSED',
                'DISQUALIFIED',
                'ABANDONED',
              ],
            },
          },
        });
      user['challenges_incomplete'] = challengesIncomplete;

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async banUnbanUser(id: string, status: number) {
    try {
      const existUser = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      if (!existUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const banned_User = await this.prisma.user.update({
        where: {
          id: id,
        },
        data: {
          status: status,
        },
      });

      if (status === 0) {
        // if user is banned, then set all his challenge participations to disqualified
        await this.prisma.challengeParticipation.updateMany({
          where: {
            user_id: id,
            status: {
              in: ['JOINED', 'IN_PROGRESS', 'PAUSED'],
            },
          },
          data: {
            status: 'DISQUALIFIED',
          },
        });
      } else {
        // if user is unbanned, then set all his challenge participations which are disqualified due to ban to joined
        await this.prisma.challengeParticipation.updateMany({
          where: {
            user_id: id,
            status: 'DISQUALIFIED',
          },
          data: {
            status: 'JOINED',
          },
        });
      }

      // Send notification using the project notification flow (event + Redis publish)
      await this.createAdminUserNotification(
        banned_User.id,
        status === 0
          ? 'You have been banned from the platform.'
          : 'You have been unbanned from the platform.',
        undefined,
        banned_User.id,
      );

      // Broadcast admin-facing event for moderation visibility.
      await this.createAdminUserNotification(
        undefined,
        status === 0
          ? `User "${banned_User.name}" has been banned by admin.`
          : `User "${banned_User.name}" has been unbanned by admin.`,
        undefined,
        banned_User.id,
      );

      return {
        success: true,
        message:
          status === 0
            ? 'User banned successfully'
            : 'User unbanned successfully',
        data: {
          user_id: banned_User.id,
          status: banned_User.status,
          name: banned_User.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
        },
      });

      if (!existingUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const user = await UserRepository.deleteUser(id);

      await this.createAdminUserNotification(
        undefined,
        `User "${existingUser.name}" has been deleted by admin.`,
        undefined,
        existingUser.id,
      );

      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
