import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  private readonly notificationSettingConfig = {
    pushNotifications: {
      key: 'notification.push.enabled',
      label: 'Push Notifications',
      description: 'Master switch for push notifications',
      defaultValue: 'true',
    },
    sponsorshipAlerts: {
      key: 'notification.sponsorship.enabled',
      label: 'Sponsorship Alerts',
      description: 'Receive sponsorship related alerts',
      defaultValue: 'true',
    },
    chatNotifications: {
      key: 'notification.chat.enabled',
      label: 'Chat Notifications',
      description: 'Receive chat and message notifications',
      defaultValue: 'true',
    },
  } as const;

  private parseSettingValue(value: string | null | undefined, fallback = true) {
    if (value === null || value === undefined) return fallback;
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
  }

  private async ensureNotificationSettingsExist() {
    const entries = Object.values(this.notificationSettingConfig);

    await Promise.all(
      entries.map((entry) =>
        this.prisma.setting.upsert({
          where: { key: entry.key },
          create: {
            category: 'notification',
            label: entry.label,
            description: entry.description,
            key: entry.key,
            default_value: entry.defaultValue,
          },
          update: {
            category: 'notification',
            label: entry.label,
            description: entry.description,
            default_value: entry.defaultValue,
          },
        }),
      ),
    );
  }

  async getNotificationSettings(userId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.ensureNotificationSettingsExist();

      const keys = Object.values(this.notificationSettingConfig).map((entry) => entry.key);

      const userSettings = await this.prisma.userSetting.findMany({
        where: {
          user_id: userId,
          setting: {
            key: { in: keys },
          },
        },
        include: {
          setting: {
            select: {
              key: true,
              default_value: true,
            },
          },
        },
      });

      const map = new Map<string, { value: string | null; defaultValue: string | null }>();
      for (const setting of userSettings) {
        map.set(setting.setting?.key || '', {
          value: setting.value,
          defaultValue: setting.setting?.default_value || null,
        });
      }

      const pushEntry = this.notificationSettingConfig.pushNotifications;
      const sponsorshipEntry = this.notificationSettingConfig.sponsorshipAlerts;
      const chatEntry = this.notificationSettingConfig.chatNotifications;

      const pushRaw = map.get(pushEntry.key);
      const sponsorshipRaw = map.get(sponsorshipEntry.key);
      const chatRaw = map.get(chatEntry.key);

      const payload = {
        pushNotifications: this.parseSettingValue(
          pushRaw?.value,
          this.parseSettingValue(pushRaw?.defaultValue, true),
        ),
        sponsorshipAlerts: this.parseSettingValue(
          sponsorshipRaw?.value,
          this.parseSettingValue(sponsorshipRaw?.defaultValue, true),
        ),
        chatNotifications: this.parseSettingValue(
          chatRaw?.value,
          this.parseSettingValue(chatRaw?.defaultValue, true),
        ),
      };

      return {
        success: true,
        message: 'Notification settings fetched successfully',
        data: payload,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch notification settings',
      };
    }
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const hasAnyField =
        dto.pushNotifications !== undefined ||
        dto.sponsorshipAlerts !== undefined ||
        dto.chatNotifications !== undefined;

      if (!hasAnyField) {
        return {
          success: false,
          message: 'At least one setting field is required',
        };
      }

      await this.ensureNotificationSettingsExist();

      const keyToValue: Array<{ key: string; value: boolean }> = [];
      if (dto.pushNotifications !== undefined) {
        keyToValue.push({
          key: this.notificationSettingConfig.pushNotifications.key,
          value: dto.pushNotifications,
        });
      }
      if (dto.sponsorshipAlerts !== undefined) {
        keyToValue.push({
          key: this.notificationSettingConfig.sponsorshipAlerts.key,
          value: dto.sponsorshipAlerts,
        });
      }
      if (dto.chatNotifications !== undefined) {
        keyToValue.push({
          key: this.notificationSettingConfig.chatNotifications.key,
          value: dto.chatNotifications,
        });
      }

      for (const item of keyToValue) {
        const setting = await this.prisma.setting.findUnique({
          where: { key: item.key },
          select: { id: true },
        });

        if (!setting) continue;

        const existing = await this.prisma.userSetting.findFirst({
          where: {
            user_id: userId,
            setting_id: setting.id,
          },
          select: { id: true },
        });

        if (existing) {
          await this.prisma.userSetting.update({
            where: { id: existing.id },
            data: { value: String(item.value) },
          });
        } else {
          await this.prisma.userSetting.create({
            data: {
              user_id: userId,
              setting_id: setting.id,
              value: String(item.value),
            },
          });
        }
      }

      const settings = await this.getNotificationSettings(userId);

      return {
        success: true,
        message: 'Notification settings updated successfully',
        data: settings.success ? settings.data : undefined,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update notification settings',
      };
    }
  }

  async getAllNotifications(userId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const notifications = await this.prisma.notification.findMany({
        where: {
          receiver_id: userId,
        },
        include: {
          notification_event: true,
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        message: 'Failed to fetch notifications',
      };
    }
  }

  async markAsRead(userId: string, notificationId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });
      if (!notification || notification.receiver_id !== userId) {
        return {
          success: false,
          message: 'Notification not found or unauthorized',
        };
      }

      await this.prisma.notification.update({
        where: {
          id: notificationId,
          receiver_id: userId,
        },
        data: {
          read_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark notification as read',
      };
    }
  }

  async markAllAsRead(userId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const notification = await this.prisma.notification.findFirst({
        where: {
          receiver_id: userId,
          read_at: null,
        },
      });
      if (!notification) {
        return {
          success: true,
          message: 'No unread notifications',
        };
      }

      await this.prisma.notification.updateMany({
        where: {
          receiver_id: userId,
          read_at: null,
        },
        data: {
          read_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'All notifications marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark all notifications as read',
      };
    }
  }

  async markAsUnread(userId: string, notificationId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });
      if (!notification || notification.receiver_id !== userId) {
        return {
          success: false,
          message: 'Notification not found or unauthorized',
        };
      }

      await this.prisma.notification.update({
        where: {
          id: notificationId,
          receiver_id: userId,
        },
        data: {
          read_at: null,
        },
      });
      return {
        success: true,
        message: 'Notification marked as unread',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to mark notification as unread',
      };
    }
  }

  async deleteNotification(userId: string, notificationId: string) {
    try {
      if (!userId) {
        return {
          success: false,
          message: 'User ID is required',
        };
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const notification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      });
      if (!notification || notification.receiver_id !== userId) {
        return {
          success: false,
          message: 'Notification not found or unauthorized',
        };
      }

      await this.prisma.notification.deleteMany({
        where: {
          id: notificationId,
          receiver_id: userId,
        },
      });
      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete notification',
      };
    }
  }
}
