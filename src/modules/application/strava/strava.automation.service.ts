import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import appConfig from '../../../config/app.config';
import { StravaService } from './strava.service';

@Injectable()
export class StravaAutomationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StravaAutomationService.name);

  constructor(private readonly stravaService: StravaService) {}

  async onApplicationBootstrap() {
    const cfg = appConfig().strava;

    if (!cfg.auto_webhook_subscribe) {
      this.logger.log('Strava auto webhook subscription is disabled.');
      return;
    }

    try {
      const result = await this.stravaService.ensureWebhookSubscription();
      this.logger.log(
        `Strava webhook bootstrap result: ${JSON.stringify(result)}`,
      );
    } catch (error) {
      this.logger.warn(
        `Strava webhook bootstrap failed: ${error?.message || 'unknown error'}`,
      );
    }
  }

  @Cron(process.env.STRAVA_AUTO_SYNC_CRON || '*/30 * * * *')
  async handleAutoSync() {
    const cfg = appConfig().strava;

    if (!cfg.auto_sync_enabled) {
      return;
    }

    this.logger.log('Starting Strava auto sync run...');

    try {
      const result = await this.stravaService.syncAllActiveConnections();
      this.logger.log(`Strava auto sync completed: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.warn(
        `Strava auto sync failed: ${error?.message || 'unknown error'}`,
      );
    }
  }
}
