import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import appConfig from '../../../config/app.config';

const prisma = new PrismaClient();

// Initialize Redis client for publishing notifications
const redis = new Redis({
  host: appConfig().redis.host,
  port: Number(appConfig().redis.port),
  password: appConfig().redis.password,
});

export class NotificationRepository {
  private static readonly settingKeys = {
    push: 'notification.push.enabled',
    sponsorship: 'notification.sponsorship.enabled',
    chat: 'notification.chat.enabled',
  } as const;

  private static parseBoolean(value: string | null | undefined, fallback = true) {
    if (value === null || value === undefined) return fallback;
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
  }

  private static resolveToggleKey(type: string | undefined) {
    if (type === 'chat' || type === 'message') return this.settingKeys.chat;
    if (type === 'sponsorship') return this.settingKeys.sponsorship;
    return this.settingKeys.push;
  }

  private static async isNotificationAllowed(
    receiverId: string | undefined,
    toggleKey: string,
  ) {
    if (!receiverId) return true;

    const setting = await prisma.setting.findUnique({
      where: { key: toggleKey },
      select: { id: true, default_value: true },
    });

    if (!setting) return true;

    const userSetting = await prisma.userSetting.findFirst({
      where: {
        user_id: receiverId,
        setting_id: setting.id,
      },
      select: { value: true },
    });

    return this.parseBoolean(
      userSetting?.value,
      this.parseBoolean(setting.default_value, true),
    );
  }

  /**
   * Create a notification
   * @param sender_id - The ID of the user who fired the event
   * @param receiver_id - The ID of the user to notify
   * @param text - The text of the notification
   * @param type - The type of the notification
   * @param entity_id - The ID of the entity related to the notification
   * @returns The created notification
   */
  static async createNotification({
    sender_id,
    receiver_id,
    text,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    text?: string;
    type?:
      | 'message'
      | 'comment'
      | 'review'
      | 'booking'
      | 'payment_transaction'
      | 'package'
      | 'blog'
      | 'auth'
      | 'challenge'
      | 'quotation'
      | 'sponsorship'
      | 'support';
    entity_id?: string;
  }) {
    const toggleKey = this.resolveToggleKey(type);
    const isAllowed = await this.isNotificationAllowed(receiver_id, toggleKey);
    if (!isAllowed) {
      return null;
    }

    const notificationEventData = {};
    if (type) {
      notificationEventData['type'] = type;
    }
    if (text) {
      notificationEventData['text'] = text;
    }
    const notificationEvent = await prisma.notificationEvent.create({
      data: {
        type: type,
        text: text,
        ...notificationEventData,
      },
    });

    const notificationData = {};
    if (sender_id) {
      notificationData['sender_id'] = sender_id;
    }
    if (receiver_id) {
      notificationData['receiver_id'] = receiver_id;
    }
    if (entity_id) {
      notificationData['entity_id'] = entity_id;
    }

    const notification = await prisma.notification.create({
      data: {
        notification_event_id: notificationEvent.id,
        ...notificationData,
      },
    });

    // Fetch full details to send via Redis
    try {
      const fullNotification = await prisma.notification.findUnique({
        where: { id: notification.id },
        include: {
          notification_event: true,
          sender: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      if (fullNotification) {
        await redis.publish('notification', JSON.stringify(fullNotification));
      }
    } catch (error) {
      console.error('Error publishing notification to Redis:', error);
    }

    return notification;
  }
}
