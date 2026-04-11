import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSponsorshipDto } from './dto/create-sponsorship.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ChallengeCategory,
  NeedCategory,
  Prisma,
  SponsorshipStatus,
} from '@prisma/client';
import { UpdateSponsorshipDto } from './dto/update-sponsorship.dto';
import { AddSponsorDto } from './dto/add-sponsor.dto';
import { AdminGetAllSponsorshipsQueryDto } from './dto/admin-get-all-sponsorships-query.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { AdminSponsorshipHubQueryDto } from './dto/admin-sponsorship-hub-query.dto';

@Injectable()
export class SponsorshipService {
  constructor(private readonly prisma: PrismaService) {}

  private async createSponsorshipNotification(
    receiverId: string | undefined,
    text: string,
    senderId?: string,
    sponsorshipId?: string,
  ) {
    try {
      await NotificationRepository.createNotification({
        sender_id: senderId,
        receiver_id: receiverId,
        type: 'sponsorship',
        text,
        entity_id: sponsorshipId,
      });
    } catch (error) {
      console.error('Failed to create sponsorship notification:', error);
    }
  }

  private normalizeChallengeCategory(value: any): ChallengeCategory {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();

    const map: Record<string, ChallengeCategory> = {
      RUNNING: ChallengeCategory.RUNNING,
      CYCLING: ChallengeCategory.CYCLING,
      SWIMMING: ChallengeCategory.SWIMMING,
      HIIT: ChallengeCategory.HIIT,
      OTHER: ChallengeCategory.OTHER,
    };

    const category = map[normalized];
    if (!category) {
      throw new BadRequestException(
        'Invalid challenge category. Accepted: RUNNING, CYCLING, SWIMMING, HIIT',
      );
    }

    return category;
  }

  private normalizeNeedCategory(value: any): NeedCategory {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();

    if (normalized === 'SUPPLEMENTS') return NeedCategory.SUPPLIMENTS;

    const map: Record<string, NeedCategory> = {
      FOOTWEAR: NeedCategory.FOOTWEAR,
      NUTRITION: NeedCategory.NUTRITION,
      TRANSPORTATION: NeedCategory.TRANSPORTATION,
      SUPPLIMENTS: NeedCategory.SUPPLIMENTS,
      OTHER: NeedCategory.OTHER,
    };

    const category = map[normalized];
    if (!category) {
      throw new BadRequestException(
        'Invalid need category. Accepted: FOOTWEAR, NUTRITION, TRANSPORTATION, SUPPLIMENTS, OTHER',
      );
    }

    return category;
  }

  async createSponsorship(
    createSponsorshipDto: CreateSponsorshipDto,
    userId: string,
  ) {
    try {
      if (!createSponsorshipDto.sponsorship_Needs?.length) {
        throw new BadRequestException(
          'At least one sponsorship need is required',
        );
      }

      const challengeCategory = this.normalizeChallengeCategory(
        createSponsorshipDto.category,
      );

      const sponsorship = await this.prisma.sponsorship.create({
        data: {
          title: createSponsorshipDto.title,
          description: createSponsorshipDto.description,
          funding_goal: createSponsorshipDto.fundingGoal ?? null,
          challenge_category: challengeCategory,
          creator: {
            connect: { id: userId },
          },
          sponsorship_Needs: {
            create: createSponsorshipDto.sponsorship_Needs.map((need) => ({
              need_category: this.normalizeNeedCategory(need.need_category),
              need_description:
                need.need_description !== undefined &&
                need.need_description !== null
                  ? String(need.need_description).trim() || null
                  : null,
            })),
          },
        },
        include: {
          sponsorship_Needs: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              sponsorDetails: true,
            },
          },
        },
      });

      await this.createSponsorshipNotification(
        userId,
        `Your sponsorship "${sponsorship.title}" has been created successfully.`,
        undefined,
        sponsorship.id,
      );

      // Notify admins as broadcast for admin dashboards.
      await this.createSponsorshipNotification(
        undefined,
        `New sponsorship created: "${sponsorship.title}".`,
        userId,
        sponsorship.id,
      );

