import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios, { AxiosInstance } from 'axios';
import { FitnessProvider, Prisma, SyncedActivityStatus } from '@prisma/client';
import appConfig from '../../../config/app.config';
import { PrismaService } from '../../../prisma/prisma.service';
import { StravaSyncDto } from './dto/strava-sync.dto';
import { StravaChallengeProjectionService } from './strava-challenge-projection.service';

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id?: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    profile?: string;
    profile_medium?: string;
  };
};

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);
  private readonly stravaApi: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly stravaChallengeProjectionService: StravaChallengeProjectionService,
  ) {
    this.stravaApi = axios.create({
      baseURL: appConfig().strava.api_v3,
      timeout: 15000,
    });
  }

  private get requiredConfig() {
    const cfg = appConfig().strava;
    if (!cfg.client_id || !cfg.client_secret || !cfg.callback_url) {
      throw new BadRequestException(
        'Strava is not configured. Please set STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET and STRAVA_CALLBACK_URL.',
      );
    }
    return cfg;
  }

  private createState(userId: string, callbackMode: 'redirect' | 'json' = 'redirect') {
    return this.jwtService.sign(
      {
        userId,
        provider: 'STRAVA',
        callbackMode,
      },
      {
        expiresIn: '10m',
      },
    );
  }

  private verifyState(state: string): {
    userId: string;
    provider: string;
    callbackMode?: 'redirect' | 'json';
  } {
    try {
      const decoded = this.jwtService.verify<{
        userId: string;
        provider: string;
        callbackMode?: 'redirect' | 'json';
      }>(state, {
        secret: appConfig().jwt.secret,
      });

      if (!decoded?.userId || decoded.provider !== 'STRAVA') {
        throw new Error('Invalid state payload');
      }

      return decoded;
    } catch {
      throw new BadRequestException('Invalid or expired Strava auth state');
    }
  }

  getAuthUrl(userId: string, callbackMode: 'redirect' | 'json' = 'redirect') {
    const cfg = this.requiredConfig;
    const state = this.createState(userId, callbackMode);
    const params = new URLSearchParams({
      client_id: String(cfg.client_id),
      redirect_uri: cfg.callback_url,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: cfg.scope,
      state,
    });

    return `${cfg.base}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeAndSaveConnection(code: string, state: string) {
    const cfg = this.requiredConfig;
    const decoded = this.verifyState(state);

    const payload = new URLSearchParams({
      client_id: String(cfg.client_id),
      client_secret: cfg.client_secret,
      code,
      grant_type: 'authorization_code',
    });

    const { data } = await axios.post<StravaTokenResponse>(
      `${cfg.api_v3}/oauth/token`,
      payload.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const athleteId = data?.athlete?.id ? String(data.athlete.id) : null;

    const connection = await this.prisma.externalConnection.upsert({
      where: {
        user_id_provider: {
          user_id: decoded.userId,
          provider: FitnessProvider.STRAVA,
        },
      },
      create: {
        user_id: decoded.userId,
        provider: FitnessProvider.STRAVA,
        provider_user_id: athleteId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: new Date(data.expires_at * 1000),
        scope: cfg.scope,
        is_active: true,
        metadata: {
          athlete: data.athlete || null,
        },
      },
      update: {
        provider_user_id: athleteId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: new Date(data.expires_at * 1000),
        scope: cfg.scope,
        is_active: true,
        deleted_at: null,
        metadata: {
          athlete: data.athlete || null,
        },
      },
    });

    return {
      connection,
      callbackMode: decoded.callbackMode || 'redirect',
    };
  }

  async getConnectionStatus(userId: string) {
    const connection = await this.prisma.externalConnection.findFirst({
      where: {
        user_id: userId,
        provider: FitnessProvider.STRAVA,
        is_active: true,
      },
      select: {
        id: true,
        provider: true,
        provider_user_id: true,
        scope: true,
        is_active: true,
        token_expires_at: true,
        last_sync_at: true,
        created_at: true,
        updated_at: true,
        metadata: true,
      },
    });

    return {
      success: true,
      data: {
        connected: !!connection,
        connection,
      },
    };
  }

  private async refreshAccessToken(connectionId: string) {
    const cfg = this.requiredConfig;
    const connection = await this.prisma.externalConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.refresh_token) {
      throw new NotFoundException('No active Strava connection found');
    }

    const payload = new URLSearchParams({
      client_id: String(cfg.client_id),
      client_secret: cfg.client_secret,
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    });

    const { data } = await axios.post<StravaTokenResponse>(
      `${cfg.api_v3}/oauth/token`,
      payload.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const updated = await this.prisma.externalConnection.update({
      where: { id: connectionId },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_expires_at: new Date(data.expires_at * 1000),
        is_active: true,
        deleted_at: null,
      },
    });

    return updated;
  }

  private async findActiveConnectionByProviderUserId(providerUserId: string) {
    return this.prisma.externalConnection.findFirst({
      where: {
        provider: FitnessProvider.STRAVA,
        provider_user_id: providerUserId,
        is_active: true,
      },
    });
  }

  private async upsertSyncedActivityRecord(
    connection: {
      id: string;
      user_id: string;
      access_token: string | null;
    },
    activity: any,
  ) {
    const providerActivityId = String(activity.id);
    const activityDate = activity.start_date ? new Date(activity.start_date) : new Date();

    const distanceMeters =
      activity.distance !== undefined && activity.distance !== null
        ? new Prisma.Decimal(activity.distance)
        : null;
    const elevationGainMeters =
      activity.total_elevation_gain !== undefined &&
      activity.total_elevation_gain !== null
        ? new Prisma.Decimal(activity.total_elevation_gain)
        : null;
    const averageSpeedMps =
      activity.average_speed !== undefined && activity.average_speed !== null
        ? new Prisma.Decimal(activity.average_speed)
        : null;

    return this.prisma.syncedActivity.upsert({
      where: {
        provider_provider_activity_id: {
          provider: FitnessProvider.STRAVA,
          provider_activity_id: providerActivityId,
        },
      },
      create: {
        user_id: connection.user_id,
        external_connection_id: connection.id,
        provider: FitnessProvider.STRAVA,
        provider_activity_id: providerActivityId,
        name: activity.name || null,
        sport_type: activity.sport_type || activity.type || null,
        activity_date: activityDate,
        distance_m: distanceMeters,
        elevation_gain_m: elevationGainMeters,
        average_speed_mps: averageSpeedMps,
        elapsed_time_sec: activity.elapsed_time ?? null,
        moving_time_sec: activity.moving_time ?? null,
        raw_payload: activity,
        status: SyncedActivityStatus.PROCESSED,
        processed_at: new Date(),
      },
      update: {
        user_id: connection.user_id,
        external_connection_id: connection.id,
        name: activity.name || null,
        sport_type: activity.sport_type || activity.type || null,
        activity_date: activityDate,
        distance_m: distanceMeters,
        elevation_gain_m: elevationGainMeters,
        average_speed_mps: averageSpeedMps,
        elapsed_time_sec: activity.elapsed_time ?? null,
        moving_time_sec: activity.moving_time ?? null,
        raw_payload: activity,
        status: SyncedActivityStatus.PROCESSED,
        processed_at: new Date(),
        deleted_at: null,
      },
      select: { id: true },
    });
  }

  private async getValidConnection(userId: string, externalConnectionId?: string) {
    const where: Prisma.ExternalConnectionWhereInput = {
      user_id: userId,
      provider: FitnessProvider.STRAVA,
      is_active: true,
    };

    if (externalConnectionId) {
      where.id = externalConnectionId;
    }

    let connection = await this.prisma.externalConnection.findFirst({ where });

    if (!connection) {
      throw new NotFoundException('Active Strava connection not found');
    }

    const nowPlusOneHour = Date.now() + 3600 * 1000;
    const expiresAt = connection.token_expires_at?.getTime() || 0;

    if (!connection.access_token || expiresAt <= nowPlusOneHour) {
      connection = await this.refreshAccessToken(connection.id);
    }

    return connection;
  }

  async syncActivities(userId: string, dto: StravaSyncDto) {
    const connection = await this.getValidConnection(userId, dto.externalConnectionId);

    const perPage = dto.perPage ?? 50;
    const startPage = dto.page ?? 1;
    const maxPages = dto.maxPages ?? 1;

    let synced = 0;
    let page = startPage;
    const syncedActivityIds: string[] = [];

    for (let i = 0; i < maxPages; i++) {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };

      if (dto.after) params.after = dto.after;
      if (dto.before) params.before = dto.before;

      const response = await this.stravaApi.get('/athlete/activities', {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
        params,
      });

      const activities: any[] = response.data || [];

      if (!activities.length) {
        break;
      }

      for (const activity of activities) {
        const upserted = await this.upsertSyncedActivityRecord(connection, activity);

        syncedActivityIds.push(upserted.id);
      }

      synced += activities.length;
      page += 1;

      if (activities.length < perPage) {
        break;
      }
    }

    await this.prisma.externalConnection.update({
      where: { id: connection.id },
      data: { last_sync_at: new Date() },
    });

    try {
      await this.stravaChallengeProjectionService.rebuildUserProgress(
        userId,
        connection.id,
      );
    } catch (error) {
      this.logger.warn(
        `Strava projection rebuild failed after sync for user ${userId}: ${error?.message || 'unknown error'}`,
      );
    }

    return {
      success: true,
      message: 'Strava activities synced successfully',
      data: {
        synced,
        syncedActivityIds,
        nextPage: page,
      },
    };
  }

  async disconnect(userId: string) {
    const cfg = this.requiredConfig;

    const connection = await this.prisma.externalConnection.findFirst({
      where: {
        user_id: userId,
        provider: FitnessProvider.STRAVA,
        is_active: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Active Strava connection not found');
    }

    if (connection.access_token) {
      try {
        const payload = new URLSearchParams({
          access_token: connection.access_token,
        });

        await axios.post(`${cfg.base}/oauth/deauthorize`, payload.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      } catch (error) {
        // Continue local cleanup even if remote deauth fails.
      }
    }

    await this.prisma.externalConnection.update({
      where: { id: connection.id },
      data: {
        is_active: false,
        deleted_at: new Date(),
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
      },
    });

    return {
      success: true,
      message: 'Strava disconnected successfully',
    };
  }

  validateWebhookChallenge(verifyToken: string, challenge: string) {
    const configuredToken = appConfig().strava.webhook_verify_token;

    if (!configuredToken) {
      throw new BadRequestException(
        'STRAVA_WEBHOOK_VERIFY_TOKEN is not configured',
      );
    }

    if (verifyToken !== configuredToken) {
      throw new ForbiddenException('Invalid Strava webhook verify token');
    }

    return { 'hub.challenge': challenge };
  }

  async processWebhookEvent(event: any) {
    try {
      // Deauthorization event: mark the connection inactive.
      if (
        event?.object_type === 'athlete' &&
        String(event?.updates?.authorized) === 'false'
      ) {
        await this.prisma.externalConnection.updateMany({
          where: {
            provider: FitnessProvider.STRAVA,
            provider_user_id: String(event.object_id),
          },
          data: {
            is_active: false,
            deleted_at: new Date(),
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
          },
        });
      }

      if (
        event?.object_type === 'activity' &&
        event?.object_id &&
        event?.owner_id
      ) {
        const providerUserId = String(event.owner_id);
        const connection = await this.findActiveConnectionByProviderUserId(
          providerUserId,
        );

        if (!connection) {
          return {
            success: true,
            received: true,
            skipped: true,
            reason: 'No active Strava connection for activity webhook owner',
          };
        }

        if (String(event.aspect_type) === 'delete') {
          await this.prisma.syncedActivity.updateMany({
            where: {
              user_id: connection.user_id,
              external_connection_id: connection.id,
              provider: FitnessProvider.STRAVA,
              provider_activity_id: String(event.object_id),
            },
            data: {
              deleted_at: new Date(),
              status: SyncedActivityStatus.IGNORED,
            },
          });

          try {
            await this.stravaChallengeProjectionService.rebuildUserProgress(
              connection.user_id,
              connection.id,
            );
          } catch (error) {
            this.logger.warn(
              `Strava projection rebuild failed after webhook delete for user ${connection.user_id}: ${error?.message || 'unknown error'}`,
            );
          }

          return {
            success: true,
            received: true,
            processed: true,
            type: 'activity_delete',
          };
        }

        const validConnection = await this.getValidConnection(
          connection.user_id,
          connection.id,
        );

        const { data: activity } = await this.stravaApi.get(
          `/activities/${event.object_id}`,
          {
            headers: {
              Authorization: `Bearer ${validConnection.access_token}`,
            },
          },
        );

        await this.upsertSyncedActivityRecord(validConnection, activity);

        try {
          await this.stravaChallengeProjectionService.rebuildUserProgress(
            validConnection.user_id,
            validConnection.id,
          );
        } catch (error) {
          this.logger.warn(
            `Strava projection rebuild failed after webhook activity sync for user ${validConnection.user_id}: ${error?.message || 'unknown error'}`,
          );
        }

        return {
          success: true,
          received: true,
          processed: true,
          type: 'activity_sync',
        };
      }

      return {
        success: true,
        received: true,
      };
    } catch (error) {
      this.logger.warn(
        `Strava webhook event processing failed: ${error?.message || 'unknown error'}`,
      );

      return {
        success: true,
        received: true,
        processed: false,
        error: error?.message || 'webhook_processing_failed',
      };
    }
  }

  async createWebhookSubscription() {
    const cfg = this.requiredConfig;

    if (!cfg.webhook_callback_url || !cfg.webhook_verify_token) {
      throw new BadRequestException(
        'STRAVA_WEBHOOK_CALLBACK_URL and STRAVA_WEBHOOK_VERIFY_TOKEN are required to create webhook subscription.',
      );
    }

    const payload = new URLSearchParams({
      client_id: String(cfg.client_id),
      client_secret: cfg.client_secret,
      callback_url: cfg.webhook_callback_url,
      verify_token: cfg.webhook_verify_token,
    });

    const { data } = await axios.post(
      `${cfg.api_v3}/push_subscriptions`,
      payload.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return {
      success: true,
      message: 'Strava webhook subscription created',
      data,
    };
  }

  async ensureWebhookSubscription() {
    const cfg = this.requiredConfig;

    if (!cfg.webhook_callback_url || !cfg.webhook_verify_token) {
      return {
        success: false,
        skipped: true,
        message:
          'Auto webhook subscription skipped: STRAVA_WEBHOOK_CALLBACK_URL and STRAVA_WEBHOOK_VERIFY_TOKEN are required.',
      };
    }

    const existing = await this.getWebhookSubscription();
    const list = Array.isArray(existing?.data) ? existing.data : [];

    if (list.length > 0) {
      return {
        success: true,
        created: false,
        message: 'Strava webhook subscription already exists',
        data: list,
      };
    }

    const created = await this.createWebhookSubscription();

    return {
      ...created,
      created: true,
    };
  }

  async getWebhookSubscription() {
    const cfg = this.requiredConfig;

    const { data } = await axios.get(`${cfg.api_v3}/push_subscriptions`, {
      params: {
        client_id: cfg.client_id,
        client_secret: cfg.client_secret,
      },
    });

    return {
      success: true,
      data,
    };
  }

  async deleteWebhookSubscription(id: string) {
    const cfg = this.requiredConfig;

    await axios.delete(`${cfg.api_v3}/push_subscriptions/${id}`, {
      params: {
        client_id: cfg.client_id,
        client_secret: cfg.client_secret,
      },
    });

    return {
      success: true,
      message: 'Strava webhook subscription deleted',
    };
  }

  async syncAllActiveConnections() {
    const cfg = appConfig().strava;
    const perPage = Math.min(Math.max(cfg.auto_sync_per_page || 50, 1), 200);
    const maxPages = Math.min(Math.max(cfg.auto_sync_max_pages || 1, 1), 10);

    const connections = await this.prisma.externalConnection.findMany({
      where: {
        provider: FitnessProvider.STRAVA,
        is_active: true,
      },
      select: {
        id: true,
        user_id: true,
        last_sync_at: true,
      },
      orderBy: {
        updated_at: 'asc',
      },
    });

    const summary = {
      totalConnections: connections.length,
      attempted: 0,
      success: 0,
      failed: 0,
      totalSynced: 0,
      errors: [] as Array<{ connectionId: string; userId: string; message: string }>,
    };

    for (const connection of connections) {
      summary.attempted += 1;

      try {
        const after = connection.last_sync_at
          ? Math.floor(connection.last_sync_at.getTime() / 1000) - 60
          : undefined;

        const result = await this.syncActivities(connection.user_id, {
          externalConnectionId: connection.id,
          after,
          perPage,
          maxPages,
        });

        summary.success += 1;
        summary.totalSynced += result?.data?.synced || 0;
      } catch (error) {
        summary.failed += 1;

        const message = error?.message || 'Unknown sync error';
        summary.errors.push({
          connectionId: connection.id,
          userId: connection.user_id,
          message,
        });

        this.logger.warn(
          `Auto sync failed for connection ${connection.id}: ${message}`,
        );
      }
    }

    return {
      success: true,
      message: 'Strava auto sync run completed',
      data: summary,
    };
  }
}
