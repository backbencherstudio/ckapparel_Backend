import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SazedStorage } from 'src/common/lib/Disk/SazedStorage';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private normalizeUserId(value: string, fieldName: string): string {
    const normalized = (value ?? '').trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }
    return normalized;
  }

  private async ensureUserExists(userId: string, fieldName: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`${fieldName} not found`);
    }
  }

  async suggestUsers(currentUserId: string, q: string, take = 10) {
    const term = (q ?? '').trim();
    if (term.length < 2) return { items: [] };

    const users = await this.prisma.user.findMany({
      where: {
        deleted_at: null,
        id: { not: currentUserId },
        AND: [
          { blocksInitiated: { none: { blockedId: currentUserId } } },
          { blockedBy: { none: { blockerId: currentUserId } } },
        ],
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { username: { contains: term, mode: 'insensitive' } },
          { email: { startsWith: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
      },
      take,
      orderBy: [{ name: 'asc' }],
    });

    // console.log('Suggested users:', users);

    const items = users.map((u) => ({
      id: u.id,
      name: u.name ?? 'Unknown',
      username: u.username ?? null,
      avatar_url: u.avatar
        ? /^https?:\/\//i.test(String(u.avatar))
          ? String(u.avatar)
          : SazedStorage.url(
              `${appConfig().storageUrl.avatar.replace(/^\/+/, '').replace(/\/+$/, '')}/${String(u.avatar).replace(/^\/+/, '')}`,
            )
        : null,
    }));

    // console.log('Final items:', items);

    return { items };
  }

  async block(blockerId: string, targetUserId: string) {
    const normalizedBlockerId = this.normalizeUserId(blockerId, 'blockerId');
    const normalizedTargetUserId = this.normalizeUserId(
      targetUserId,
      'targetUserId',
    );

    if (normalizedBlockerId === normalizedTargetUserId)
      throw new ForbiddenException('Cannot block yourself');

    await this.ensureUserExists(normalizedTargetUserId, 'Target user');

    const existing = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: normalizedBlockerId,
          blockedId: normalizedTargetUserId,
        },
      },
      select: { blockerId: true },
    });

    await this.prisma.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: normalizedBlockerId,
          blockedId: normalizedTargetUserId,
        },
      },
      update: {},
      create: {
        blockerId: normalizedBlockerId,
        blockedId: normalizedTargetUserId,
      },
    });

    return {
      ok: true,
      blocked: true,
      created: !existing,
    };
  }

  async unblock(blockerId: string, targetUserId: string) {
    const normalizedBlockerId = this.normalizeUserId(blockerId, 'blockerId');
    const normalizedTargetUserId = this.normalizeUserId(
      targetUserId,
      'targetUserId',
    );

    if (normalizedBlockerId === normalizedTargetUserId) {
      throw new ForbiddenException('Cannot unblock yourself');
    }

    await this.ensureUserExists(normalizedTargetUserId, 'Target user');

    const result = await this.prisma.block.deleteMany({
      where: {
        blockerId: normalizedBlockerId,
        blockedId: normalizedTargetUserId,
      },
    });

    return {
      ok: true,
      unblocked: result.count > 0,
    };
  }

  async isBlocked(a: string, b: string) {
    const userA = this.normalizeUserId(a, 'a');
    const userB = this.normalizeUserId(b, 'b');

    if (userA === userB) {
      return false;
    }

    const cnt = await this.prisma.block.count({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return cnt > 0;
  }
}
