import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { extname } from 'path';

import { ConversationType, MemberRole, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SazedStorage } from 'src/common/lib/Disk/SazedStorage';
import appConfig from 'src/config/app.config';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
  ) {}

  private async notifyConversation(
    receiverId: string | undefined,
    text: string,
    senderId?: string,
    conversationId?: string,
  ) {
    if (!receiverId) return;

    try {
      await NotificationRepository.createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        type: 'message',
        text,
        entity_id: conversationId,
      });
    } catch (error) {
      console.error('Failed to create conversation notification:', error);
    }
  }

  private dmKeyFor(a: string, b: string) {
    return [a, b].sort().join('_');
  }

  private resolveAvatarUrl(avatar?: string | null) {
    if (!avatar) return null;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    return SazedStorage.url(appConfig().storageUrl.avatar + avatar);
  }

  async ensureMember(conversationId: string, userId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        conversationId,
        userId,
        deletedAt: null,
        conversation: { deletedAt: null },
      },
      select: { id: true },
    });
    if (!m) throw new ForbiddenException('Not a member of this conversation');
  }

  async requireAdmin(conversationId: string, userId: string) {
    const m = await this.prisma.membership.findFirst({
      where: {
        conversationId,
        userId,
        deletedAt: null,
        conversation: { deletedAt: null },
      },
      select: { role: true },
    });
    if (!m) throw new ForbiddenException('Not a member');
    if (m.role !== MemberRole.ADMIN) throw new ForbiddenException('Admin only');
  }

  // ---- conversation management ----
  async createDm(currentUserId: string, otherUserId: string) {
    if (currentUserId === otherUserId) {
      throw new BadRequestException('Cannot DM yourself');
    }

    const key = this.dmKeyFor(currentUserId, otherUserId);

    if (await this.users.isBlocked(currentUserId, otherUserId)) {
      throw new ForbiddenException('You are blocked from messaging this user');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: { type: ConversationType.DM, dmKey: key },
      include: { memberships: true },
    });

    if (existing) return existing;

    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { name: true },
    });

    if (!otherUser) {
      throw new BadRequestException('The recipient does not exist');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true },
    });

    if (!currentUser) {
      throw new BadRequestException('The sender does not exist');
    }

    const senderTitle = currentUser.name || 'Unknown';
    const receiverTitle = otherUser.name || 'Unknown';

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.DM,
        dmKey: key,
        senderTitle,
        receiverTitle,
        createdBy: currentUserId,
        avatarUrl: otherUserId,
        creatorId: currentUserId,
        participantId: otherUserId,

        memberships: {
          create: [
            { userId: currentUserId, lastReadAt: new Date() },
            { userId: otherUserId, lastReadAt: new Date() },
          ],
        },
      },
      include: { memberships: true },
    });

    await this.notifyConversation(
      otherUserId,
      `${senderTitle} started a direct conversation with you.`,
      currentUserId,
      conversation.id,
    );

    return conversation;
  }

  // ---- group conversation management ----
  async createGroup(
    currentUserId: string,
    title: string,
    memberIds: string[],
    avatar?: Express.Multer.File,
    _createdBy?: string,
  ) {
    let avatarUrl: string | undefined;

    if (avatar) {
      if (!avatar.mimetype?.startsWith('image/')) {
        throw new BadRequestException('Group avatar must be an image file');
      }

      const maxBytes = 5 * 1024 * 1024;
      if (avatar.size > maxBytes) {
        throw new BadRequestException('Group avatar size must be 5MB or less');
      }

      const avatarFolder = appConfig()
        .storageUrl.avatar.replace(/^\/+/, '')
        .replace(/\/+$/, '');
      const safeExt =
        extname(avatar.originalname || '').toLowerCase() ||
        (avatar.mimetype === 'image/png'
          ? '.png'
          : avatar.mimetype === 'image/webp'
            ? '.webp'
            : '.jpg');
      const fileKey = `${avatarFolder}/group-${Date.now()}-${currentUserId}${safeExt}`;

      await SazedStorage.put(fileKey, avatar.buffer);
      avatarUrl = SazedStorage.url(fileKey);
    }

    const uniqueMembers = Array.from(new Set([currentUserId, ...memberIds]));
    const group = await this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title,
        avatarUrl,
        createdBy: currentUserId,
        memberships: {
          create: uniqueMembers.map((uid) => ({
            userId: uid,
            role: uid === currentUserId ? 'ADMIN' : 'MEMBER',
            lastReadAt: new Date(),
          })),
        },
      },
      include: { memberships: true },
    });

    const recipients = uniqueMembers.filter((uid) => uid !== currentUserId);
    if (recipients.length > 0) {
      await Promise.all(
        recipients.map((uid) =>
          this.notifyConversation(
            uid,
            `You were added to the group "${title}".`,
            currentUserId,
            group.id,
          ),
        ),
      );
    }

    return group;
  }

  // list conversations the user is in
  async myConversations(
    userId: string,
    take = 20,
    skip = 0,
    opts?: {
      unreadOnly?: boolean;
      from?: Date;
      to?: Date;
    },
  ) {
    const convs = await this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        memberships: {
          some: {
            userId,
            archivedAt: null,
            deletedAt: null,
          },
        },
        ...(opts?.from || opts?.to
          ? { updatedAt: { gte: opts?.from, lte: opts?.to } }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
      include: {
        memberships: {
          where: { deletedAt: null },
          select: {
            userId: true,
            role: true,
            lastReadAt: true,
            clearedAt: true,
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        creator: {
          select: { id: true, avatar: true },
        },
        participant: {
          select: { id: true, avatar: true },
        },
      },
    });
    if (convs.length === 0) return [];

    // Compute per conversation lowerBound for the user
    const bounds: Record<string, Date> = {};
    for (const c of convs) {
      const me = c.memberships.find((m) => m.userId === userId);
      const lb = new Date(
        Math.max(me?.lastReadAt?.getTime() ?? 0, me?.clearedAt?.getTime() ?? 0),
      );
      bounds[c.id] = lb;
    }

    const enriched = [] as any[];
    for (const c of convs) {
      const lb = bounds[c.id];
      const unread = await this.prisma.message.count({
        where: {
          conversationId: c.id,
          deletedAt: null,
          senderId: { not: userId },
          createdAt: { gt: lb },
        },
      });

      // Add the other participant's avatar for DMs
      let otherUserAvatar = null;
      if (c.type === ConversationType.DM) {
        // For DM, get the avatar of the "other" participant
        const otherUser = c.creatorId === userId ? c.participant : c.creator;
        if (otherUser?.avatar) {
          // If avatar is already a full URL, use it as-is; otherwise construct the URL
          if (otherUser.avatar.startsWith('http')) {
            otherUserAvatar = otherUser.avatar;
          } else {
            otherUserAvatar = SazedStorage.url(
              appConfig().storageUrl.avatar + otherUser.avatar,
            );
          }
        }
      }

      enriched.push({ ...c, unread, otherUserAvatar });
    }
    return opts?.unreadOnly ? enriched.filter((c) => c.unread > 0) : enriched;
  }

  async listGroupConversations(userId: string) {
    const groups = await this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        type: ConversationType.GROUP,
        memberships: { some: { userId, deletedAt: null } },
      },
      include: {
        memberships: {
          where: { deletedAt: null },
          select: {
            userId: true,
            role: true,
            lastReadAt: true,
            clearedAt: true,
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return groups;
  }

  // mark read up to now or specific timestamp
  async markRead(conversationId: string, userId: string, upTo?: Date) {
    await this.ensureMember(conversationId, userId);

    let at = upTo;
    if (!at) {
      const last = await this.prisma.message.findFirst({
        where: { conversationId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      at = last?.createdAt ?? new Date();
    }

    const m = await this.prisma.membership.findFirst({
      where: { conversationId, userId },
      select: { lastReadAt: true },
    });

    const floor = m?.lastReadAt ?? new Date(0);
    const candidate = at < floor ? floor : at;
    const next =
      m?.lastReadAt && m.lastReadAt > candidate ? m.lastReadAt : candidate;

    await this.prisma.membership.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: next },
    });

    const unread = await this.prisma.message.count({
      where: {
        conversationId,
        createdAt: { gt: next },
        senderId: { not: userId },
      },
    });
    return { conversationId, lastReadAt: next, unread };
  }

  // ---- member management ----
  async addMembers(
    conversationId: string,
    currentUserId: string,
    memberIds: string[],
  ) {
    await this.requireAdmin(conversationId, currentUserId);

    const unique = Array.from(new Set(memberIds));

    const existing = await this.prisma.membership.findMany({
      where: {
        conversationId,
        userId: { in: unique },
      },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));

    const toAdd = unique.filter((uid) => !existingIds.has(uid));
    if (toAdd.length === 0) {
      return { ok: false, message: 'All members already exist' };
    }

    await this.prisma.membership.createMany({
      data: toAdd.map((uid) => ({
        conversationId,
        userId: uid,
        role: 'MEMBER',
        lastReadAt: new Date(),
      })),
      skipDuplicates: true,
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });
    const groupName = conversation?.title || 'a group conversation';

    await Promise.all(
      toAdd.map((uid) =>
        this.notifyConversation(
          uid,
          `You were added to the group "${groupName}".`,
          currentUserId,
          conversationId,
        ),
      ),
    );

    return { ok: true, added: toAdd };
  }

  // list members of a group conversation
  async getGroupMembers(conversationId: string, currentUserId: string) {
    await this.ensureMember(conversationId, currentUserId);

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });
    if (!conv || conv.type !== ConversationType.GROUP) {
      throw new BadRequestException(
        'Members list is available only for group conversations',
      );
    }

    const members = await this.prisma.membership.findMany({
      where: { conversationId },
      select: {
        userId: true,
        role: true,
        user: { select: { name: true, username: true, avatar: true } },
      },
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    });

    return members.map((m) => ({
      userId: m.userId,
      displayName: m.user.name,
      username: m.user.username,
      avatarUrl: this.resolveAvatarUrl(m.user.avatar),
      isCurrentUser: m.userId === currentUserId,
      role: m.role,
    }));
  }

  // change role of a member (admin only)
  async removeMember(
    conversationId: string,
    currentUserId: string,
    targetUserId: string,
  ) {
    await this.requireAdmin(conversationId, currentUserId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });

    await this.prisma.membership.deleteMany({
      where: { conversationId, userId: targetUserId },
    });

    await this.notifyConversation(
      targetUserId,
      `You were removed from the group "${conversation?.title || 'conversation'}".`,
      currentUserId,
      conversationId,
    );

    return { ok: true };
  }

  // change role of a member (admin only)
  async setRole(
    conversationId: string,
    currentUserId: string,
    targetUserId: string,
    role: MemberRole,
  ) {
    await this.requireAdmin(conversationId, currentUserId);
    await this.prisma.membership.updateMany({
      where: { conversationId, userId: targetUserId },
      data: { role },
    });

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });

    await this.notifyConversation(
      targetUserId,
      `Your role was updated to ${role} in "${conversation?.title || 'group conversation'}".`,
      currentUserId,
      conversationId,
    );

    return { ok: true };
  }

  // get unread count for a conversation
  async unreadFor(conversationId: string, userId: string) {
    const me = await this.prisma.membership.findFirst({
      where: {
        conversationId,
        userId,
        deletedAt: null,
        conversation: { deletedAt: null },
      },
      select: { lastReadAt: true },
    });
    if (!me) throw new ForbiddenException('Not a member');
    const unread = await this.prisma.message.count({
      where: {
        conversationId,
        createdAt: { gt: me.lastReadAt ?? new Date(0) },
        senderId: { not: userId },
      },
    });
    return { conversationId, unread };
  }

  //------ clear conversation for me----
  async clearForUser(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, deletedAt: true },
    });

    if (!conversation || conversation.deletedAt) {
      throw new BadRequestException('Conversation not found');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        conversationId,
        userId,
        deletedAt: null,
      },
      select: { id: true },
    });

    console.log("conversation members", membership);


    if (!conversation || conversation.deletedAt) {
      throw new BadRequestException('Conversation not found');
    }

    const clearedAt = new Date();

    await this.prisma.membership.updateMany({
      where: { conversationId, userId, deletedAt: null },
      data: { clearedAt, lastReadAt: clearedAt },
    });

    return {
      ok: true,
      conversationId,
      clearedAll: true,
      clearedAt: clearedAt.toISOString(),
    };
  }

  async updateGroupTitle(
    conversationId: string,
    currentUserId: string,
    title: string,
  ) {
    const normalizedTitle = String(title ?? '').trim();
    if (!normalizedTitle) {
      throw new BadRequestException('title is required');
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, type: true, deletedAt: true },
    });

    if (!conv || conv.deletedAt) {
      throw new BadRequestException('Conversation not found');
    }

    if (conv.type !== ConversationType.GROUP) {
      throw new BadRequestException(
        'Only group conversations can update title',
      );
    }

    await this.requireAdmin(conversationId, currentUserId);

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title: normalizedTitle, updatedAt: new Date() },
      select: { id: true, title: true, updatedAt: true },
    });

    const members = await this.prisma.membership.findMany({
      where: { conversationId, deletedAt: null, userId: { not: currentUserId } },
      select: { userId: true },
    });

    await Promise.all(
      members.map((m) =>
        this.notifyConversation(
          m.userId,
          `Group name was updated to "${updated.title}".`,
          currentUserId,
          conversationId,
        ),
      ),
    );

    return {
      ok: true,
      conversationId: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt,
    };
  }

  async updateGroupAvatar(
    conversationId: string,
    currentUserId: string,
    avatar: Express.Multer.File,
  ) {
    if (!avatar) {
      throw new BadRequestException('avatar is required');
    }

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, type: true, deletedAt: true },
    });

    if (!conv || conv.deletedAt) {
      throw new BadRequestException('Conversation not found');
    }

    if (conv.type !== ConversationType.GROUP) {
      throw new BadRequestException(
        'Only group conversations can update avatar',
      );
    }

    await this.requireAdmin(conversationId, currentUserId);

    if (!avatar.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Group avatar must be an image file');
    }

    const maxBytes = 5 * 1024 * 1024;
    if (avatar.size > maxBytes) {
      throw new BadRequestException('Group avatar size must be 5MB or less');
    }

    const avatarFolder = appConfig()
      .storageUrl.avatar.replace(/^\/+/, '')
      .replace(/\/+$/, '');

    const safeExt =
      extname(avatar.originalname || '').toLowerCase() ||
      (avatar.mimetype === 'image/png'
        ? '.png'
        : avatar.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg');

    const fileKey = `${avatarFolder}/group-${Date.now()}-${currentUserId}${safeExt}`;
    await SazedStorage.put(fileKey, avatar.buffer);
    const avatarUrl = SazedStorage.url(fileKey);

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { avatarUrl, updatedAt: new Date() },
      select: { id: true, avatarUrl: true, updatedAt: true },
    });

    const members = await this.prisma.membership.findMany({
      where: { conversationId, deletedAt: null, userId: { not: currentUserId } },
      select: { userId: true },
    });

    await Promise.all(
      members.map((m) =>
        this.notifyConversation(
          m.userId,
          'Group photo was updated.',
          currentUserId,
          conversationId,
        ),
      ),
    );

    return {
      ok: true,
      conversationId: updated.id,
      avatarUrl: updated.avatarUrl,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteConversation(conversationId: string, currentUserId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, type: true, deletedAt: true },
    });

    if (!conv || conv.deletedAt) {
      throw new BadRequestException('Conversation not found');
    }

    if (conv.type === ConversationType.GROUP) {
      await this.requireAdmin(conversationId, currentUserId);
    } else {
      await this.ensureMember(conversationId, currentUserId);
    }

    const now = new Date();

    const members = await this.prisma.membership.findMany({
      where: { conversationId, deletedAt: null, userId: { not: currentUserId } },
      select: { userId: true },
    });

    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { deletedAt: now, updatedAt: now },
      }),
      this.prisma.membership.updateMany({
        where: { conversationId, deletedAt: null },
        data: { deletedAt: now, updatedAt: now },
      }),
    ]);

    await Promise.all(
      members.map((m) =>
        this.notifyConversation(
          m.userId,
          'A conversation you were in has been deleted.',
          currentUserId,
          conversationId,
        ),
      ),
    );

    return {
      ok: true,
      conversationId,
      deletedAt: now,
    };
  }
}
