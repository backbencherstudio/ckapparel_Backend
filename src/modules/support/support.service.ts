import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupportPlansQueryDto } from './dto/support-plans-query.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  private async createSupportNotification(
    receiverId: string,
    text: string,
    entityId?: string,
  ) {
    try {
      await NotificationRepository.createNotification({
        receiver_id: receiverId,
        type: 'support',
        text,
        entity_id: entityId,
      });
    } catch (error) {
      console.error('Failed to create support notification:', error);
    }
  }

  private toDistanceLabel(value: any) {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return null;
    if (numeric >= 1000) return `${numeric / 1000}km`;
    return `${numeric}m`;
  }

  private mapSupportPlan(plan: any) {
    return {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      category: plan.category,
      distance:
        plan.distance !== null && plan.distance !== undefined
          ? Number(plan.distance)
          : null,
      distanceLabel: this.toDistanceLabel(plan.distance),
      trainingPlansCategory: plan.trainingPlansCategory,
      route: {
        url: plan.route_url,
        isAvailable: Boolean(plan.route_url),
      },
      resource: {
        url: plan.resource_url,
        isAvailable: Boolean(plan.resource_url),
      },
      planType: {
        id: plan.plan_type?.id,
        name: plan.plan_type?.name,
        description: plan.plan_type?.description,
      },
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    };
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

  async getUserSupportPlanTypes() {
    const [types, counts] = await Promise.all([
      this.prisma.planType.findMany({
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),
      this.prisma.supportPlan.groupBy({
        by: ['planTypeId'],
        where: { status: 1 },
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map(counts.map((c) => [c.planTypeId, c._count._all]));

    return {
      success: true,
      message: 'Support plan types fetched successfully',
      data: types.map((t) => ({
        ...t,
        activePlansCount: countMap.get(t.id) || 0,
      })),
    };
  }

  async getUserSupportPlans(query: SupportPlansQueryDto) {
    const where: any = {
      status: 1,
      ...(query.planTypeId ? { planTypeId: query.planTypeId } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.trainingPlansCategory
        ? { trainingPlansCategory: query.trainingPlansCategory }
        : {}),
    };

    const [plans, total] = await this.prisma.$transaction([
      this.prisma.supportPlan.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          plan_type: {
            select: { id: true, name: true, description: true },
          },
        },
      }),
      this.prisma.supportPlan.count({ where }),
    ]);

    if (plans.length === 0) {
      throw new NotFoundException(
        'No support plans found matching the criteria',
      );
    }

    return {
      success: true,
      message: 'Support plans fetched successfully',
      data: plans.map((p) => this.mapSupportPlan(p)),
      meta: {
        total,
      },
    };
  }

  async downloadSupportPlanFile(planId: string, userId: string) {
    const normalizedPlanId = String(planId ?? '').trim();
    if (!normalizedPlanId) {
      throw new BadRequestException('planId is required');
    }

    const plan = await this.prisma.supportPlan.findUnique({
      where: { id: normalizedPlanId },
      select: {
        id: true,
        title: true,
        status: true,
        resource_url: true,
        created_at: true,
        plan_type: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Support plan not found');
    }
    if (plan.status !== 1) {
      throw new BadRequestException('Support plan is not active');
    }

    if (!plan.resource_url) {
      throw new NotFoundException('Support plan file not found');
    }

    const downloadUrl = plan.resource_url;
    const fileName = this.extractFileName(downloadUrl) || `${plan.title}.pdf`;

    if (userId) {
      await this.createSupportNotification(
        userId,
        `Support plan file "${plan.title}" is ready for download.`,
        plan.id,
      );
    }

    return {
      success: true,
      message: 'Support plan file ready for download',
      data: {
        planId: plan.id,
        title: plan.title,
        planType: plan.plan_type,
        downloadUrl,
        fileName,
        fileType: this.detectResourceType(downloadUrl),
        createdAt: plan.created_at,
      },
    };
  }

  async getActiveChallenges() {
    const challenges = await this.prisma.challenges.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        difficulty: true,
        challenge_country: true,
        metrics: true,
      },
    });

    return {
      success: true,
      message: 'Active challenges fetched successfully',
      data: challenges,
    };
  }

  async getChallengeRoutePlanDetails(challengeId: string) {
    const normalizedChallengeId = String(challengeId ?? '').trim();
    if (!normalizedChallengeId) {
      throw new BadRequestException('challengeId is required');
    }

    const challenge = await this.prisma.challenges.findFirst({
      where: {
        id: normalizedChallengeId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        path: true,
        category: true,
        difficulty: true,
        challenge_country: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        metrics: true,
        checkpoints: true,
      },
    });

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const routePlan = await this.prisma.routePlan.findFirst({
      where: {
        challenge_id: normalizedChallengeId,
        status: 1,
      },
      include: {
        routeDays: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!routePlan) {
      throw new NotFoundException('Route plan not found');
    }

    const distanceMetric = challenge.metrics.find(
      (metric) => metric.metric_type === 'DISTANCE_KM',
    );
    const elevationMetric = challenge.metrics.find(
      (metric) => metric.metric_type === 'ELEVATION_M',
    );

    const distanceLabel = distanceMetric
      ? `${distanceMetric.target_value.toString()}km`
      : null;
    const elevationLabel = elevationMetric
      ? `${elevationMetric.target_value.toString()}m`
      : null;

    return {
      success: true,
      message: 'Challenge route planning details fetched successfully',
      data: {
        challenge: {
          id: challenge.id,
          title: challenge.title,
          subtitle: challenge.subtitle,
          path: challenge.path,
          category: challenge.category,
          difficulty: challenge.difficulty,
          challenge_country: challenge.challenge_country,
          distance: distanceLabel,
          elevation: elevationLabel,
          checkpoints: challenge.checkpoints.length,
        },
        routePlan: {
          id: routePlan.id,
          banner_image_url: routePlan.banner_image_url,
          about_challenge: routePlan.about_challenge,
          location: routePlan.location,
          total_distance: routePlan.total_distance,
          average_completion_time: routePlan.average_completion_time,
          climate_terrain: routePlan.climate_terrain,
          highest_point: routePlan.highest_point,
          dificulty_rating: routePlan.dificulty_rating,
          createdAt: routePlan.created_at,
          updatedAt: routePlan.updated_at,
          routeDays: routePlan.routeDays.map((day) => ({
            id: day.id,
            sequence: day.sequence,
            day_number: day.day_number,
            title: day.title,
            description: day.description,
            distance: day.distance,
          })),
        },
      },
    };
  }
}