      return {
        success: true,
        message: 'Sponsorship created successfully',
        data: sponsorship,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to create sponsorship',
      );
    }
  }

  async getOpenSponsorships() {
    try {
      const sponsorships = await this.prisma.sponsorship.findMany({
        where: { status: SponsorshipStatus.OPEN },
        include: {
          sponsorship_Needs: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              age: true,
              country: true,
            },
          },
          _count: {
            select: {
              sponsorDetails: true,
            },
          },
        },
      });

      const sponsorshipsWithProgress = sponsorships.map((sponsorship) => {
        const amountRaised = Number(sponsorship.amount_raised ?? 0);
        const fundingGoal =
          sponsorship.funding_goal !== null && sponsorship.funding_goal !== undefined
            ? Number(sponsorship.funding_goal)
            : null;

        const progressPercentage =
          fundingGoal !== null && fundingGoal > 0
            ? Math.min((amountRaised / fundingGoal) * 100, 100)
            : null;

        const isGoalAchieved =
          fundingGoal !== null ? amountRaised >= fundingGoal : false;

        return {
          ...sponsorship,
          fundingProgress: {
            amountRaised,
            fundingGoal,
            remainingAmount:
              fundingGoal !== null ? Math.max(fundingGoal - amountRaised, 0) : null,
            progressPercentage,
            isGoalAchieved,
          },
        };
      });

      return {
        success: true,
        message: 'Open sponsorships fetched successfully',
        data: sponsorshipsWithProgress,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch sponsorships',
      );
    }
  }

  async getSponsorshipsByUser(
    userId: string,
    query: AdminGetAllSponsorshipsQueryDto,
  ) {
    try {
      const page = query?.page ?? 1;
      const limit = query?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: Prisma.SponsorshipWhereInput = {
        creator_id: userId,
      };
      if (query?.status) {
        where.status = query.status;
      }

      const [sponsorships, total] = await Promise.all([
        this.prisma.sponsorship.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            sponsorship_Needs: true,
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                sponsorDetails: true,
              },
            },
          },
        }),
        this.prisma.sponsorship.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: "User's sponsorships fetched successfully",
        data: sponsorships,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          status: query?.status ?? null,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch user sponsorships',
      );
    }
  }

  async updateSponsorship(
    updateSponsorshipDto: UpdateSponsorshipDto,
    userId: string,
  ) {
    try {
      const sponsorship = await this.prisma.sponsorship.findUnique({
        where: { id: updateSponsorshipDto.id },
        include: { sponsorship_Needs: true },
      });
      if (!sponsorship) {
        throw new BadRequestException('Sponsorship not found');
      }
      if (sponsorship.creator_id !== userId) {
        throw new BadRequestException(
          'Unauthorized to update this sponsorship',
        );
      }

      const challengeCategory = updateSponsorshipDto.category
        ? this.normalizeChallengeCategory(updateSponsorshipDto.category)
        : sponsorship.challenge_category;

      const updatedSponsorship = await this.prisma.sponsorship.update({
        where: { id: updateSponsorshipDto.id },
        data: {
          title: updateSponsorshipDto.title ?? sponsorship.title,
          description:
            updateSponsorshipDto.description ?? sponsorship.description,
          funding_goal:
            updateSponsorshipDto.fundingGoal ?? sponsorship.funding_goal,
          challenge_category: challengeCategory,
          sponsorship_Needs: updateSponsorshipDto.sponsorship_Needs
            ? {
                deleteMany: {},
                create: updateSponsorshipDto.sponsorship_Needs.map((need) => ({
                  need_category: this.normalizeNeedCategory(need.need_category),
                  need_description:
                    need.need_description !== undefined &&
                    need.need_description !== null
                      ? String(need.need_description).trim() || null
                      : null,
                })),
              }
            : undefined,
        },
        include: {
          sponsorship_Needs: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              sponsorDetails: true,
            },
          },
        },
      });

      await this.createSponsorshipNotification(
        userId,
        `Your sponsorship "${updatedSponsorship.title}" has been updated.`,
        undefined,
        updatedSponsorship.id,
      );

      return {
        success: true,
        message: 'Sponsorship updated successfully',
        data: updatedSponsorship,
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to update sponsorship',
      );
    }
  }

  async addSponsorToSponsorship(addSponsorDto: AddSponsorDto, userId: string) {
    try {
      const sponsorship = await this.prisma.sponsorship.findUnique({
        where: { id: addSponsorDto.sponsorshipId },
      });

      if (!sponsorship) {
        throw new NotFoundException('Sponsorship not found');
      }

      //   if (sponsorship.creator_id === userId) {
      //     throw new BadRequestException(
      //       'You cannot add sponsor details to your own sponsorship',
      //     );
      //   }

      if (sponsorship.status !== SponsorshipStatus.OPEN) {
        throw new BadRequestException(
          'Only OPEN sponsorships can receive sponsor details',
        );
      }

      const amount = new Prisma.Decimal(addSponsorDto.sponsorshipAmount);
      const currentRaised = sponsorship.amount_raised ?? new Prisma.Decimal(0);
      const updatedRaisedAmount = currentRaised.plus(amount);

      const shouldClose =
        sponsorship.funding_goal !== null &&
        sponsorship.funding_goal !== undefined &&
        updatedRaisedAmount.gte(sponsorship.funding_goal);

      const updatedSponsorship = await this.prisma.$transaction(async (tx) => {
        await tx.sponsorDetails.create({
          data: {
            sponsorship_id: sponsorship.id,
            name: addSponsorDto.sponsorName.trim(),
            email: addSponsorDto.sponsorEmail.trim().toLowerCase(),
            phone_number: addSponsorDto.sponsorPhone?.trim() || null,
            amount,
            message: addSponsorDto.sponsorMessage?.trim() || null,
          },
        });

        return tx.sponsorship.update({
          where: { id: sponsorship.id },
          data: {
            amount_raised: updatedRaisedAmount,
            status: shouldClose ? SponsorshipStatus.CLOSED : sponsorship.status,
          },
          include: {
            sponsorship_Needs: true,
            sponsorDetails: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
                amount: true,
                message: true,
                created_at: true,
              },
              orderBy: { created_at: 'desc' },
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        });
      });

      await this.createSponsorshipNotification(
        sponsorship.creator_id || undefined,
        shouldClose
          ? `Your sponsorship "${sponsorship.title}" reached its funding goal and is now closed.`
          : `Your sponsorship "${sponsorship.title}" received a new contribution from ${addSponsorDto.sponsorName}.`,
        userId,
        sponsorship.id,
      );

      if (userId !== sponsorship.creator_id) {
        await this.createSponsorshipNotification(
          userId,
          `Your sponsorship contribution to "${sponsorship.title}" was recorded successfully.`,
          sponsorship.creator_id || undefined,
          sponsorship.id,
        );
      }

      return {
        success: true,
        message: shouldClose
          ? 'Sponsor added and sponsorship is now closed (funding goal reached)'
          : 'Sponsor added successfully',
        data: updatedSponsorship,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(
        error?.message || 'Failed to add sponsor to sponsorship',
      );
    }
  }

  async getSponsorshipById(sponsorshipId: string, userId: string) {
    try {
      const sponsorship = await this.prisma.sponsorship.findUnique({
        where: { id: sponsorshipId },
        include: {
          sponsorship_Needs: true,
          sponsorDetails: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              amount: true,
              message: true,
              created_at: true,
            },
            orderBy: { created_at: 'desc' },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      if (!sponsorship) {
        throw new NotFoundException('Sponsorship not found');
      }

      // Optional: If you want to restrict access to sponsorship details only to the creator and sponsors, you can uncomment the following lines:
      // if (sponsorship.creator_id !== userId && !sponsorship.sponsorDetails.some(s => s.email === userEmail)) {
      //     throw new BadRequestException('Unauthorized to view this sponsorship');
      // }

      return {
        success: true,
        message: 'Sponsorship details fetched successfully',
        data: sponsorship,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to fetch sponsorship details',
      );
    }
  }

  // ====================================================
  // Admin Sponsorship Management Endpoints
  // ====================================================

  async adminGetAllSponsorships(query: AdminGetAllSponsorshipsQueryDto) {
    try {
      const page = query?.page ?? 1;
      const limit = query?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: Prisma.SponsorshipWhereInput = {};
      if (query?.status) {
        where.status = query.status;
      }
      if (query?.category) {
        where.challenge_category = query.category;
      }
      const search = query?.search?.trim();
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { creator: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [sponsorships, total] = await Promise.all([
        this.prisma.sponsorship.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            sponsorship_Needs: true,
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                sponsorDetails: true,
              },
            },
          },
        }),
        this.prisma.sponsorship.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'All sponsorships fetched successfully',
        data: sponsorships,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          status: query?.status ?? null,
          category: query?.category ?? null,
          search: search ?? null,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch sponsorships',
      );
    }
  }

  async adminUpdateSponsorshipStatus(
    sponsorshipId: string,
    newStatus: SponsorshipStatus,
  ) {
    try {
      if (!sponsorshipId?.trim()) {
        throw new BadRequestException('Sponsorship id is required');
      }

      const normalizedStatus = String(newStatus ?? '')
        .trim()
        .toUpperCase() as SponsorshipStatus;

      const sponsorship = await this.prisma.sponsorship.findUnique({
        where: { id: sponsorshipId },
      });

      if (!sponsorship) {
        throw new NotFoundException('Sponsorship not found');
      }

      //   if (sponsorship.status !== SponsorshipStatus.PENDING) {
      //     throw new BadRequestException(
      //       'Only PENDING sponsorships can be approved or declined by admin',
      //     );
      //   }

      const updatedSponsorship = await this.prisma.sponsorship.update({
        where: { id: sponsorshipId },
        data: { status: normalizedStatus },
        include: {
          sponsorship_Needs: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              sponsorDetails: true,
            },
          },
        },
      });

      await this.createSponsorshipNotification(
        sponsorship.creator_id || undefined,
        normalizedStatus === SponsorshipStatus.OPEN
          ? `Your sponsorship "${updatedSponsorship.title}" has been approved and is now OPEN.`
          : `Your sponsorship "${updatedSponsorship.title}" status has been updated to ${normalizedStatus}.`,
        undefined,
        updatedSponsorship.id,
      );

      return {
        success: true,
        message:
          normalizedStatus === SponsorshipStatus.OPEN
            ? 'Sponsorship approved successfully'
            : 'Sponsorship declined successfully',
        data: updatedSponsorship,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(
        error?.message || 'Failed to update sponsorship status',
      );
    }
  }

  async adminGetSponsorshipHubSummary() {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [openCount, pendingCount, completedCount, totalRaisedAggregate, weekly] =
        await Promise.all([
          this.prisma.sponsorship.count({
            where: { status: SponsorshipStatus.OPEN },
          }),
          this.prisma.sponsorship.count({
            where: { status: SponsorshipStatus.PENDING },
          }),
          this.prisma.sponsorship.count({
            where: { status: SponsorshipStatus.CLOSED },
          }),
          this.prisma.sponsorship.aggregate({
            _sum: { amount_raised: true },
          }),
          this.prisma.sponsorship.groupBy({
            by: ['status'],
            where: {
              created_at: {
                gte: sevenDaysAgo,
              },
            },
            _count: { status: true },
          }),
        ]);

      const weeklyMap = new Map<SponsorshipStatus, number>();
      for (const row of weekly) {
        weeklyMap.set(row.status, row._count.status);
      }

      return {
        success: true,
        message: 'Sponsorship hub summary fetched successfully',
        data: {
          openListing: {
            total: openCount,
            newThisWeek: weeklyMap.get(SponsorshipStatus.OPEN) ?? 0,
          },
          pendingRequests: {
            total: pendingCount,
            newThisWeek: weeklyMap.get(SponsorshipStatus.PENDING) ?? 0,
          },
          fullyCompleted: {
            total: completedCount,
            newThisWeek: weeklyMap.get(SponsorshipStatus.CLOSED) ?? 0,
          },
          totalRaised: Number(totalRaisedAggregate._sum.amount_raised ?? 0),
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch sponsorship hub summary',
      );
    }
  }

  private buildAdminHubWhere(
    query: AdminSponsorshipHubQueryDto,
    defaultStatus?: SponsorshipStatus,
  ): Prisma.SponsorshipWhereInput {
    const where: Prisma.SponsorshipWhereInput = {};

    if (defaultStatus) {
      where.status = defaultStatus;
    }
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.category) {
      where.challenge_category = query.category;
    }

    const search = query?.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { creator: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  async adminGetPendingReview(query: AdminSponsorshipHubQueryDto) {
    try {
      const page = query?.page ?? 1;
      const limit = query?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where = this.buildAdminHubWhere(query, SponsorshipStatus.PENDING);

      const [items, total] = await Promise.all([
        this.prisma.sponsorship.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            sponsorship_Needs: {
              select: {
                id: true,
                need_category: true,
                need_description: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true,
                country: true,
              },
            },
          },
        }),
        this.prisma.sponsorship.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Pending sponsorship review list fetched successfully',
        data: items,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          status: query?.status ?? SponsorshipStatus.PENDING,
          category: query?.category ?? null,
          search: query?.search?.trim() || null,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch pending sponsorship review list',
      );
    }
  }

  async adminGetActiveListings(query: AdminSponsorshipHubQueryDto) {
    try {
      const page = query?.page ?? 1;
      const limit = query?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where = this.buildAdminHubWhere(query);
      if (!query?.status) {
        where.status = {
          in: [SponsorshipStatus.OPEN, SponsorshipStatus.CLOSED],
        };
      }

      const [items, total] = await Promise.all([
        this.prisma.sponsorship.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        }),
        this.prisma.sponsorship.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        message: 'Active sponsorship listings fetched successfully',
        data: items,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          status: query?.status ?? null,
          category: query?.category ?? null,
          search: query?.search?.trim() || null,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Failed to fetch active sponsorship listings',
      );
    }
  }

  async adminGetSponsorshipHubDetails(sponsorshipId: string) {
    try {
      if (!sponsorshipId?.trim()) {
        throw new BadRequestException('Sponsorship id is required');
      }

      const sponsorship = await this.prisma.sponsorship.findUnique({
        where: { id: sponsorshipId },
        include: {
          sponsorship_Needs: {
            select: {
              id: true,
              need_category: true,
              need_description: true,
            },
            orderBy: { created_at: 'asc' },
          },
          sponsorDetails: {
            select: {
              id: true,
              name: true,
              email: true,
              phone_number: true,
              amount: true,
              message: true,
              created_at: true,
            },
            orderBy: { created_at: 'desc' },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              country: true,
              age: true,
            },
          },
          _count: {
            select: {
              sponsorDetails: true,
            },
          },
        },
      });

      if (!sponsorship) {
        throw new NotFoundException('Sponsorship not found');
      }

      const amountRaised = Number(sponsorship.amount_raised ?? 0);
      const fundingGoal =
        sponsorship.funding_goal !== null && sponsorship.funding_goal !== undefined
          ? Number(sponsorship.funding_goal)
          : null;

      const progressPercentage =
        fundingGoal !== null && fundingGoal > 0
          ? Math.min((amountRaised / fundingGoal) * 100, 100)
          : null;

      return {
        success: true,
        message: 'Sponsorship details fetched successfully',
        data: {
          ...sponsorship,
          fundingProgress: {
            amountRaised,
            fundingGoal,
            remainingAmount:
              fundingGoal !== null ? Math.max(fundingGoal - amountRaised, 0) : null,
            progressPercentage,
            isGoalAchieved:
              fundingGoal !== null ? amountRaised >= fundingGoal : false,
          },
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
        error?.message || 'Failed to fetch sponsorship details',
      );
    }
  }

  async adminDeleteSponsorship(sponsorshipId: string) {
    try {
      if (!sponsorshipId?.trim()) {
        throw new BadRequestException('Sponsorship id is required');
      }

      const sponsorship = await this.prisma.sponsorship.findUnique({
        where: { id: sponsorshipId },
      });

      if (!sponsorship) {
        throw new NotFoundException('Sponsorship not found');
      }

      await this.prisma.sponsorship.delete({ where: { id: sponsorshipId } });

      await this.createSponsorshipNotification(
        sponsorship.creator_id || undefined,
        `Your sponsorship "${sponsorship.title}" has been removed by admin.`,
        undefined,
        sponsorship.id,
      );

      return {
        success: true,
        message: 'Sponsorship deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to delete sponsorship',
      );
    }
  }
}
