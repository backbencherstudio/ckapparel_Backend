import { Injectable } from '@nestjs/common';
import {
  ChallengePath,
  ChallengeStatus,
  ParticipationStatus,
  SponsorshipStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

interface MonthWindow {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  private endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  private buildMonthWindows(months: number): MonthWindow[] {
    const result: MonthWindow[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = this.startOfMonth(d);
      const end = this.endOfMonth(d);
      result.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-US', { month: 'short' }),
        start,
        end,
      });
    }

    return result;
  }

  private calcWeeklyChange(currentValue: number, previousValue: number) {
    const delta = currentValue - previousValue;
    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const percentage =
      previousValue > 0
        ? Number(((Math.abs(delta) / previousValue) * 100).toFixed(2))
        : delta > 0
          ? 100
          : 0;

    return {
      delta,
      direction,
      percentage,
    };
  }

  async getSummaryCards() {
    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      totalAthletes,
      totalActiveChallenges,
      totalOpenSponsorship,
      totalQuotationRequest,
      athletesThisWeek,
      athletesPrevWeek,
      activeChallengesThisWeek,
      activeChallengesPrevWeek,
      openSponsorshipThisWeek,
      openSponsorshipPrevWeek,
      quotationThisWeek,
      quotationPrevWeek,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          deleted_at: null,
          type: 'user',
        },
      }),
      this.prisma.challenges.count({
        where: {
          deleted_at: null,
          status: ChallengeStatus.ACTIVE,
          is_active: true,
        },
      }),
      this.prisma.sponsorship.count({
        where: {
          status: SponsorshipStatus.OPEN,
        },
      }),
      this.prisma.quotation.count({
        where: {
          deleted_at: null,
          status: {
            in: ['pending', 'reviewed', 'contacted'],
          },
        },
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          type: 'user',
          created_at: { gte: thisWeekStart },
        },
      }),
      this.prisma.user.count({
        where: {
          deleted_at: null,
          type: 'user',
          created_at: { gte: prevWeekStart, lt: thisWeekStart },
        },
      }),
      this.prisma.challenges.count({
        where: {
          deleted_at: null,
          status: ChallengeStatus.ACTIVE,
          is_active: true,
          created_at: { gte: thisWeekStart },
        },
      }),
      this.prisma.challenges.count({
        where: {
          deleted_at: null,
          status: ChallengeStatus.ACTIVE,
          is_active: true,
          created_at: { gte: prevWeekStart, lt: thisWeekStart },
        },
      }),
      this.prisma.sponsorship.count({
        where: {
          status: SponsorshipStatus.OPEN,
          created_at: { gte: thisWeekStart },
        },
      }),
      this.prisma.sponsorship.count({
        where: {
          status: SponsorshipStatus.OPEN,
          created_at: { gte: prevWeekStart, lt: thisWeekStart },
        },
      }),
      this.prisma.quotation.count({
        where: {
          deleted_at: null,
          status: { in: ['pending', 'reviewed', 'contacted'] },
          created_at: { gte: thisWeekStart },
        },
      }),
      this.prisma.quotation.count({
        where: {
          deleted_at: null,
          status: { in: ['pending', 'reviewed', 'contacted'] },
          created_at: { gte: prevWeekStart, lt: thisWeekStart },
        },
      }),
    ]);

    return {
      success: true,
      message: 'Admin dashboard summary fetched successfully',
      data: {
        totalAthletes: {
          value: totalAthletes,
          weekly: this.calcWeeklyChange(athletesThisWeek, athletesPrevWeek),
        },
        activeChallenges: {
          value: totalActiveChallenges,
          weekly: this.calcWeeklyChange(
            activeChallengesThisWeek,
            activeChallengesPrevWeek,
          ),
        },
        openSponsorships: {
          value: totalOpenSponsorship,
          weekly: this.calcWeeklyChange(
            openSponsorshipThisWeek,
            openSponsorshipPrevWeek,
          ),
        },
        quotationRequests: {
          value: totalQuotationRequest,
          weekly: this.calcWeeklyChange(quotationThisWeek, quotationPrevWeek),
        },
      },
    };
  }

  async getRegisteredVsActiveAthletes(months = 6) {
    const clampedMonths = Math.max(3, Math.min(12, Number(months) || 6));
    const windows = this.buildMonthWindows(clampedMonths);

    const [registeredRows, syncedActivityRows, participationRows] =
      await Promise.all([
        this.prisma.user.findMany({
          where: {
            deleted_at: null,
            type: 'user',
            created_at: { gte: windows[0].start, lte: windows[windows.length - 1].end },
          },
          select: { created_at: true },
        }),
        this.prisma.syncedActivity.findMany({
          where: {
            deleted_at: null,
            activity_date: { gte: windows[0].start, lte: windows[windows.length - 1].end },
          },
          select: {
            user_id: true,
            activity_date: true,
          },
        }),
        this.prisma.challengeParticipation.findMany({
          where: {
            deleted_at: null,
            joined_at: { gte: windows[0].start, lte: windows[windows.length - 1].end },
            status: {
              in: [
                ParticipationStatus.JOINED,
                ParticipationStatus.IN_PROGRESS,
                ParticipationStatus.PAUSED,
                ParticipationStatus.COMPLETED,
              ],
            },
          },
          select: {
            user_id: true,
            joined_at: true,
          },
        }),
      ]);

    const byMonth = windows.map((window) => {
      const registered = registeredRows.filter(
        (row) => row.created_at >= window.start && row.created_at <= window.end,
      ).length;

      const activeUsers = new Set<string>();

      syncedActivityRows.forEach((row) => {
        if (row.activity_date >= window.start && row.activity_date <= window.end) {
          activeUsers.add(row.user_id);
        }
      });

      participationRows.forEach((row) => {
        if (row.joined_at >= window.start && row.joined_at <= window.end) {
          activeUsers.add(row.user_id);
        }
      });

      return {
        month: window.label,
        monthKey: window.key,
        registeredAthletes: registered,
        activeAthletes: activeUsers.size,
      };
    });

    return {
      success: true,
      message: 'Registered vs active athletes trend fetched successfully',
      data: byMonth,
      meta: {
        months: clampedMonths,
      },
    };
  }

  async getChallengeParticipantsBreakdown() {
    const challenges = await this.prisma.challenges.findMany({
      where: {
        deleted_at: null,
      },
      select: {
        path: true,
        _count: {
          select: {
            participations: {
              where: {
                deleted_at: null,
                status: {
                  notIn: [
                    ParticipationStatus.ABANDONED,
                    ParticipationStatus.DISQUALIFIED,
                  ],
                },
              },
            },
          },
        },
      },
    });

    const labels: Record<ChallengePath, string> = {
      [ChallengePath.MONTHLY_CHALLENGE]: 'Monthly Challenges',
      [ChallengePath.VIRTUAL_ADVENTURE]: 'Virtual Challenges',
      [ChallengePath.COMMUNITY_CHALLENGE]: 'Community Challenges',
      [ChallengePath.ELITE_ATHLETE]: 'Elite Challenges',
    };

    const pathCounts: Record<ChallengePath, number> = {
      [ChallengePath.MONTHLY_CHALLENGE]: 0,
      [ChallengePath.VIRTUAL_ADVENTURE]: 0,
      [ChallengePath.COMMUNITY_CHALLENGE]: 0,
      [ChallengePath.ELITE_ATHLETE]: 0,
    };

    challenges.forEach((challenge) => {
      pathCounts[challenge.path] += challenge._count.participations;
    });

    const totalParticipants = Object.values(pathCounts).reduce(
      (sum, value) => sum + value,
      0,
    );

    const overallAthletes = await this.prisma.user.count({
      where: {
        deleted_at: null,
        type: 'user',
      },
    });

    const overallParticipationPercent =
      overallAthletes > 0
        ? Number(Math.min((totalParticipants / overallAthletes) * 100, 100).toFixed(2))
        : 0;

    const breakdown = Object.values(ChallengePath).map((path) => ({
      key: path,
      label: labels[path],
      participants: pathCounts[path],
      percentage:
        totalParticipants > 0
          ? Number(((pathCounts[path] / totalParticipants) * 100).toFixed(2))
          : 0,
    }));

    return {
      success: true,
      message: 'Challenge participants breakdown fetched successfully',
      data: {
        overallParticipants: totalParticipants,
        overallParticipationPercent,
        breakdown,
      },
    };
  }

//   async getDashboardOverview(months = 6) {
//     const [summary, athletesTrend, challengeParticipants] = await Promise.all([
//       this.getSummaryCards(),
//       this.getRegisteredVsActiveAthletes(months),
//       this.getChallengeParticipantsBreakdown(),
//     ]);

//     return {
//       success: true,
//       message: 'Admin dashboard overview fetched successfully',
//       data: {
//         cards: summary.data,
//         athletesTrend: athletesTrend.data,
//         participantsDonut: challengeParticipants.data,
//       },
//       meta: {
//         months: athletesTrend.meta.months,
//       },
//     };
//   }
}
