import { BadRequestException, Injectable } from '@nestjs/common';
import { PlanCategory, TrainingPlansCategory } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSupportPlanDto } from './dto/create-support-plan.dto';
import { UpdateSupportPlanDto } from './dto/update-support-plan.dto';
import { SazedStorage } from 'src/common/lib/Disk';
import { SupportPlanCardsQueryDto } from './dto/support-plan-cards-query.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class SupportPlanService {
  constructor(private readonly prisma: PrismaService) {}

  private async createSupportPlanNotification(
    text: string,
    supportPlanId?: string,
  ) {
    try {
      // receiver_id: undefined => broadcast for admin notification feeds.
      await NotificationRepository.createNotification({
        receiver_id: undefined,
        type: 'support',
        text,
        entity_id: supportPlanId,
      });
    } catch (error) {
      console.error('Failed to create support-plan notification:', error);
    }
  }

  private extractFileName(url?: string | null) {
    if (!url) return null;
    try {
      const sanitized = url.split('?')[0];
      return sanitized.substring(sanitized.lastIndexOf('/') + 1) || null;
    } catch {
      return null;
    }
  }

  private detectResourceType(url?: string | null) {
    if (!url) return 'none';
    const lower = url.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'doc';
    if (lower.endsWith('.txt')) return 'txt';
    return 'url';
  }

  async getAdminDashboardCards() {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const [
      totalSupportPlans,
      activeSupportPlans,
      totalChallenges,
      activeChallenges,
      supportPlansThisWeek,
      activeSupportPlansThisWeek,
      challengesThisWeek,
      activeChallengesThisWeek,
    ] = await Promise.all([
      this.prisma.supportPlan.count(),
      this.prisma.supportPlan.count({ where: { status: 1 } }),
      this.prisma.challenges.count(),
      this.prisma.challenges.count({ where: { is_active: true } }),
      this.prisma.supportPlan.count({ where: { created_at: { gte: lastWeek } } }),
      this.prisma.supportPlan.count({
        where: { status: 1, created_at: { gte: lastWeek } },
      }),
      this.prisma.challenges.count({ where: { created_at: { gte: lastWeek } } }),
      this.prisma.challenges.count({
        where: { is_active: true, created_at: { gte: lastWeek } },
      }),
    ]);

    return {
      success: true,
      message: 'Support plan dashboard cards fetched successfully',
      data: {
        totalSupportPlans: {
          value: totalSupportPlans,
          weeklyChange: supportPlansThisWeek,
        },
        activePlans: {
          value: activeSupportPlans,
          weeklyChange: activeSupportPlansThisWeek,
        },
        totalChallenges: {
          value: totalChallenges,
          weeklyChange: challengesThisWeek,
        },
        activeChallenges: {
          value: activeChallenges,
          weeklyChange: activeChallengesThisWeek,
        },
      },
    };
  }

  async getAdminSupportPlanCards(query: SupportPlanCardsQueryDto) {
    const plans = await this.prisma.supportPlan.findMany({
      where: {
        planTypeId: query.planTypeId,
        category: query.category,
        status: query.status,
      },
      include: {
        plan_type: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const cards = plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      planType: {
        id: plan.plan_type.id,
        name: plan.plan_type.name,
        description: plan.plan_type.description,
      },
      status: {
        value: plan.status ?? 1,
        isActive: (plan.status ?? 1) === 1,
      },
      uploadDate: plan.created_at,
      category: plan.category,
      distance: plan.distance,
      trainingPlansCategory: plan.trainingPlansCategory,
      resource: {
        url: plan.resource_url,
        name: this.extractFileName(plan.resource_url),
        type: this.detectResourceType(plan.resource_url),
      },
      route: {
        url: plan.route_url,
        isAvailable: Boolean(plan.route_url),
      },
      download: {
        downloadedUsers: 0,
        totalUsers: 0,
        label: '0/0 users',
      },
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    }));

    return {
      success: true,
      message: 'Support plan cards fetched successfully',
      data: cards,
      meta: {
        total: cards.length,
        filters: {
          planTypeId: query.planTypeId || null,
          category: query.category || null,
          status: query.status ?? null,
        },
      },
    };
  }

  async getPlanTypes() {
    const planTypes = await this.prisma.planType.findMany({
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return {
      success: true,
      message: 'Plan types fetched successfully',
      data: planTypes,
    };
  }

  async createSupportPlan(
    createSupportPlanDto: CreateSupportPlanDto,
    file?: Express.Multer.File,
  ) {
    try {
      const planType = await this.prisma.planType.findUnique({
        where: { id: createSupportPlanDto.planTypeId },
        select: { id: true, name: true },
      });

      if (!planType) {
        const availablePlanTypes = await this.prisma.planType.findMany({
          select: { id: true, name: true },
          orderBy: { created_at: 'asc' },
        });
        throw new BadRequestException({
          message: 'Invalid planTypeId. Use /admin/support-plan/plan-types',
          acceptedPlanTypes: availablePlanTypes,
        });
      }

      const allowedCategories = Object.values(PlanCategory);
      if (
        !allowedCategories.includes(createSupportPlanDto.category as PlanCategory)
      ) {
        throw new BadRequestException(
          `Invalid category. Accepted values: ${allowedCategories.join(', ')}`,
        );
      }

      if (createSupportPlanDto.trainingPlansCategory) {
        const allowedTrainingCategories = Object.values(TrainingPlansCategory);
        if (
          !allowedTrainingCategories.includes(
            createSupportPlanDto.trainingPlansCategory as TrainingPlansCategory,
          )
        ) {
          throw new BadRequestException(
            `Invalid trainingPlansCategory. Accepted values: ${allowedTrainingCategories.join(', ')}`,
          );
        }
      }

      let resourceUrl = createSupportPlanDto.resource_url || undefined;

      // Handle file upload
      if (file) {
        try {
          const storage = SazedStorage.disk('local');
          const fileName = `support-plans/${Date.now()}-${file.originalname}`;
          await storage.put(fileName, file.buffer);
          resourceUrl = storage.url(fileName);
        } catch (fileError) {
          throw new BadRequestException(
            `File upload failed: ${fileError.message}`,
          );
        }
      }

      const supportPlan = await this.prisma.supportPlan.create({
        data: {
          title: createSupportPlanDto.title,
          description: createSupportPlanDto.description,
          distance: createSupportPlanDto.distance,
          resource_url: resourceUrl,
          route_url: createSupportPlanDto.route_url,
          planTypeId: createSupportPlanDto.planTypeId,
          category: createSupportPlanDto.category as PlanCategory,
          trainingPlansCategory:
            createSupportPlanDto.trainingPlansCategory as TrainingPlansCategory,
        },
        include: {
          plan_type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await this.createSupportPlanNotification(
        `Support plan "${supportPlan.title}" has been created.`,
        supportPlan.id,
      );

      return {
        success: true,
        message: 'Support plan created successfully',
        data: supportPlan,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.message || error.message,
        data: error?.response?.acceptedPlanTypes,
      };
    }
  }

  async updateSupportPlan(
    id: string,
    updateSupportPlanDto: UpdateSupportPlanDto,
    file?: Express.Multer.File,
  ) {
    try {
      const existingPlan = await this.prisma.supportPlan.findUnique({
        where: { id },
        select: { id: true, resource_url: true },
      });

      if (!existingPlan) {
        throw new BadRequestException('Support plan not found');
      }

      if (updateSupportPlanDto.planTypeId) {
        const planType = await this.prisma.planType.findUnique({
          where: { id: updateSupportPlanDto.planTypeId },
          select: { id: true },
        });

        if (!planType) {
          const availablePlanTypes = await this.prisma.planType.findMany({
            select: { id: true, name: true },
            orderBy: { created_at: 'asc' },
          });
          throw new BadRequestException({
            message: 'Invalid planTypeId. Use /admin/support-plan/plan-types',
            acceptedPlanTypes: availablePlanTypes,
          });
        }
      }

      if (updateSupportPlanDto.category) {
        const allowedCategories = Object.values(PlanCategory);
        if (
          !allowedCategories.includes(updateSupportPlanDto.category as PlanCategory)
        ) {
          throw new BadRequestException(
            `Invalid category. Accepted values: ${allowedCategories.join(', ')}`,
          );
        }
      }

      if (updateSupportPlanDto.trainingPlansCategory) {
        const allowedTrainingCategories = Object.values(TrainingPlansCategory);
        if (
          !allowedTrainingCategories.includes(
            updateSupportPlanDto.trainingPlansCategory as TrainingPlansCategory,
          )
        ) {
          throw new BadRequestException(
            `Invalid trainingPlansCategory. Accepted values: ${allowedTrainingCategories.join(', ')}`,
          );
        }
      }

      let resourceUrl = updateSupportPlanDto.resource_url;

      if (file) {
        try {
          const storage = SazedStorage.disk('local');
          const fileName = `support-plans/${Date.now()}-${file.originalname}`;
          await storage.put(fileName, file.buffer);
          resourceUrl = storage.url(fileName);
        } catch (fileError) {
          throw new BadRequestException(
            `File upload failed: ${fileError.message}`,
          );
        }
      }

      const supportPlan = await this.prisma.supportPlan.update({
        where: { id },
        data: {
          title: updateSupportPlanDto.title,
          description: updateSupportPlanDto.description,
          distance: updateSupportPlanDto.distance,
          resource_url: resourceUrl,
          route_url: updateSupportPlanDto.route_url,
          planTypeId: updateSupportPlanDto.planTypeId,
          category: updateSupportPlanDto.category as PlanCategory,
          trainingPlansCategory:
            updateSupportPlanDto.trainingPlansCategory as TrainingPlansCategory,
        },
        include: {
          plan_type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await this.createSupportPlanNotification(
        `Support plan "${supportPlan.title}" has been updated.`,
        supportPlan.id,
      );

      return {
        success: true,
        message: 'Support plan updated successfully',
        data: supportPlan,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.message || error.message,
        data: error?.response?.acceptedPlanTypes,
      };
    }
  }

  async updateSupportPlanStatus(id: string, status: number) {
    try {
      const existingPlan = await this.prisma.supportPlan.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existingPlan) {
        throw new BadRequestException('Support plan not found');
      }

      const updated = await this.prisma.supportPlan.update({
        where: { id },
        data: { status },
        select: {
          id: true,
          title: true,
          status: true,
          updated_at: true,
        },
      });

      await this.createSupportPlanNotification(
        `Support plan "${updated.title}" status changed to ${updated.status === 1 ? 'ACTIVE' : 'INACTIVE'}.`,
        updated.id,
      );

      return {
        success: true,
        message: 'Support plan status updated successfully',
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.message || error.message,
      };
    }
  }

  async deleteSupportPlan(id: string) {
    try {
      const existingPlan = await this.prisma.supportPlan.findUnique({
        where: { id },
        select: { id: true, title: true },
      });

      if (!existingPlan) {
        throw new BadRequestException('Support plan not found');
      }

      await this.prisma.supportPlan.delete({ where: { id } });

      await this.createSupportPlanNotification(
        `Support plan "${existingPlan.title}" has been deleted.`,
        existingPlan.id,
      );

      return {
        success: true,
        message: 'Support plan deleted successfully',
        data: {
          id: existingPlan.id,
          title: existingPlan.title,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.message || error.message,
      };
    }
  }
}
