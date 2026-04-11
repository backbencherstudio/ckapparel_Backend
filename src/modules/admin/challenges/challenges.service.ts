import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ChallengeDifficulty,
  ChallengePath,
  ChallengeStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMonthlyChallengeDto } from './dto/create-monthly-challenge.dto';
import { CreateVirtualAdventureChallengeDto } from './dto/create-virtual-adventure-challenge.dto';
import { CreateEliteChallengeDto } from './dto/create-elite-challenge.dto';
import { CreateChallengeBaseDto } from './dto/create-challenge-base.dto';
import { CreateCommunityChallengeDto } from './dto/create-community-challenge.dto';
import { sub } from 'date-fns';
import { ApiOperation } from '@nestjs/swagger';
import { ConversationsService } from 'src/modules/chat/conversations/conversations.service';
import { SazedStorage } from 'src/common/lib/Disk/SazedStorage';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

export interface GetChallengesAdminParams {
  path?: ChallengePath;
  category?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
  ) {}

  private async createAdminChallengeNotification(
    receiverId: string | undefined,
    text: string,
    senderId?: string,
    challengeId?: string,
  ) {
    try {
      await NotificationRepository.createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        type: 'challenge',
        text,
        entity_id: challengeId,
      });
    } catch (error) {
      console.error('Failed to create admin challenge notification:', error);
    }
  }

  private async createChallengeConversation(
    challenge: { id: string; title: string },
    createdByUserId?: string,
  ) {
    if (!createdByUserId) return null;

    // Include admin users by user.type and role-based admin assignment.
    const adminUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { type: { in: ['ADMIN', 'admin', 'su_admin', 'SU_ADMIN'] } },
          {
            role_users: {
              some: {
                role: {
                  OR: [
                    { name: { equals: 'admin', mode: 'insensitive' } },
                    { title: { equals: 'admin', mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    const adminIds = Array.from(new Set(adminUsers.map((u) => u.id)));

    const conversation = await this.conversationsService.createGroup(
      createdByUserId,
      challenge.title,
      adminIds,
    );

    return {
      id: conversation.id,
      title: conversation.title,
      type: conversation.type,
      membersCount: conversation.memberships?.length || 0,
    };
  }

  private readonly eliteDifficultyLockMap: Record<
    ChallengeDifficulty,
    { required_difficulty: ChallengeDifficulty; required_count: number } | null
  > = {
    [ChallengeDifficulty.EASY]: null,
    [ChallengeDifficulty.MEDIUM]: {
      required_difficulty: ChallengeDifficulty.EASY,
      required_count: 3,
    },
    [ChallengeDifficulty.HARD]: {
      required_difficulty: ChallengeDifficulty.MEDIUM,
      required_count: 5,
    },
    [ChallengeDifficulty.CHALLENGING]: {
      required_difficulty: ChallengeDifficulty.HARD,
      required_count: 7,
    },
    [ChallengeDifficulty.EXPERT]: {
      required_difficulty: ChallengeDifficulty.CHALLENGING,
      required_count: 10,
    },
    [ChallengeDifficulty.EXTREME]: {
      required_difficulty: ChallengeDifficulty.EXPERT,
      required_count: 10,
    },
  };

  async createMonthlyChallenge(
    createChallengeDto: CreateMonthlyChallengeDto,
    userId?: string,
  ) {
    if (
      createChallengeDto.checkpoints &&
      createChallengeDto.checkpoints.length > 0
    ) {
      throw new BadRequestException(
        'Monthly challenges cannot have checkpoints.',
      );
    }
    if (createChallengeDto.monthly_config.challenge_kind === 'main_event') {
      return this.createMonthlyMainEventChallenge(createChallengeDto, userId);
    }
    return this.createMonthlyBenchmarkChallenge(createChallengeDto, userId);
  }

  private async createMonthlyMainEventChallenge(
    createChallengeDto: CreateMonthlyChallengeDto,
    userId?: string,
  ) {
    const monthName = this.extractRequiredMetadataString(
      createChallengeDto.monthly_config.metadata,
      'month_name',
    );

    await this.ensureNoDuplicateMainEventForMonth(
      createChallengeDto.category,
      monthName,
    );

    return this.createByPath(
      ChallengePath.MONTHLY_CHALLENGE,
      {
        ...createChallengeDto,
        is_featured: true,
      },
      {
        challenge_kind: 'main_event',
        monthly_reset: true,
        metadata: {
          ...(createChallengeDto.monthly_config.metadata ?? {}),
          month_name: monthName,
        },
      },
      userId,
    );
  }

  private async createMonthlyBenchmarkChallenge(
    createChallengeDto: CreateMonthlyChallengeDto,
    userId?: string,
  ) {
    const benchmarkGroup = this.extractRequiredMetadataString(
      createChallengeDto.monthly_config.metadata,
      'benchmark_group',
    );

    return this.createByPath(
      ChallengePath.MONTHLY_CHALLENGE,
      {
        ...createChallengeDto,
        is_featured: false,
      },
      {
        challenge_kind: 'benchmark',
        monthly_reset: createChallengeDto.monthly_config.monthly_reset,
        metadata: {
          ...(createChallengeDto.monthly_config.metadata ?? {}),
          benchmark_group: benchmarkGroup,
        },
      },
      userId,
    );
  }

  private extractRequiredMetadataString(
    metadata: Record<string, any> | undefined,
    key: string,
  ): string {
    const value = metadata?.[key];

    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(
        `monthly_config.metadata.${key} is required`,
      );
    }

    return value.trim();
  }

  private async ensureNoDuplicateMainEventForMonth(
    category: CreateMonthlyChallengeDto['category'],
    monthName: string,
  ) {
    const existingMainEvent = await this.prisma.challenges.findFirst({
      where: {
        deleted_at: null,
        path: ChallengePath.MONTHLY_CHALLENGE,
        category,
        pathConfig: {
          is: {
            AND: [
              {
                config_data: {
                  path: ['challenge_kind'],
                  equals: 'main_event',
                },
              },
              {
                config_data: {
                  path: ['metadata', 'month_name'],
                  equals: monthName,
                },
              },
            ],
          },
        },
      },
      select: { id: true },
    });

    if (existingMainEvent) {
      throw new BadRequestException(
        `A monthly main_event already exists for ${monthName} in this category`,
      );
    }
  }

  /**
   * Resets all user progress for monthly challenges with monthly_reset: true.
   * Should be called at the start of each month (e.g. via scheduler).
   */
  async resetMonthlyChallengesProgress() {
    const monthlyChallenges = await this.prisma.challenges.findMany({
      where: {
        deleted_at: null,
        path: ChallengePath.MONTHLY_CHALLENGE,
        pathConfig: {
          is: {
            config_data: {
              path: ['monthly_reset'],
              equals: true,
            },
          },
        },
      },
      select: { id: true },
    });

    if (!monthlyChallenges.length) return { reset: 0 };

    // Reset participations and completions for these challenges
    const challengeIds = monthlyChallenges.map((c) => c.id);

    // Delete participations
    const deletedParticipations =
      await this.prisma.challengeParticipation.deleteMany({
        where: {
          challenge_id: { in: challengeIds },
        },
      });

    // Reset leaderboard and journey logs in a transaction
    const [deletedLeaderboards, deletedJourneyLogs] =
      await this.prisma.$transaction([
        this.prisma.challengeLeaderboard.deleteMany({
          where: {
            challenge_id: { in: challengeIds },
          },
        }),
        this.prisma.challengeJourneyLog.deleteMany({
          where: {
            challenge_id: { in: challengeIds },
          },
        }),
      ]);

    return {
      resetChallenges: challengeIds.length,
      participationsDeleted: deletedParticipations.count,
      leaderboardEntriesDeleted: deletedLeaderboards.count,
      journeyLogsDeleted: deletedJourneyLogs.count,
    };
  }

  async createVirtualAdventureChallenge(
    createChallengeDto: CreateVirtualAdventureChallengeDto,
    userId?: string,
  ) {
    // Validation: require at least one checkpoint
    if (
      !createChallengeDto.checkpoints ||
      createChallengeDto.checkpoints.length === 0
    ) {
      throw new BadRequestException(
        'At least one checkpoint is required for virtual adventure challenges',
      );
    }
    // Validation: require virtual_config with required fields
    const cfg = createChallengeDto.virtual_config;
    if (
      !cfg ||
      !cfg.route_name ||
      !cfg.route_distance_km ||
      cfg.require_gps === undefined ||
      cfg.enable_journey_log === undefined
    ) {
      throw new BadRequestException(
        'virtual_config is missing required fields',
      );
    }
    // (Optional) Validate that the last checkpoint distance matches route_distance_km
    const lastCheckpoint =
      createChallengeDto.checkpoints[createChallengeDto.checkpoints.length - 1];
    if (
      lastCheckpoint &&
      lastCheckpoint.metric_targets &&
      lastCheckpoint.metric_targets.DISTANCE_KM
    ) {
      if (lastCheckpoint.metric_targets.DISTANCE_KM !== cfg.route_distance_km) {
        throw new BadRequestException(
          'Last checkpoint distance must match route_distance_km',
        );
      }
    }
    return this.createByPath(
      ChallengePath.VIRTUAL_ADVENTURE,
      createChallengeDto,
      createChallengeDto.virtual_config,
      userId,
    );
  }

  async createEliteChallenge(
    createChallengeDto: CreateEliteChallengeDto,
    userId?: string,
  ) {
    const lockConfig =
      this.eliteDifficultyLockMap[createChallengeDto.difficulty];

    return this.createByPath(
      ChallengePath.ELITE_ATHLETE,
      createChallengeDto,
      { lock_config: lockConfig },
      userId,
    );
  }

  async createCommunityChallenge(
    createChallengeDto: CreateCommunityChallengeDto,
    userId?: string,
  ) {
    return this.createByPath(
      ChallengePath.COMMUNITY_CHALLENGE,
      createChallengeDto,
      {},
      userId,
    );
  }

  private async createByPath(
    path: ChallengePath,
    createChallengeDto: CreateChallengeBaseDto,
    pathConfigData: Record<string, any>,
    userId?: string,
  ) {
    try {
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
          createChallengeDto.checkpoints.map(
            (checkpoint) => checkpoint.sequence,
          ),
        );
        if (
          checkpointSequenceSet.size !== createChallengeDto.checkpoints.length
        ) {
          throw new BadRequestException(
            'Duplicate sequence is not allowed in checkpoints',
          );
        }
      }

      const createdChallenge = await this.prisma.$transaction(async (tx) => {
        const challenge = await tx.challenges.create({
          data: {
            title: createChallengeDto.title,
            subtitle: createChallengeDto.subtitle,
            description: createChallengeDto.description,
            path,
            category: createChallengeDto.category,
            difficulty: createChallengeDto.difficulty,
            require_device_connection:
              createChallengeDto.require_device_connection,
            allow_manual_submission: createChallengeDto.allow_manual_submission,
            enable_chat: createChallengeDto.enable_chat,
            is_active: createChallengeDto.is_active,
            is_featured: createChallengeDto.is_featured,
            max_participants: createChallengeDto.max_participants,
            reward_title: createChallengeDto.reward_title,
            reward_description: createChallengeDto.reward_description,
            created_by: userId ?? undefined,
          },
        });

        await tx.challengePathConfig.create({
          data: {
            challenge_id: challenge.id,
            config_data: pathConfigData,
          },
        });

        if (createChallengeDto.metrics?.length) {
          await tx.challengeMetric.createMany({
            data: createChallengeDto.metrics.map((metric) => ({
              challenge_id: challenge.id,
              metric_type: metric.metric_type,
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
              challenge_id: challenge.id,
              sequence: checkpoint.sequence,
              title: checkpoint.title,
              description: checkpoint.description,
              metric_targets: checkpoint.metric_targets,
              reward_title: checkpoint.reward_title,
              reward_description: checkpoint.reward_description,
              reward_image: checkpoint.reward_image,
              is_visible: checkpoint.is_visible,
              is_required: checkpoint.is_required,
              unlock_after_checkpoint_seq:
                checkpoint.unlock_after_checkpoint_seq,
              strava_segment_id: checkpoint.strava_segment_id,
            })),
          });
        }

        return tx.challenges.findUnique({
          where: { id: challenge.id },
          include: {
            pathConfig: true,
            metrics: {
              orderBy: { sequence: 'asc' },
            },
            checkpoints: {
              orderBy: { sequence: 'asc' },
            },
          },
        });
      });

      let challengeConversation: any = null;
      if (createdChallenge && createChallengeDto.enable_chat !== false) {
        try {
          challengeConversation = await this.createChallengeConversation(
            {
              id: createdChallenge.id,
              title: createdChallenge.title,
            },
            userId,
          );

          if (challengeConversation?.id) {
            await this.prisma.challenges.update({
              where: { id: createdChallenge.id },
              data: { conversationId: challengeConversation.id },
            });
          }
        } catch (conversationError) {
          challengeConversation = {
            error: true,
            message: conversationError.message,
          };
        }
      }

      if (createdChallenge?.created_by) {
        await this.createAdminChallengeNotification(
          createdChallenge.created_by,
          `Challenge "${createdChallenge.title}" has been created successfully.`,
          userId,
          createdChallenge.id,
        );
      }

      return {
        success: true,
        message: 'Challenge created successfully',
        data: {
          challenge: createdChallenge,
          conversation: challengeConversation,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getChallengesAdmin(params: GetChallengesAdminParams, userId: string) {
    let {
      path,
      category,
      difficulty,
      status,
      search,
      page = 1,
      limit = 20,
    } = params;
    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { type: true, name: true, country: true, avatar: true },
    });
    if (!user || (user.type !== 'su_admin' && user.type !== 'ADMIN')) {
      throw new BadRequestException('Unauthorized');
    }

    const where: any = {};
    if (path) where.path = path;
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.challenges.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          metrics: true,
          checkpoints: true,
          participations: true,
          pathConfig: true,
          creator: true,
        },
      }),
      this.prisma.challenges.count({ where }),
    ]);

    let result;
    if (path === 'MONTHLY_CHALLENGE') {
      result = items.map((c) => {
        let challengeKind = '';
        if (c.pathConfig?.config_data) {
          let config = c.pathConfig.config_data;
          if (typeof config === 'string') {
            try {
              config = JSON.parse(config);
            } catch {
              config = {};
            }
          }
          if (
            typeof config === 'object' &&
            config !== null &&
            'challenge_kind' in config
          ) {
            challengeKind = (config as any).challenge_kind || '';
          }
        }
        return {
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          challenge_kind: challengeKind,
          category: c.category,
          difficulty: c.difficulty,
          participants: c.participants_joined,
          reward: c.reward_title,
          status: c.status,
          actions: { edit: c.id, delete: c.id },
        };
      });
    } else if (path === 'VIRTUAL_ADVENTURE') {
      // Virtual: country, distance, checkpoints, active athletes
      result = items.map((c) => {
        const totalDistance =
          c.metrics.find((m) => m.metric_type === 'DISTANCE_KM')
            ?.target_value || '';
        return {
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          country: c.challenge_country || '',
          totalDistance: totalDistance ? `${totalDistance}km` : '',
          checkpoints: c.checkpoints.length,
          activeAthletes: c.participants_joined,
          actions: { edit: c.id, delete: c.id },
        };
      });
    } else if (path === 'COMMUNITY_CHALLENGE') {
      // Community: createdBy, join/submitted
      result = items.map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        createdBy:
          c.creator?.type == 'ADMIN' || c.creator?.type == 'su_admin'
            ? 'Admin'
            : { name: c.creator?.name, avatar: c.creator?.avatar },
        category: c.category,
        difficulty: c.difficulty,
        join: c.participants_joined,
        status: c.status,
        submitted: c.created_at < sub(new Date(), { days: 7 }), // Example logic: consider "submitted" if created more than 7 days ago
        actions: { edit: c.id, delete: c.id },
      }));
    } else {
      // All: default admin list
      result = items.map((c) => ({
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        category: c.category,
        difficulty: c.difficulty,
        participants: c.participants_joined,
        createdBy:
          c.creator?.type == 'ADMIN' || c.creator?.type == 'su_admin'
            ? 'Admin'
            : { name: c.creator?.name, avatar: c.creator?.avatar },
        status: c.status,
        actions: { edit: c.id, delete: c.id },
      }));
    }
    return {
      total,
      page,
      limit,
      items: result,
    };
  }

  async getSingleChallenge(challengeId: string) {
    const challenge = await this.prisma.challenges.findUnique({
      where: { id: challengeId },
      include: {
        metrics: true,
        checkpoints: true,
        participations: true,
        pathConfig: true,
        creator: true,
      },
    });
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    return challenge;
  }

  async deleteChallenge(challengeId: string) {
    try {
      // Check if challenge exists first
      const existing = await this.prisma.challenges.findUnique({
        where: { id: challengeId },
        select: {
          id: true,
          title: true,
          created_by: true,
        },
      });
      if (!existing) {
        return {
          success: false,
          message: 'Challenge not found',
        };
      }
      const deletedChallenge = await this.prisma.$transaction(async (tx) => {
        // Delete related data first to maintain referential integrity
        await tx.challengeMetric.deleteMany({
          where: { challenge_id: challengeId },
        });
        await tx.challengeCheckpoint.deleteMany({
          where: { challenge_id: challengeId },
        });
        await tx.challengeParticipation.deleteMany({
          where: { challenge_id: challengeId },
        });
        await tx.challengeLeaderboard.deleteMany({
          where: { challenge_id: challengeId },
        });
        await tx.challengeJourneyLog.deleteMany({
          where: { challenge_id: challengeId },
        });
        await tx.challengePathConfig.deleteMany({
          where: { challenge_id: challengeId },
        });
        // Finally, delete the challenge itself
        return await tx.challenges.delete({
          where: { id: challengeId },
        });
      });

      if (existing.created_by) {
        await this.createAdminChallengeNotification(
          existing.created_by,
          `Challenge "${existing.title}" has been deleted by admin.`,
          undefined,
          existing.id,
        );
      }

      return {
        success: true,
        message: 'Challenge and related data deleted successfully',
        data: deletedChallenge,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateChallenge(
    challengeId: string,
    updateData: Partial<CreateChallengeBaseDto>,
  ) {
    try {
      const existing = await this.prisma.challenges.findUnique({
        where: { id: challengeId },
        include: {
          metrics: true,
          checkpoints: true,
          pathConfig: true,
        },
      });
      if (!existing) {
        return {
          success: false,
          message: 'Challenge not found',
        };
      }

      // Start transaction for updating challenge and related entities
      const updatedChallenge = await this.prisma.$transaction(async (tx) => {
        // 1. Update main challenge fields
        await tx.challenges.update({
          where: { id: challengeId },
          data: {
            title: updateData.title ?? existing.title,
            subtitle: updateData.subtitle ?? existing.subtitle,
            description: updateData.description ?? existing.description,
            category: updateData.category ?? existing.category,
            difficulty: updateData.difficulty ?? existing.difficulty,
            require_device_connection:
              updateData.require_device_connection ??
              existing.require_device_connection,
            allow_manual_submission:
              updateData.allow_manual_submission ??
              existing.allow_manual_submission,
            enable_chat: updateData.enable_chat ?? existing.enable_chat,
            is_active: updateData.is_active ?? existing.is_active,
            is_featured: updateData.is_featured ?? existing.is_featured,
            max_participants:
              updateData.max_participants ?? existing.max_participants,
            reward_title: updateData.reward_title ?? existing.reward_title,
            reward_description:
              updateData.reward_description ?? existing.reward_description,
          },
        });

        // 2. Update pathConfig if present
        if (updateData['monthly_config'] || updateData['virtual_config']) {
          // For monthly/virtual, update config_data
          let configData = null;
          if (updateData['monthly_config']) {
            configData = updateData['monthly_config'];
          } else if (updateData['virtual_config']) {
            configData = updateData['virtual_config'];
          }
          if (configData && existing.pathConfig) {
            await tx.challengePathConfig.update({
              where: { id: existing.pathConfig.id },
              data: { config_data: configData },
            });
          }
        }

        // 3. Update metrics if present
        if (updateData.metrics) {
          // Remove old metrics
          await tx.challengeMetric.deleteMany({
            where: { challenge_id: challengeId },
          });
          // Add new metrics
          if (updateData.metrics.length > 0) {
            await tx.challengeMetric.createMany({
              data: updateData.metrics.map((metric) => ({
                challenge_id: challengeId,
                metric_type: metric.metric_type,
                sequence: metric.sequence,
                target_value: metric.target_value,
                min_threshold: metric.min_threshold,
                is_required: metric.is_required,
              })),
            });
          }
        }

        // 4. Update checkpoints if present
        if (updateData.checkpoints) {
          // Remove old checkpoints
          await tx.challengeCheckpoint.deleteMany({
            where: { challenge_id: challengeId },
          });
          // Add new checkpoints
          if (updateData.checkpoints.length > 0) {
            await tx.challengeCheckpoint.createMany({
              data: updateData.checkpoints.map((checkpoint) => ({
                challenge_id: challengeId,
                sequence: checkpoint.sequence,
                title: checkpoint.title,
                description: checkpoint.description,
                metric_targets: checkpoint.metric_targets,
                reward_title: checkpoint.reward_title,
                reward_description: checkpoint.reward_description,
                reward_image: checkpoint.reward_image,
                is_visible: checkpoint.is_visible,
                is_required: checkpoint.is_required,
                unlock_after_checkpoint_seq:
                  checkpoint.unlock_after_checkpoint_seq,
                strava_segment_id: checkpoint.strava_segment_id,
              })),
            });
          }
        }

        // Return the updated challenge with relations
        return await tx.challenges.findUnique({
          where: { id: challengeId },
          include: {
            pathConfig: true,
            metrics: { orderBy: { sequence: 'asc' } },
            checkpoints: { orderBy: { sequence: 'asc' } },
          },
        });
      });

      if (existing.created_by && updatedChallenge) {
        await this.createAdminChallengeNotification(
          existing.created_by,
          `Challenge "${updatedChallenge.title}" has been updated.`,
          undefined,
          updatedChallenge.id,
        );
      }

      return {
        success: true,
        message: 'Challenge updated successfully',
        data: updatedChallenge,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async reviewCommunitySubmission(
    challengeId: string,
    status: string,
    reviewedByUserId?: string,
  ) {
    try {
      const allowedStatuses = Object.values(ChallengeStatus);
      if (!allowedStatuses.includes(status as ChallengeStatus)) {
        throw new BadRequestException(
          `Invalid status. Accepted values: ${allowedStatuses.join(', ')}`,
        );
      }
      const existing = await this.prisma.challenges.findUnique({
        where: { id: challengeId },
      });
      if (!existing) {
        throw new Error('Challenge not found');
      }
      if (existing.path !== ChallengePath.COMMUNITY_CHALLENGE) {
        throw new Error('Not a community challenge');
      }

      const updatedChallenge = await this.prisma.challenges.update({
        where: { id: challengeId },
        data: {
          status: status as ChallengeStatus,
          is_active:
            status === ChallengeStatus.ACTIVE
              ? true
              : status === ChallengeStatus.REJECTED
                ? false
                : existing.is_active,

          require_device_connection:
            status === ChallengeStatus.REJECTED
              ? false
              : existing.require_device_connection, // Remove device requirement if rejected

          allow_manual_submission:
            status === ChallengeStatus.REJECTED
              ? true
              : existing.allow_manual_submission, // Allow manual submission if rejected
          enable_chat:
            status === ChallengeStatus.REJECTED ? false : existing.enable_chat, // Disable chat if rejected
        },
      });

      if (updatedChallenge.created_by) {
        await this.createAdminChallengeNotification(
          updatedChallenge.created_by,
          status === ChallengeStatus.ACTIVE
            ? `Your community challenge "${updatedChallenge.title}" has been approved and is now active.`
            : status === ChallengeStatus.REJECTED
              ? `Your community challenge "${updatedChallenge.title}" has been rejected by admin.`
              : `Your community challenge "${updatedChallenge.title}" status has been updated to ${status}.`,
          reviewedByUserId,
          updatedChallenge.id,
        );
      }

      let challengeConversation: any = null;
      if (
        status === ChallengeStatus.ACTIVE &&
        updatedChallenge.enable_chat !== false &&
        !updatedChallenge.conversationId
      ) {
        try {
          const conversation = await this.createChallengeConversation(
            {
              id: updatedChallenge.id,
              title: updatedChallenge.title,
            },
            reviewedByUserId || updatedChallenge.created_by || undefined,
          );

          if (conversation?.id) {
            await this.prisma.challenges.update({
              where: { id: updatedChallenge.id },
              data: { conversationId: conversation.id },
            });
            challengeConversation = conversation;
          }
        } catch (conversationError) {
          challengeConversation = {
            error: true,
            message: conversationError.message,
          };
        }
      }

      return {
        success: true,
        message: `Challenge ${status} successfully`,
        data: {
          challenge: updatedChallenge,
          conversation: challengeConversation,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getRoutePlans(params?: {
    page?: number | string;
    limit?: number | string;
    challengeId?: string;
    search?: string;
  }) {
    try {
      const page = Math.max(1, Number(params?.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(params?.limit) || 20));
      const skip = (page - 1) * limit;

      const where: any = {};
      if (params?.challengeId) {
        where.challenge_id = params.challengeId;
      }

      if (params?.search?.trim()) {
        where.OR = [
          {
            challenge: {
              title: { contains: params.search.trim(), mode: 'insensitive' },
            },
          },
          {
            location: { contains: params.search.trim(), mode: 'insensitive' },
          },
          {
            about_challenge: {
              contains: params.search.trim(),
              mode: 'insensitive',
            },
          },
        ];
      }

      const [items, total] = await this.prisma.$transaction([
        this.prisma.routePlan.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                subtitle: true,
                category: true,
                difficulty: true,
              },
            },
            _count: {
              select: {
                routeDays: true,
              },
            },
          },
        }),
        this.prisma.routePlan.count({ where }),
      ]);

      return {
        success: true,
        message: 'Route plans fetched successfully',
        data: {
          total,
          page,
          limit,
          items,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getRoutePlanById(routePlanId: string) {
    try {
      const routePlan = await this.prisma.routePlan.findUnique({
        where: { id: routePlanId },
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              subtitle: true,
              category: true,
              difficulty: true,
              status: true,
            },
          },
          routeDays: {
            orderBy: { sequence: 'asc' },
          },
        },
      });

      if (!routePlan) {
        throw new NotFoundException('Route plan not found');
      }

      return {
        success: true,
        message: 'Route plan fetched successfully',
        data: routePlan,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async createRoutePlan(
    challengeId: string,
    routePlanData: any,
    bannerImage?: Express.Multer.File,
  ) {
    try {
      const existing = await this.prisma.challenges.findUnique({
        where: { id: challengeId },
      });
      if (!existing) {
        throw new NotFoundException('Challenge not found');
      }

      const existingRoute = await this.prisma.routePlan.findFirst({
        where: { challenge_id: challengeId },
      });
      if (existingRoute) {
        throw new Error('Route plan already exists for this challenge');
      }

      let bannerImageUrl = routePlanData.banner_image_url || undefined;
      if (bannerImage) {
        const safeName = (bannerImage.originalname || 'route-banner.jpg')
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '');
        const fileName = `route-plans/${Date.now()}-${safeName}`;
        await SazedStorage.put(fileName, bannerImage.buffer);
        bannerImageUrl = SazedStorage.url(fileName);
      }

      let dayPlans = routePlanData.day_plans ?? routePlanData.days_plan;
      if (typeof dayPlans === 'string') {
        const rawDayPlans = dayPlans.trim();
        if (!rawDayPlans) {
          dayPlans = [];
        } else {
          try {
            dayPlans = JSON.parse(rawDayPlans);
          } catch (_firstError) {
            try {
              dayPlans = JSON.parse(`[${rawDayPlans}]`);
            } catch (_secondError) {
              throw new BadRequestException(
                'day_plans must be a valid JSON array, object, or comma-separated object list when sent as string',
              );
            }
          }
        }
      }

      if (
        dayPlans &&
        !Array.isArray(dayPlans) &&
        typeof dayPlans === 'object'
      ) {
        const looksLikeSingleDay =
          'day_number' in dayPlans ||
          'title' in dayPlans ||
          'description' in dayPlans ||
          'distance' in dayPlans;

        if (looksLikeSingleDay) {
          dayPlans = [dayPlans];
        } else {
          const keyedEntries = Object.entries(dayPlans).sort(
            (a, b) => Number(a[0]) - Number(b[0]),
          );
          dayPlans = keyedEntries.map(([, value]) => value);
        }
      }

      if (dayPlans && !Array.isArray(dayPlans)) {
        throw new BadRequestException(
          'day_plans must be an array (or JSON string / keyed object)',
        );
      }

      if (Array.isArray(dayPlans)) {
        dayPlans = dayPlans
          .map((item: any, index: number) => {
            if (typeof item === 'string') {
              const trimmed = item.trim();
              if (!trimmed) return null;
              try {
                return JSON.parse(trimmed);
              } catch (_error) {
                throw new BadRequestException(
                  `day_plans[${index}] is an invalid JSON string`,
                );
              }
            }
            return item;
          })
          .filter((item: any) => item !== null && item !== undefined);
      }

      const newRoutePlan = await this.prisma.routePlan.create({
        data: {
          challenge_id: challengeId,
          banner_image_url: bannerImageUrl,
          about_challenge: routePlanData.about_challenge,
          location: routePlanData.location,
          total_distance: routePlanData.total_distance,
          average_completion_time: routePlanData.average_completion_time,
          climate_terrain: routePlanData.climate_terrain,
          highest_point: routePlanData.highest_point,
          dificulty_rating: routePlanData.dificulty_rating,
        },
      });

      if (dayPlans?.length) {
        await this.prisma.routeDay.createMany({
          data: dayPlans.map((day: any, index: number) => ({
            routePlanId: newRoutePlan.id,
            sequence: index + 1,
            day_number:
              day?.day_number !== undefined && day?.day_number !== null
                ? String(day.day_number)
                : null,
            title: day.title,
            description: day.description,
            distance:
              day?.distance !== undefined && day?.distance !== null
                ? String(day.distance)
                : null,
          })),
        });
      }

      const routePlanWithDays = await this.prisma.routePlan.findUnique({
        where: { id: newRoutePlan.id },
        include: {
          routeDays: {
            orderBy: { sequence: 'asc' },
          },
        },
      });

      return {
        success: true,
        message: 'Route plan created successfully',
        data: routePlanWithDays,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateRoutePlan(
    routePlanId: string,
    routePlanData: any,
    bannerImage?: Express.Multer.File,
  ) {
    try {
      const existing = await this.prisma.routePlan.findUnique({
        where: { id: routePlanId },
      });
      if (!existing) {
        throw new Error('Route plan not found');
      }

      let bannerImageUrl = existing.banner_image_url;
      if (bannerImage) {
        const safeName = (bannerImage.originalname || 'route-banner.jpg')
          .trim()
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9._-]/g, '');
        const fileName = `route-plans/${Date.now()}-${safeName}`;
        await SazedStorage.put(fileName, bannerImage.buffer);
        bannerImageUrl = SazedStorage.url(fileName);
      } else if (routePlanData.banner_image_url) {
        bannerImageUrl = routePlanData.banner_image_url;
      }

      let dayPlans = routePlanData.day_plans ?? routePlanData.days_plan;
      if (typeof dayPlans === 'string') {
        const rawDayPlans = dayPlans.trim();
        if (!rawDayPlans) {
          dayPlans = [];
        } else {
          try {
            dayPlans = JSON.parse(rawDayPlans);
          } catch (_firstError) {
            try {
              dayPlans = JSON.parse(`[${rawDayPlans}]`);
            } catch (_secondError) {
              throw new BadRequestException(
                'day_plans must be a valid JSON array, object, or comma-separated object list when sent as string',
              );
            }
          }
        }
      }

      if (
        dayPlans &&
        !Array.isArray(dayPlans) &&
        typeof dayPlans === 'object'
      ) {
        const looksLikeSingleDay =
          'day_number' in dayPlans ||
          'title' in dayPlans ||
          'description' in dayPlans ||
          'distance' in dayPlans;

        if (looksLikeSingleDay) {
          dayPlans = [dayPlans];
        } else {
          const keyedEntries = Object.entries(dayPlans).sort(
            (a, b) => Number(a[0]) - Number(b[0]),
          );
          dayPlans = keyedEntries.map(([, value]) => value);
        }
      }

      if (dayPlans && !Array.isArray(dayPlans)) {
        throw new BadRequestException(
          'day_plans must be an array (or JSON string / keyed object)',
        );
      }

      if (Array.isArray(dayPlans)) {
        dayPlans = dayPlans
          .map((item: any, index: number) => {
            if (typeof item === 'string') {
              const trimmed = item.trim();
              if (!trimmed) return null;
              try {
                return JSON.parse(trimmed);
              } catch (_error) {
                throw new BadRequestException(
                  `day_plans[${index}] is an invalid JSON string`,
                );
              }
            }
            return item;
          })
          .filter((item: any) => item !== null && item !== undefined);
      }

      const updateData: any = {};
      if (routePlanData.about_challenge !== undefined) {
        updateData.about_challenge = routePlanData.about_challenge;
      }
      if (routePlanData.location !== undefined) {
        updateData.location = routePlanData.location;
      }
      if (routePlanData.total_distance !== undefined) {
        updateData.total_distance = routePlanData.total_distance;
      }
      if (routePlanData.average_completion_time !== undefined) {
        updateData.average_completion_time =
          routePlanData.average_completion_time;
      }
      if (routePlanData.climate_terrain !== undefined) {
        updateData.climate_terrain = routePlanData.climate_terrain;
      }
      if (routePlanData.highest_point !== undefined) {
        updateData.highest_point = routePlanData.highest_point;
      }
      if (routePlanData.dificulty_rating !== undefined) {
        updateData.dificulty_rating = routePlanData.dificulty_rating;
      }
      if (bannerImageUrl !== undefined) {
        updateData.banner_image_url = bannerImageUrl;
      }

      const updatedRoutePlan = await this.prisma.routePlan.update({
        where: { id: routePlanId },
        data: updateData,
      });

      if (dayPlans && dayPlans.length > 0) {
        const existingDays = await this.prisma.routeDay.findMany({
          where: { routePlanId },
          select: { id: true },
        });
        const existingIds = new Set(existingDays.map((d) => d.id));

        for (let index = 0; index < dayPlans.length; index++) {
          const day = dayPlans[index] ?? {};
          const hasOwn = (key: string) =>
            Object.prototype.hasOwnProperty.call(day, key);

          if (day?.id) {
            if (!existingIds.has(day.id)) {
              throw new BadRequestException(
                `day_plans[${index}].id does not belong to this route plan`,
              );
            }

            const updateDayData: any = {};
            if (hasOwn('sequence')) {
              updateDayData.sequence = Number(day.sequence);
            }
            if (hasOwn('day_number')) {
              updateDayData.day_number =
                day.day_number !== undefined && day.day_number !== null
                  ? String(day.day_number)
                  : null;
            }
            if (hasOwn('title')) {
              updateDayData.title =
                day.title !== undefined && day.title !== null
                  ? String(day.title)
                  : null;
            }
            if (hasOwn('description')) {
              updateDayData.description =
                day.description !== undefined && day.description !== null
                  ? String(day.description)
                  : null;
            }
            if (hasOwn('distance')) {
              updateDayData.distance =
                day.distance !== undefined && day.distance !== null
                  ? String(day.distance)
                  : null;
            }

            if (Object.keys(updateDayData).length > 0) {
              await this.prisma.routeDay.update({
                where: { id: day.id },
                data: updateDayData,
              });
            }
            continue;
          }

          const createDayData: any = {
            routePlanId: updatedRoutePlan.id,
            sequence:
              day?.sequence !== undefined && day?.sequence !== null
                ? Number(day.sequence)
                : index + 1,
          };

          if (hasOwn('day_number')) {
            createDayData.day_number =
              day.day_number !== undefined && day.day_number !== null
                ? String(day.day_number)
                : null;
          }
          if (hasOwn('title')) {
            createDayData.title =
              day.title !== undefined && day.title !== null
                ? String(day.title)
                : null;
          }
          if (hasOwn('description')) {
            createDayData.description =
              day.description !== undefined && day.description !== null
                ? String(day.description)
                : null;
          }
          if (hasOwn('distance')) {
            createDayData.distance =
              day.distance !== undefined && day.distance !== null
                ? String(day.distance)
                : null;
          }

          await this.prisma.routeDay.create({
            data: createDayData,
          });
        }
      }

      const routePlanWithDays = await this.prisma.routePlan.findUnique({
        where: { id: routePlanId },
        include: {
          routeDays: {
            orderBy: { sequence: 'asc' },
          },
        },
      });

      return {
        success: true,
        message: 'Route plan updated successfully',
        data: routePlanWithDays,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
