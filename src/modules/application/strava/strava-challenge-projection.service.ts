import { Injectable, Logger } from '@nestjs/common';
import {
  ChallengeCategory,
  ChallengePath,
  CheckpointStatus,
  FitnessProvider,
  MetricType,
  ParticipationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

interface ActivityMetricMap {
  DISTANCE_KM: number;
  ELEVATION_M: number;
  DURATION_MIN: number;
  CALORIES: number;
  [key: string]: number;
}

interface CheckpointProjectionState {
  checkpointId: string;
  sequence: number;
  status: CheckpointStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  completedByActivityId: string | null;
  metricValues: Record<string, number>;
  isRequired: boolean;
  isVisible: boolean;
  unlockAfterCheckpointSeq: number | null;
  metricTargets: Record<string, number>;
}

interface ParticipationProjectionResult {
  totals: ActivityMetricMap;
  progressPercent: number;
  startedAt: Date | null;
  completedAt: Date | null;
  isChallengeComplete: boolean;
  activeCheckpointSeq: number | null;
  checkpointStates: CheckpointProjectionState[];
  activityContributions: ActivityContribution[];
}

interface ActivityContribution {
  activityId: string;
  activityDate: Date;
  countedMetrics: Partial<ActivityMetricMap>;
  completedCheckpointId?: string | null;
}

interface PauseWindow {
  start: Date;
  end: Date | null;
}

@Injectable()
export class StravaChallengeProjectionService {
  private readonly logger = new Logger(StravaChallengeProjectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async rebuildUserProgress(userId: string, externalConnectionId?: string) {
    const participations = await this.prisma.challengeParticipation.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        source_provider: FitnessProvider.STRAVA,
        ...(externalConnectionId
          ? { external_connection_id: externalConnectionId }
          : {}),
        status: {
          notIn: [
            ParticipationStatus.ABANDONED,
            ParticipationStatus.DISQUALIFIED,
          ],
        },
      },
      include: {
        challenge: {
          include: {
            metrics: { orderBy: { sequence: 'asc' } },
            checkpoints: { orderBy: { sequence: 'asc' } },
            pathConfig: true,
          },
        },
        checkpointProgress: true,
        journeyLogs: {
          where: {
            event_type: { in: ['challenge_paused', 'challenge_resumed'] },
          },
          select: {
            event_type: true,
            created_at: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!participations.length) {
      return {
        success: true,
        message: 'No Strava-backed participations found for projection',
        data: {
          affectedChallenges: 0,
          updatedParticipations: 0,
        },
      };
    }

    const connectionIds = Array.from(
      new Set(
        participations
          .map((participation) => participation.external_connection_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const activities = await this.prisma.syncedActivity.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        provider: FitnessProvider.STRAVA,
        ...(connectionIds.length
          ? { external_connection_id: { in: connectionIds } }
          : {}),
      },
      orderBy: [{ activity_date: 'asc' }, { created_at: 'asc' }],
    });

    const touchedChallengeIds = new Set<string>();
    let updatedParticipations = 0;

    for (const participation of participations) {
      if (!participation.started_at) {
        continue;
      }

      const pauseWindows = this.buildPauseWindows(
        participation.journeyLogs,
        participation.started_at,
      );

      const relevantActivities = activities.filter((activity) => {
        if (activity.activity_date < participation.started_at!) return false;
        if (
          !this.matchesChallengeCategory(
            participation.challenge.category,
            activity,
          )
        ) {
          return false;
        }
        if (
          participation.external_connection_id &&
          activity.external_connection_id &&
          activity.external_connection_id !==
            participation.external_connection_id
        ) {
          return false;
        }
        if (this.isWithinPauseWindow(activity.activity_date, pauseWindows)) {
          return false;
        }
        return true;
      });

      const projection = this.calculateParticipationProjection(
        participation,
        relevantActivities,
      );

      await this.persistParticipationProjection(
        participation.id,
        projection,
        participation.status,
      );
      touchedChallengeIds.add(participation.challenge_id);
      updatedParticipations += 1;
    }

    for (const challengeId of touchedChallengeIds) {
      await this.rebuildChallengeLeaderboard(challengeId);
    }

    return {
      success: true,
      message: 'Strava challenge projection rebuilt successfully',
      data: {
        affectedChallenges: touchedChallengeIds.size,
        updatedParticipations,
      },
    };
  }

  private calculateParticipationProjection(
    participation: {
      id: string;
      joined_at: Date;
      started_at: Date | null;
      completed_at: Date | null;
      challenge: {
        category: ChallengeCategory;
        metrics: Array<{
          id: string;
          metric_type: MetricType;
          sequence: number;
          target_value: Prisma.Decimal;
          min_threshold: Prisma.Decimal | null;
          is_required: boolean;
        }>;
        checkpoints: Array<{
          id: string;
          sequence: number;
          title: string;
          metric_targets: Prisma.JsonValue;
          is_required: boolean;
          is_visible: boolean;
          unlock_after_checkpoint_seq: number | null;
        }>;
      };
    },
    activities: Array<{
      id: string;
      activity_date: Date;
      sport_type: string | null;
      distance_m: Prisma.Decimal | null;
      elevation_gain_m: Prisma.Decimal | null;
      elapsed_time_sec: number | null;
      moving_time_sec: number | null;
      raw_payload: Prisma.JsonValue | null;
    }>,
  ): ParticipationProjectionResult {
    const totals: ActivityMetricMap = {
      DISTANCE_KM: 0,
      ELEVATION_M: 0,
      DURATION_MIN: 0,
      CALORIES: 0,
    };

    const metricFirstReachedAt = new Map<MetricType, Date | null>();
    const metricCompletionActivityId = new Map<MetricType, string | null>();

    const checkpointStates: CheckpointProjectionState[] =
      participation.challenge.checkpoints.map((checkpoint) => ({
        checkpointId: checkpoint.id,
        sequence: checkpoint.sequence,
        status: CheckpointStatus.LOCKED,
        startedAt: null as Date | null,
        completedAt: null as Date | null,
        completedByActivityId: null as string | null,
        metricValues: { ...totals },
        isRequired: checkpoint.is_required,
        isVisible: checkpoint.is_visible,
        unlockAfterCheckpointSeq: checkpoint.unlock_after_checkpoint_seq,
        metricTargets: this.normalizeMetricTargets(checkpoint.metric_targets),
      }));

    const activityContributions: ActivityContribution[] = [];
    let firstStartedAt = participation.started_at || null;
    let lastRelevantActivityAt = participation.completed_at || null;

    for (const activity of activities) {
      const contribution = this.buildActivityContribution(activity);
      const hasContribution = Object.values(contribution).some(
        (value) => Number(value || 0) > 0,
      );

      if (!hasContribution) {
        continue;
      }

      this.addContribution(totals, contribution);
      activityContributions.push({
        activityId: activity.id,
        activityDate: activity.activity_date,
        countedMetrics: contribution,
      });

      if (!firstStartedAt) {
        firstStartedAt = activity.activity_date;
      }
      lastRelevantActivityAt = activity.activity_date;

      for (const metric of participation.challenge.metrics) {
        const key = this.metricKey(metric.metric_type);
        const target = this.metricTargetForMetric(
          metric.metric_type,
          metric.target_value,
        );
        if (!target || metricFirstReachedAt.get(metric.metric_type)) {
          continue;
        }

        const currentValue = totals[key];
        if (currentValue >= target) {
          metricFirstReachedAt.set(metric.metric_type, activity.activity_date);
          metricCompletionActivityId.set(metric.metric_type, activity.id);
        }
      }

      for (const checkpoint of checkpointStates) {
        if (checkpoint.completedAt) {
          continue;
        }

        if (!this.isCheckpointUnlocked(checkpoint, checkpointStates)) {
          continue;
        }

        checkpoint.startedAt = checkpoint.startedAt || activity.activity_date;
        checkpoint.metricValues = { ...totals };

        if (this.meetsTargets(checkpoint.metricTargets, totals)) {
          checkpoint.status = CheckpointStatus.COMPLETED;
          checkpoint.completedAt = activity.activity_date;
          checkpoint.completedByActivityId = activity.id;
        }
      }
    }

    const requiredCheckpoints = checkpointStates.filter(
      (checkpoint) => checkpoint.isRequired,
    );
    const completedRequiredCheckpoints = requiredCheckpoints.filter(
      (checkpoint) => checkpoint.status === CheckpointStatus.COMPLETED,
    );

    const challengeMetrics = participation.challenge.metrics.filter(
      (metric) => metric.is_required,
    );
    const metricsComplete = challengeMetrics.length
      ? challengeMetrics.every((metric) => {
          const key = this.metricKey(metric.metric_type);
          const target = this.metricTargetForMetric(
            metric.metric_type,
            metric.target_value,
          );
          return target ? totals[key] >= target : true;
        })
      : true;

    const checkpointsComplete = requiredCheckpoints.length
      ? completedRequiredCheckpoints.length === requiredCheckpoints.length
      : true;

    const hasCompletionRules =
      challengeMetrics.length > 0 || requiredCheckpoints.length > 0;
    const isChallengeComplete = hasCompletionRules
      ? metricsComplete && checkpointsComplete
      : false;

    const progressPercent = requiredCheckpoints.length
      ? Math.min(
          100,
          Math.round(
            (completedRequiredCheckpoints.length / requiredCheckpoints.length) *
              10000,
          ) / 100,
        )
      : challengeMetrics.length
        ? Math.min(
            100,
            Math.round(
              (challengeMetrics.reduce((sum, metric) => {
                const key = this.metricKey(metric.metric_type);
                const target =
                  this.metricTargetForMetric(
                    metric.metric_type,
                    metric.target_value,
                  ) || 0;
                const ratio = target > 0 ? totals[key] / target : 0;
                return sum + Math.min(1, ratio);
              }, 0) /
                challengeMetrics.length) *
                10000,
            ) / 100,
          )
        : 0;

    const activeCheckpointSeq =
      requiredCheckpoints.find(
        (checkpoint) => checkpoint.status !== CheckpointStatus.COMPLETED,
      )?.sequence ||
      (requiredCheckpoints[requiredCheckpoints.length - 1]?.sequence ?? null);

    let activeAssigned = false;
    for (const checkpoint of checkpointStates) {
      const unlocked = this.isCheckpointUnlocked(checkpoint, checkpointStates);
      if (checkpoint.status === CheckpointStatus.COMPLETED) {
        continue;
      }

      if (unlocked && !activeAssigned) {
        checkpoint.status = CheckpointStatus.ACTIVE;
        activeAssigned = true;
      } else {
        checkpoint.status = CheckpointStatus.LOCKED;
      }
    }

    const completedAt = isChallengeComplete
      ? lastRelevantActivityAt || participation.completed_at || null
      : null;

    return {
      totals,
      progressPercent,
      startedAt: firstStartedAt,
      completedAt,
      isChallengeComplete,
      activeCheckpointSeq,
      checkpointStates,
      activityContributions,
    };
  }

  private async persistParticipationProjection(
    participationId: string,
    projection: ParticipationProjectionResult,
    existingStatus: ParticipationStatus,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const participation = await tx.challengeParticipation.findUnique({
        where: { id: participationId },
        select: { id: true, challenge_id: true, user_id: true },
      });

      if (!participation) {
        return;
      }

      await tx.challengeActivityLink.deleteMany({
        where: { participation_id: participationId },
      });

      await tx.challengeCheckpointProgress.deleteMany({
        where: { participation_id: participationId },
      });

      if (projection.checkpointStates.length) {
        await tx.challengeCheckpointProgress.createMany({
          data: projection.checkpointStates.map((checkpoint) => ({
            participation_id: participationId,
            checkpoint_id: checkpoint.checkpointId,
            status: checkpoint.status,
            started_at: checkpoint.startedAt,
            completed_at: checkpoint.completedAt,
            metric_values: checkpoint.metricValues,
            completed_by_activity_id: checkpoint.completedByActivityId,
            source_provider: FitnessProvider.STRAVA,
            metadata: {
              auto_projected: true,
            },
          })),
        });
      }

      if (projection.activityContributions.length) {
        await tx.challengeActivityLink.createMany({
          data: projection.activityContributions.map((contribution) => ({
            participation_id: participationId,
            activity_id: contribution.activityId,
            counted_metrics: contribution.countedMetrics,
            is_counted: true,
            checkpoint_id: contribution.completedCheckpointId || null,
          })),
        });
      }

      await tx.challengeParticipation.update({
        where: { id: participationId },
        data: {
          status: projection.isChallengeComplete
            ? ParticipationStatus.COMPLETED
            : existingStatus === ParticipationStatus.PAUSED
              ? ParticipationStatus.PAUSED
              : projection.startedAt
              ? ParticipationStatus.IN_PROGRESS
              : ParticipationStatus.JOINED,
          started_at: projection.startedAt,
          completed_at: projection.completedAt,
          last_activity_at:
            projection.activityContributions.at(-1)?.activityDate || null,
          last_synced_at: new Date(),
          progress_percent: projection.progressPercent,
          metric_values: projection.totals,
          active_checkpoint_seq: projection.activeCheckpointSeq,
        },
      });
    });
  }

  private async rebuildChallengeLeaderboard(challengeId: string) {
    const rows = await this.prisma.challengeParticipation.findMany({
      where: {
        challenge_id: challengeId,
        deleted_at: null,
        status: {
          notIn: [
            ParticipationStatus.ABANDONED,
            ParticipationStatus.DISQUALIFIED,
          ],
        },
      },
      select: {
        id: true,
        user_id: true,
        joined_at: true,
        started_at: true,
        status: true,
        progress_percent: true,
        metric_values: true,
        completed_at: true,
        challenge_id: true,
      },
      orderBy: [
        { completed_at: 'asc' },
        { progress_percent: 'desc' },
        { started_at: 'asc' },
        { joined_at: 'asc' },
      ],
    });

    const participationIds = rows.map((row) => row.id);
    const pauseLogs = participationIds.length
      ? await this.prisma.challengeJourneyLog.findMany({
          where: {
            participation_id: { in: participationIds },
            event_type: { in: ['challenge_paused', 'challenge_resumed'] },
          },
          select: {
            participation_id: true,
            event_type: true,
            created_at: true,
          },
          orderBy: { created_at: 'asc' },
        })
      : [];

    const pauseLogsByParticipation = pauseLogs.reduce(
      (acc, log) => {
        if (!acc[log.participation_id]) {
          acc[log.participation_id] = [];
        }
        acc[log.participation_id].push(log);
        return acc;
      },
      {} as Record<
        string,
        Array<{
          event_type: string | null;
          created_at: Date;
        }>
      >,
    );

    const sorted = rows
      .map((row) => ({
        ...row,
        progressPercent: Number(row.progress_percent || 0),
        finishedAt: row.completed_at,
      }))
      .sort((a, b) => {
        const aDone = Boolean(a.finishedAt);
        const bDone = Boolean(b.finishedAt);
        if (aDone !== bDone) return aDone ? -1 : 1;
        if (aDone && bDone) {
          return (
            new Date(a.finishedAt!).getTime() -
            new Date(b.finishedAt!).getTime()
          );
        }
        if (a.progressPercent !== b.progressPercent) {
          return b.progressPercent - a.progressPercent;
        }

        const aStartedAt = a.started_at || a.joined_at;
        const bStartedAt = b.started_at || b.joined_at;
        const aStart = new Date(aStartedAt).getTime();
        const bStart = new Date(bStartedAt).getTime();
        if (aStart !== bStart) {
          return aStart - bStart;
        }

        return (
          new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
      });

    await this.prisma.$transaction(async (tx) => {
      const activeUserIds = sorted.map((row) => row.user_id);

      for (let index = 0; index < sorted.length; index += 1) {
        const row = sorted[index];
        const effectiveStartAt = row.started_at || row.joined_at;
        const pausedDurationSec = row.finishedAt
          ? this.calculatePausedDurationSec(
              pauseLogsByParticipation[row.id] || [],
              effectiveStartAt,
              row.finishedAt,
            )
          : 0;
        const finishTimeSec = row.finishedAt
          ? Math.max(
              0,
              Math.floor(
                (new Date(row.finishedAt).getTime() -
                  new Date(effectiveStartAt).getTime()) /
                  1000 -
                  pausedDurationSec,
              ),
            )
          : null;

        await tx.challengeLeaderboard.upsert({
          where: {
            challenge_id_user_id: {
              challenge_id: challengeId,
              user_id: row.user_id,
            },
          },
          create: {
            challenge_id: challengeId,
            user_id: row.user_id,
            rank: index + 1,
            progress_percent: new Prisma.Decimal(row.progressPercent),
            metric_values: row.metric_values,
            finished_at: row.finishedAt,
            finish_time_sec: finishTimeSec,
            source_provider: FitnessProvider.STRAVA,
          },
          update: {
            rank: index + 1,
            progress_percent: new Prisma.Decimal(row.progressPercent),
            metric_values: row.metric_values,
            finished_at: row.finishedAt,
            finish_time_sec: finishTimeSec,
            source_provider: FitnessProvider.STRAVA,
          },
        });
      }

      if (activeUserIds.length > 0) {
        await tx.challengeLeaderboard.deleteMany({
          where: {
            challenge_id: challengeId,
            user_id: { notIn: activeUserIds },
          },
        });
      } else {
        await tx.challengeLeaderboard.deleteMany({
          where: { challenge_id: challengeId },
        });
      }

      await tx.challenges.update({
        where: { id: challengeId },
        data: {
          participants_completed: await tx.challengeParticipation.count({
            where: {
              challenge_id: challengeId,
              status: ParticipationStatus.COMPLETED,
            },
          }),
        },
      });
    });
  }

  private buildActivityContribution(activity: {
    distance_m: Prisma.Decimal | null;
    elevation_gain_m: Prisma.Decimal | null;
    elapsed_time_sec: number | null;
    moving_time_sec: number | null;
    raw_payload: Prisma.JsonValue | null;
  }): Partial<ActivityMetricMap> {
    const raw = (activity.raw_payload || {}) as Record<string, any>;
    const distanceKm = this.toNumber(activity.distance_m) / 1000;
    const elevationM = this.toNumber(activity.elevation_gain_m);
    const durationSec =
      activity.moving_time_sec ??
      activity.elapsed_time_sec ??
      raw?.moving_time ??
      raw?.elapsed_time;
    const durationMin = Number(durationSec || 0) / 60;
    const calories = Number(raw?.calories || raw?.kiloCalories || 0);

    return {
      DISTANCE_KM: distanceKm > 0 ? distanceKm : 0,
      ELEVATION_M: elevationM > 0 ? elevationM : 0,
      DURATION_MIN: durationMin > 0 ? durationMin : 0,
      CALORIES: calories > 0 ? calories : 0,
    };
  }

  private metricKey(metricType: MetricType): keyof ActivityMetricMap {
    return metricType as keyof ActivityMetricMap;
  }

  private metricTargetForMetric(
    metricType: MetricType,
    target: Prisma.Decimal,
  ): number {
    return this.toNumber(target);
  }

  private normalizeMetricTargets(
    metricTargets: Prisma.JsonValue,
  ): Record<string, number> {
    if (!metricTargets || typeof metricTargets !== 'object') {
      return {};
    }

    return Object.entries(metricTargets as Record<string, any>).reduce(
      (acc, [key, value]) => {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          acc[key] = numeric;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private buildPauseWindows(
    logs: Array<{ event_type: string | null; created_at: Date }>,
    startedAt: Date,
  ): PauseWindow[] {
    const windows: PauseWindow[] = [];
    let activePauseStart: Date | null = null;

    for (const log of logs) {
      if (log.created_at < startedAt) {
        continue;
      }

      if (log.event_type === 'challenge_paused') {
        if (!activePauseStart) {
          activePauseStart = log.created_at;
        }
        continue;
      }

      if (log.event_type === 'challenge_resumed') {
        if (activePauseStart) {
          windows.push({
            start: activePauseStart,
            end: log.created_at,
          });
          activePauseStart = null;
        }
      }
    }

    if (activePauseStart) {
      windows.push({
        start: activePauseStart,
        end: null,
      });
    }

    return windows;
  }

  private isWithinPauseWindow(activityDate: Date, windows: PauseWindow[]) {
    return windows.some((window) => {
      if (activityDate < window.start) {
        return false;
      }
      if (!window.end) {
        return true;
      }
      return activityDate < window.end;
    });
  }

  private calculatePausedDurationSec(
    logs: Array<{ event_type: string | null; created_at: Date }>,
    startedAt: Date,
    endedAt: Date,
  ) {
    const windows = this.buildPauseWindows(logs, startedAt);

    return windows.reduce((sum, window) => {
      const start = window.start.getTime();
      const end = (window.end || endedAt).getTime();
      const boundedStart = Math.max(start, startedAt.getTime());
      const boundedEnd = Math.min(end, endedAt.getTime());
      if (boundedEnd <= boundedStart) {
        return sum;
      }
      return sum + Math.floor((boundedEnd - boundedStart) / 1000);
    }, 0);
  }

  private isCheckpointUnlocked(
    checkpoint: CheckpointProjectionState,
    checkpointStates: CheckpointProjectionState[],
  ) {
    if (checkpoint.sequence === 1) {
      return true;
    }

    if (checkpoint.unlockAfterCheckpointSeq) {
      return checkpointStates.some(
        (state) =>
          state.sequence === checkpoint.unlockAfterCheckpointSeq &&
          state.status === CheckpointStatus.COMPLETED,
      );
    }

    const previousRequired = checkpointStates.filter(
      (state) => state.sequence < checkpoint.sequence && state.isRequired,
    );

    return previousRequired.every(
      (state) => state.status === CheckpointStatus.COMPLETED,
    );
  }

  private meetsTargets(
    targets: Record<string, number>,
    totals: ActivityMetricMap,
  ) {
    const entries = Object.entries(targets);
    if (!entries.length) {
      return false;
    }

    return entries.every(([key, target]) => {
      const current = totals[key as keyof ActivityMetricMap] ?? 0;
      return current >= Number(target || 0);
    });
  }

  private addContribution(
    totals: ActivityMetricMap,
    contribution: Partial<ActivityMetricMap>,
  ) {
    (Object.keys(contribution) as Array<keyof ActivityMetricMap>).forEach(
      (key) => {
        totals[key] += Number(contribution[key] || 0);
      },
    );
  }

  private toNumber(value: Prisma.Decimal | number | string | null | undefined) {
    if (value === null || value === undefined) return 0;
    const numeric = Number(value.toString());
    return Number.isNaN(numeric) ? 0 : numeric;
  }

  private matchesChallengeCategory(
    category: ChallengeCategory,
    activity: {
      sport_type: string | null;
      raw_payload: Prisma.JsonValue | null;
    },
  ) {
    const sportType = String(
      activity.sport_type || (activity.raw_payload as any)?.type || '',
    ).toLowerCase();

    if (!sportType) {
      return true;
    }

    switch (category) {
      case ChallengeCategory.RUNNING:
        return /(run|walk|hike|trail)/.test(sportType);
      case ChallengeCategory.CYCLING:
        return /(ride|cycling|bike)/.test(sportType);
      case ChallengeCategory.SWIMMING:
        return /(swim)/.test(sportType);
      case ChallengeCategory.HIIT:
      case ChallengeCategory.OTHER:
      default:
        return true;
    }
  }
}
