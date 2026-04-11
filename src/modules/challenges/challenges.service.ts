import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  ChallengePath,
  ChallengeStatus,
  ConversationType,
  FitnessProvider,
  MetricType,
  ParticipationStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserChallengesQueryDto } from './dto/user-challenges-query.dto';
import { ConversationsService } from 'src/modules/chat/conversations/conversations.service';
import { CreateCommunityChallengeDto } from 'src/modules/admin/challenges/dto/create-community-challenge.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
  ) {}

  private async createChallengeNotification(
    receiverId: string | undefined,
    text: string,
    senderId?: string,
    entityId?: string,
  ) {
    try {
      await NotificationRepository.createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        type: 'challenge',
        text,
        entity_id: entityId,
      });
    } catch (error) {
      console.error('Failed to create challenge notification:', error);
    }
  }

  private parseChallengeIdFromConversationTitle(title?: string | null) {
    if (!title) return null;
    const match = title.match(/\[([a-zA-Z0-9]+)\]\s*$/);
    return match?.[1] || null;
  }

  private resolveLegacyConversationForChallenge(
    challenge: any,
    candidateConversations: Array<{
      id: string;
      title: string | null;
      type: ConversationType;
      createdAt: Date;
      createdBy: string | null;
      _count: { memberships: number };
    }>,
  ) {
    const sameTitle = candidateConversations.filter(
      (c) => c.title === challenge.title,
    );
    if (!sameTitle.length) return null;

    let narrowed = sameTitle;
    if (challenge.created_by) {
      const byCreator = sameTitle.filter(
        (c) => c.createdBy === challenge.created_by,
      );
      if (byCreator.length) narrowed = byCreator;
    }

    // Pick the closest createdAt to challenge created_at for duplicate titles.
    const targetTime = new Date(challenge.created_at).getTime();
    let winner = narrowed[0];
    let minDiff = Math.abs(narrowed[0].createdAt.getTime() - targetTime);
    for (const conv of narrowed.slice(1)) {
      const diff = Math.abs(conv.createdAt.getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        winner = conv;
      }
    }

    return {
      id: winner.id,
      title: challenge.title,
      type: winner.type,
      membersCount: winner._count.memberships,
    };
  }

  private metricLabel(metricType?: string, value?: number | string) {
    if (value === undefined || value === null) return null;
    const normalized = Number(value);
    if (metricType === 'DISTANCE_KM') return `${normalized} km`;
    if (metricType === 'ELEVATION_M') return `${normalized} m`;
    if (metricType === 'DURATION_MIN') return `${normalized} min`;
    return `${normalized}`;
  }

  private safeDecimal(value?: { toString: () => string } | null) {
    if (value === undefined || value === null) return null;
    const parsed = Number(value.toString());
    return Number.isNaN(parsed) ? null : parsed;
  }

  private groupLabelForPath(path: ChallengePath) {
    if (path === ChallengePath.MONTHLY_CHALLENGE) return 'Monthly Challenges';
    if (path === ChallengePath.VIRTUAL_ADVENTURE) return 'Virtual Adventures';
    if (path === ChallengePath.ELITE_ATHLETE) return 'Elite Challenges';
    return 'Community Challenges';
  }

  private normalizeConversation(
    conversation:
      | {
          id: string;
          title: string | null;
          type: ConversationType;
          memberships?: Array<{ userId: string }>;
          _count?: { memberships: number };
        }
      | null
      | undefined,
  ) {
    if (!conversation) return null;

    const membersCount = Array.isArray(conversation.memberships)
      ? conversation.memberships.length
      : conversation._count?.memberships || 0;

    return {
      id: conversation.id,
      title: conversation.title,
      type: conversation.type,
      membersCount,
    };
  }

  private getChallengeConfigData(challenge: any) {
    const raw = challenge?.pathConfig?.config_data;
    if (!raw) return {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw;
  }

  private validateCreateCommunityPayload(
    createChallengeDto: CreateCommunityChallengeDto,
  ) {
    if (createChallengeDto.metrics?.length) {
      const metricTypeSet = new Set(
        createChallengeDto.metrics.map((metric) => metric.metric_type),
      );
      if (metricTypeSet.size !== createChallengeDto.metrics.length) {
        throw new BadRequestException(
          'Duplicate metric_type is not allowed in metrics',
        );
      }

      const metricSequenceSet = new Set(
        createChallengeDto.metrics.map((metric) => metric.sequence),
      );
      if (metricSequenceSet.size !== createChallengeDto.metrics.length) {
        throw new BadRequestException(
          'Duplicate sequence is not allowed in metrics',
        );
      }
    }

    if (createChallengeDto.checkpoints?.length) {
      const checkpointSequenceSet = new Set(
        createChallengeDto.checkpoints.map((checkpoint) => checkpoint.sequence),
      );
      if (
        checkpointSequenceSet.size !== createChallengeDto.checkpoints.length
      ) {
        throw new BadRequestException(
          'Duplicate sequence is not allowed in checkpoints',
        );
      }
    }
  }

  private resolveEliteLockState(
    challenge: any,
    completedByDifficulty: Record<string, number>,
  ) {
    if (challenge.path !== ChallengePath.ELITE_ATHLETE) {
      return {
        enabled: false,
        isLocked: false,
        requiredDifficulty: null,
        requiredCount: 0,
        completedCount: 0,
      };
    }

    const config = this.getChallengeConfigData(challenge);
    const lockConfig = config?.lock_config;

    if (!lockConfig) {
      return {
        enabled: false,
        isLocked: false,
        requiredDifficulty: null,
        requiredCount: 0,
        completedCount: 0,
      };
    }

    const requiredDifficulty = lockConfig.required_difficulty;
    const requiredCount = Number(lockConfig.required_count || 0);
    const completedCount = Number(
      completedByDifficulty[requiredDifficulty] || 0,
    );
    const isLocked = completedCount < requiredCount;

    return {
      enabled: true,
      isLocked,
      requiredDifficulty,
      requiredCount,
      completedCount,
    };
  }

  private formatChallengeCard(input: {
    challenge: any;
    userParticipation: any;
    topFinisher: any;
    conversation: ReturnType<typeof this.normalizeConversation>;
    hasConnection: boolean;
    lockState: {
      enabled: boolean;
      isLocked: boolean;
      requiredDifficulty: string | null;
      requiredCount: number;
      completedCount: number;
    };
  }) {
    const {
      challenge,
      userParticipation,
      topFinisher,
      conversation,
      hasConnection,
      lockState,
    } = input;
    const primaryMetric = challenge.metrics?.[0] || null;
    const checkpointCount = challenge.checkpoints?.length || 0;
    const progressPercent = Number(userParticipation?.progress_percent || 0);
    const target = primaryMetric
      ? this.safeDecimal(primaryMetric.target_value)
      : null;
    const metricValue =
      target !== null
        ? this.metricLabel(primaryMetric.metric_type, target)
        : null;

    let pathDetails: Record<string, any> = {};
    if (challenge.path === ChallengePath.MONTHLY_CHALLENGE) {
      const config = (challenge.pathConfig?.config_data ?? {}) as any;
      pathDetails = {
        kind: config?.challenge_kind || null,
        monthName: config?.metadata?.month_name || null,
        benchmarkGroup: config?.metadata?.benchmark_group || null,
        mainActionLabel:
          config?.challenge_kind === 'main_event'
            ? 'Join Main Event'
            : 'View Benchmark',
      };
    } else if (challenge.path === ChallengePath.VIRTUAL_ADVENTURE) {
      const config = (challenge.pathConfig?.config_data ?? {}) as any;
      pathDetails = {
        routeName: config?.route_name || challenge.title,
        routeDistanceKm: config?.route_distance_km ?? target,
        requireGps: config?.require_gps ?? false,
        enableJourneyLog: config?.enable_journey_log ?? false,
        waypoints: config?.route_points?.waypoints?.length || checkpointCount,
        primaryActionLabel: 'Chat',
        secondaryActionLabel: 'Journey Log',
      };
    } else if (challenge.path === ChallengePath.ELITE_ATHLETE) {
      pathDetails = {
        entryType: challenge.difficulty,
        participantsLabel: `${challenge._count.participations} participants`,
        finisherLabel: `${challenge._count.leaderboard} finishers`,
        attemptLabel: lockState.isLocked
          ? 'Locked'
          : hasConnection
            ? 'Attempt Challenge'
            : 'Connect Your Apps',
        lock: lockState,
      };
    } else {
      pathDetails = {
        communityTag: challenge.category,
        checkpoints: checkpointCount,
        rewarded: Boolean(challenge.reward_title),
        primaryActionLabel: 'Chat',
        secondaryActionLabel: 'Leaderboard',
      };
    }

    return {
      id: challenge.id,
      path: challenge.path,
      group: this.groupLabelForPath(challenge.path),
      challengeKind:
        challenge.path === ChallengePath.MONTHLY_CHALLENGE
          ? pathDetails.kind
          : null,
      title: challenge.title,
      subtitle: challenge.subtitle,
      description: challenge.description,
      category: challenge.category,
      difficulty: challenge.difficulty,
      country: challenge.challenge_country,
      reward: {
        title: challenge.reward_title,
        description: challenge.reward_description,
      },
      stats: {
        participants: challenge._count.participations,
        completed: challenge.participants_completed || 0,
        finishers: challenge._count.leaderboard,
        checkpoints: checkpointCount,
      },
      progress: {
        percent: progressPercent,
        status: userParticipation?.status || null,
        activeCheckpointSeq: userParticipation?.active_checkpoint_seq || null,
        metric: metricValue,
      },
      metrics: (challenge.metrics || []).map((m) => ({
        type: m.metric_type,
        sequence: m.sequence,
        target: this.safeDecimal(m.target_value),
        minThreshold: this.safeDecimal(m.min_threshold),
        isRequired: m.is_required,
        label: this.metricLabel(
          m.metric_type,
          this.safeDecimal(m.target_value),
        ),
      })),
      // metric: primaryMetric
      //   ? {
      //       type: primaryMetric.metric_type,
      //       target,
      //       label: metricValue,
      //     }
      //   : null,
      topFinisher: topFinisher
        ? {
            userId: topFinisher.user.id,
            name: topFinisher.user.name,
            age: topFinisher.user.age,
            country: topFinisher.user.country,
            flag: topFinisher.user.flag,
            finishTimeSec: topFinisher.finish_time_sec,
          }
        : null,
      pathDetails,
      actions: {
        chat: {
          enabled: challenge.enable_chat,
          conversationId: conversation?.id || null,
        },
        leaderboard: {
          enabled: true,
        },
        attempt: {
          enabled: true,
          requiresConnection: challenge.require_device_connection,
          hasConnection,
          isLocked: lockState.isLocked,
          canAttempt:
            !lockState.isLocked &&
            (!challenge.require_device_connection || hasConnection),
        },
      },
      lock: lockState,
      conversation: conversation
        ? {
            id: conversation.id,
            title: challenge.title,
            type: conversation.type,
            membersCount: conversation.membersCount,
          }
        : null,
      createdAt: challenge.created_at,
      updatedAt: challenge.updated_at,
    };
  }

  async getUserChallengeFeed(userId: string, query: UserChallengesQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;
    if (!query.path) {
      throw new BadRequestException('path is required');
    }

    const where: any = {
      deleted_at: null,
      is_active: true,
      status: { in: [ChallengeStatus.ACTIVE, ChallengeStatus.PENDING] },
    };

    where.path = query.path;
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { subtitle: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [challenges, total, activeConnections, completedEliteAttempts] =
      await Promise.all([
        this.prisma.challenges.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          include: {
            pathConfig: true,
            conversation: {
              include: {
                memberships: {
                  select: { userId: true },
                },
              },
            },
            metrics: { orderBy: { sequence: 'asc' } },
            checkpoints: { orderBy: { sequence: 'asc' } },
            participations: {
              where: { user_id: userId },
              take: 1,
            },
            leaderboard: {
              orderBy: { rank: 'asc' },
              take: 1,
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    age: true,
                    country: true,
                    flag: true,
                  },
                },
              },
            },
            _count: {
              select: {
                participations: true,
                leaderboard: true,
              },
            },
          },
        }),
        this.prisma.challenges.count({ where }),
        this.prisma.externalConnection.findMany({
          where: { user_id: userId, is_active: true },
          select: { provider: true },
        }),
        this.prisma.challengeParticipation.findMany({
          where: {
            user_id: userId,
            status: ParticipationStatus.COMPLETED,
            challenge: {
              path: ChallengePath.ELITE_ATHLETE,
            },
          },
          select: {
            challenge: {
              select: {
                difficulty: true,
              },
            },
          },
        }),
      ]);

    const connectedProviders = new Set(
      activeConnections.map((c) => c.provider as FitnessProvider),
    );

    const completedByDifficulty = completedEliteAttempts.reduce(
      (acc, row) => {
        const difficulty = row.challenge?.difficulty;
        if (!difficulty) return acc;
        acc[difficulty] = Number(acc[difficulty] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const items = challenges.map((challenge) => {
      const userParticipation = challenge.participations?.[0] || null;
      const topFinisher = challenge.leaderboard?.[0] || null;

      const requiredConnection = challenge.require_device_connection;
      const hasConnection = connectedProviders.size > 0;
      const lockState = this.resolveEliteLockState(
        challenge,
        completedByDifficulty,
      );

      return this.formatChallengeCard({
        challenge,
        userParticipation,
        topFinisher,
        conversation: this.normalizeConversation(challenge.conversation),
        hasConnection,
        lockState,
      });
    });

    return {
      success: true,
      message: 'User challenge feed fetched successfully',
      data: {
        path: query.path,
        group: this.groupLabelForPath(query.path),
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getUserChallengeDetail(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
      include: {
        pathConfig: true,
        conversation: {
          include: {
            memberships: {
              select: { userId: true },
            },
          },
        },
        metrics: { orderBy: { sequence: 'asc' } },
        checkpoints: { orderBy: { sequence: 'asc' } },
        participations: {
          where: { user_id: userId },
          include: {
            checkpointProgress: {
              include: {
                checkpoint: true,
              },
              orderBy: { checkpoint: { sequence: 'asc' } },
            },
          },
          take: 1,
        },
        _count: {
          select: {
            participations: true,
            leaderboard: true,
          },
        },
      },
    });

    if (!challenge || challenge.deleted_at) {
      throw new BadRequestException('Challenge not found');
    }

    const [connectionCount, legacyConversation, completedEliteAttempts] =
      await Promise.all([
        this.prisma.externalConnection.count({
          where: { user_id: userId, is_active: true },
        }),
        this.prisma.conversation.findFirst({
          where: {
            type: ConversationType.GROUP,
            OR: [
              { title: { endsWith: `[${challengeId}]` } },
              { title: challenge.title },
            ],
          },
          select: {
            id: true,
            title: true,
            type: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
        }),
        this.prisma.challengeParticipation.findMany({
          where: {
            user_id: userId,
            status: ParticipationStatus.COMPLETED,
            challenge: {
              path: ChallengePath.ELITE_ATHLETE,
            },
          },
          select: {
            challenge: {
              select: {
                difficulty: true,
              },
            },
          },
        }),
      ]);

    const completedByDifficulty = completedEliteAttempts.reduce(
      (acc, row) => {
        const difficulty = row.challenge?.difficulty;
        if (!difficulty) return acc;
        acc[difficulty] = Number(acc[difficulty] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const lockState = this.resolveEliteLockState(
      challenge,
      completedByDifficulty,
    );

    const participation = challenge.participations?.[0] || null;
    const conversation = this.normalizeConversation(
      challenge.conversation || legacyConversation || null,
    );

    return {
      success: true,
      message: 'Challenge detail fetched successfully',
      data: {
        id: challenge.id,
        title: challenge.title,
        subtitle: challenge.subtitle,
        description: challenge.description,
        path: challenge.path,
        category: challenge.category,
        difficulty: challenge.difficulty,
        country: challenge.challenge_country,
        participants: challenge._count.participations,
        finishers: challenge._count.leaderboard,
        reward: {
          title: challenge.reward_title,
          description: challenge.reward_description,
        },
        metrics: challenge.metrics.map((m) => ({
          type: m.metric_type,
          sequence: m.sequence,
          target: Number(m.target_value),
          minThreshold:
            m.min_threshold !== null && m.min_threshold !== undefined
              ? Number(m.min_threshold)
              : null,
          isRequired: m.is_required,
        })),
        checkpoints: challenge.checkpoints.map((c) => ({
          id: c.id,
          sequence: c.sequence,
          title: c.title,
          description: c.description,
          metricTargets: c.metric_targets,
          rewardTitle: c.reward_title,
          isVisible: c.is_visible,
          isRequired: c.is_required,
          unlockAfterCheckpointSeq: c.unlock_after_checkpoint_seq,
        })),
        userProgress: participation
          ? {
              status: participation.status,
              progressPercent: Number(participation.progress_percent || 0),
              activeCheckpointSeq: participation.active_checkpoint_seq,
              metricValues: participation.metric_values,
              checkpointProgress: participation.checkpointProgress.map(
                (cp) => ({
                  checkpointId: cp.checkpoint_id,
                  sequence: cp.checkpoint.sequence,
                  title: cp.checkpoint.title,
                  status: cp.status,
                  metricValues: cp.metric_values,
                }),
              ),
            }
          : null,
        actions: {
          chat: {
            enabled: challenge.enable_chat,
            conversationId: conversation?.id || null,
          },
          leaderboard: {
            enabled: true,
            endpoint: `/challenges/${challenge.id}/leaderboard`,
          },
          attempt: {
            enabled: true,
            requiresConnection: challenge.require_device_connection,
            hasConnection: connectionCount > 0,
            isLocked: lockState.isLocked,
            canAttempt:
              !lockState.isLocked &&
              (!challenge.require_device_connection || connectionCount > 0),
          },
        },
        lock: lockState,
        conversation,
      },
    };
  }

  async getChallengeLeaderboard(
    userId: string,
    challengeId: string,
    limit = 50,
  ) {
    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
      select: { id: true, title: true, status: true, deleted_at: true },
    });

    if (!challenge || challenge.deleted_at) {
      throw new BadRequestException('Challenge not found');
    }

    const rows = await this.prisma.challengeLeaderboard.findMany({
      where: { challenge_id: challengeId },
      orderBy: [{ rank: 'asc' }, { progress_percent: 'desc' }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            age: true,
            country: true,
            flag: true,
            avatar: true,
          },
        },
      },
    });

    const myRank = rows.find((r) => r.user_id === userId) || null;

    return {
      success: true,
      message: 'Challenge leaderboard fetched successfully',
      data: {
        challenge: {
          id: challenge.id,
          title: challenge.title,
          status: challenge.status,
        },
        myRank: myRank
          ? {
              rank: myRank.rank,
              progressPercent: Number(myRank.progress_percent || 0),
              finishTimeSec: myRank.finish_time_sec,
            }
          : null,
        rows: rows.map((r) => ({
          userId: r.user_id,
          rank: r.rank,
          progressPercent: Number(r.progress_percent || 0),
          finishTimeSec: r.finish_time_sec,
          finishedAt: r.finished_at,
          user: {
            name: r.user.name,
            age: r.user.age,
            country: r.user.country,
            flag: r.user.flag,
            avatar: r.user.avatar,
          },
        })),
      },
    };
  }

  async submitCommunityChallenge(
    userId: string,
    createChallengeDto: CreateCommunityChallengeDto,
  ) {
    this.validateCreateCommunityPayload(createChallengeDto);

    const challenge = await this.prisma.$transaction(async (tx) => {
      const created = await tx.challenges.create({
        data: {
          title: createChallengeDto.title,
          subtitle: createChallengeDto.subtitle,
          description: createChallengeDto.description,
          path: ChallengePath.COMMUNITY_CHALLENGE,
          category: createChallengeDto.category,
          difficulty: createChallengeDto.difficulty,
          status: ChallengeStatus.PENDING,
          require_device_connection:
            createChallengeDto.require_device_connection ?? false,
          allow_manual_submission:
            createChallengeDto.allow_manual_submission ?? true,
          enable_chat: createChallengeDto.enable_chat ?? true,
          is_active: false,
          is_featured: false,
          max_participants: createChallengeDto.max_participants,
          reward_title: createChallengeDto.reward_title,
          reward_description: createChallengeDto.reward_description,
          created_by: userId,
        },
      });

      await tx.challengePathConfig.create({
        data: {
          challenge_id: created.id,
          config_data: {},
        },
      });

      if (createChallengeDto.metrics?.length) {
        await tx.challengeMetric.createMany({
          data: createChallengeDto.metrics.map((metric) => ({
            challenge_id: created.id,
            metric_type: metric.metric_type as MetricType,
            sequence: metric.sequence,
            target_value: metric.target_value,
            min_threshold: metric.min_threshold,
            is_required: metric.is_required,
          })),
        });
      }

      if (createChallengeDto.checkpoints?.length) {
        await tx.challengeCheckpoint.createMany({
          data: createChallengeDto.checkpoints.map((checkpoint) => ({
            challenge_id: created.id,
            sequence: checkpoint.sequence,
            title: checkpoint.title,
            description: checkpoint.description,
            metric_targets: checkpoint.metric_targets,
            reward_title: checkpoint.reward_title,
            reward_description: checkpoint.reward_description,
            reward_image: checkpoint.reward_image,
            is_visible: checkpoint.is_visible,
            is_required: checkpoint.is_required,
            unlock_after_checkpoint_seq: checkpoint.unlock_after_checkpoint_seq,
            strava_segment_id: checkpoint.strava_segment_id,
          })),
        });
      }

      return tx.challenges.findUnique({
        where: { id: created.id },
        include: {
          pathConfig: true,
          metrics: { orderBy: { sequence: 'asc' } },
          checkpoints: { orderBy: { sequence: 'asc' } },
        },
      });
    });

    // Notify submitter
    await this.createChallengeNotification(
      userId,
      `Your community challenge "${challenge?.title}" was submitted and is waiting for admin approval.`,
      undefined,
      challenge?.id,
    );

    // Notify admins (broadcast by receiver_id = null)
    await this.createChallengeNotification(
      undefined,
      `A new community challenge "${challenge?.title}" was submitted and requires review.`,
      userId,
      challenge?.id,
    );

    return {
      success: true,
      message:
        'Community challenge submitted successfully. It is pending admin approval.',
      data: {
        challenge,
      },
    };
  }

  async joinChallenge(userId: string, challengeId: string, joinDto: any) {
    // Fetch challenge
    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
      include: {
        pathConfig: true,
        conversation: {
          include: {
            memberships: {
              select: { userId: true },
            },
          },
        },
        participations: {
          where: { user_id: userId },
          select: { id: true, status: true },
        },
      },
    });

    if (!challenge || challenge.deleted_at) {
      throw new BadRequestException('Challenge not found or has been deleted');
    }

    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new BadRequestException(
        `Challenge is not active (status: ${challenge.status})`,
      );
    }

    // Check Strava connection requirement/status.
    // This is challenge-level, so it works across all challenge paths.
    const userConnections = await this.prisma.externalConnection.findMany({
      where: { user_id: userId, is_active: true },
      select: { id: true, provider: true },
    });
    const stravaConnection = userConnections.find(
      (c) => c.provider === FitnessProvider.STRAVA,
    );

    const selectedConnectionId =
      joinDto?.externalConnectionId &&
      userConnections.some((c) => c.id === joinDto.externalConnectionId)
        ? joinDto.externalConnectionId
        : stravaConnection?.id || null;

    const selectedConnection = selectedConnectionId
      ? userConnections.find((c) => c.id === selectedConnectionId) || null
      : null;

    const stravaRequired = Boolean(challenge.require_device_connection);

    // Create or update participation record
    let participation;
    if (challenge.participations.length > 0) {
      // User already joined before, reset their status to JOINED (re-join)
      participation = await this.prisma.challengeParticipation.update({
        where: { id: challenge.participations[0].id },
        data: {
          status: ParticipationStatus.JOINED,
          external_connection_id: selectedConnectionId,
          source_provider: selectedConnection
            ? FitnessProvider.STRAVA
            : FitnessProvider.MANUAL,
          joined_at: new Date(),
        },
      });
    } else {
      // New join
      participation = await this.prisma.challengeParticipation.create({
        data: {
          user_id: userId,
          challenge_id: challengeId,
          status: ParticipationStatus.JOINED,
          external_connection_id: selectedConnectionId,
          source_provider: selectedConnection
            ? FitnessProvider.STRAVA
            : FitnessProvider.MANUAL,
        },
      });
    }

    // Prefer the stored relation on the challenge record.
    let conversation = challenge.conversation || null;

    // Legacy fallback for older rooms created before the title was stable.
    if (!conversation && challenge.title) {
      const legacyCandidates = await this.prisma.conversation.findMany({
        where: {
          type: ConversationType.GROUP,
          title: challenge.title,
          ...(challenge.created_by ? { createdBy: challenge.created_by } : {}),
        },
        include: {
          memberships: {
            select: { userId: true },
          },
        },
      });

      if (legacyCandidates.length) {
        const targetTime = new Date(challenge.created_at).getTime();
        conversation = legacyCandidates.reduce((closest, current) => {
          const closestDiff = Math.abs(
            new Date(closest.createdAt).getTime() - targetTime,
          );
          const currentDiff = Math.abs(
            new Date(current.createdAt).getTime() - targetTime,
          );
          return currentDiff < closestDiff ? current : closest;
        });
      }
    }

    // Add user to conversation if it exists and user is not already a member
    if (conversation) {
      const isMember = conversation.memberships.some(
        (m) => m.userId === userId,
      );
      if (!isMember) {
        await this.prisma.membership.create({
          data: {
            conversationId: conversation.id,
            userId,
            role: 'MEMBER',
            lastReadAt: new Date(),
          },
        });
      }
    }

    await this.createChallengeNotification(
      userId,
      stravaRequired && !selectedConnection
        ? `You joined "${challenge.title}", but you need to connect Strava before you can start.`
        : `You joined the challenge "${challenge.title}" successfully.`,
      undefined,
      challenge.id,
    );

    return {
      id: participation.id,
      challengeId: participation.challenge_id,
      userId: participation.user_id,
      status: participation.status,
      joinedAt: participation.joined_at,
      conversation: conversation
        ? {
            id: conversation.id,
            title: conversation.title,
            type: conversation.type,
            membersCount: conversation.memberships?.length || 0,
          }
        : null,
      strava: {
        connected: !!selectedConnection,
        required: stravaRequired,
        connectionUrl:
          stravaRequired && !selectedConnection
            ? `${process.env.APP_FRONTEND_URL || 'https://yourapp.com'}/auth/strava`
            : undefined,
        externalConnectionId: selectedConnection?.id,
      },
      canStart: !stravaRequired || !!selectedConnection,
      message:
        stravaRequired && !selectedConnection
          ? 'Elite challenges require Strava connection. Please connect your Strava account to start.'
          : 'Successfully joined the challenge. You can now start if all requirements are met.',
    };
  }

  async leaveChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
      include: {
        conversation: {
          include: {
            memberships: {
              select: { userId: true },
            },
          },
        },
        participations: {
          where: { user_id: userId },
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!challenge || challenge.deleted_at) {
      throw new BadRequestException('Challenge not found or has been deleted');
    }

    const participation = challenge.participations?.[0] || null;
    if (!participation) {
      throw new ConflictException('You have not joined this challenge yet');
    }

    if (participation.status === ParticipationStatus.COMPLETED) {
      throw new BadRequestException('Completed challenges cannot be left');
    }

    const conversation = challenge.conversation || null;
    const leftAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.challengeParticipation.updateMany({
        where: {
          user_id: userId,
          challenge_id: challengeId,
        },
        data: {
          status: ParticipationStatus.ABANDONED,
          last_activity_at: leftAt,
        },
      });

      if (conversation) {
        await tx.membership.deleteMany({
          where: {
            conversationId: conversation.id,
            userId,
          },
        });
      }
    });

    await this.createChallengeNotification(
      userId,
      `You left the challenge "${challenge.title}".`,
      undefined,
      challenge.id,
    );

    return {
      challengeId,
      userId,
      status: ParticipationStatus.ABANDONED,
      leftAt,
      conversation: conversation
        ? {
            id: conversation.id,
            title: challenge.title,
            type: conversation.type,
            membersCount: conversation.memberships?.length || 0,
          }
        : null,
      message: 'You have left the challenge successfully',
    };
  }

  async getUserChallengeHistory(userId: string, query: UserChallengesQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const skip = (page - 1) * limit;

    const where: any = {
      user_id: userId,
    };
    console.log('getUserChallengeHistory - where:', where);

    const [participations, total] = await Promise.all([
      this.prisma.challengeParticipation.findMany({
        where,
        orderBy: { completed_at: 'desc' },
        skip,
        take: limit,
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              path: true,
              category: true,
              difficulty: true,
              challenge_country: true,
              subtitle: true,
              description: true,
              status: true,
              created_at: true,
              updated_at: true,
            },
          },
          checkpointProgress: {
            include: {
              checkpoint: true,
            },
            orderBy: { checkpoint: { sequence: 'asc' } },
          },
        },
      }),
      this.prisma.challengeParticipation.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'User challenge history fetched successfully',
      data: {
        items: participations,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  }
}
