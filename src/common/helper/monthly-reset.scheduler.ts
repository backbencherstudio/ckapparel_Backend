import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChallengesService } from 'src/modules/admin/challenges/challenges.service';

@Injectable()
export class MonthlyResetScheduler {
  private readonly logger = new Logger(MonthlyResetScheduler.name);

  constructor(private readonly challengesService: ChallengesService) {}

  /**
   * Runs at 00:05 on the 1st day of every month.
   * Cron: '5 0 1 * *' (minute hour day month day-of-week)
   */
  @Cron('5 0 1 * *')
  async handleMonthlyReset() {
    this.logger.log('Starting monthly challenge progress reset...');
    try {
      const result =
        await this.challengesService.resetMonthlyChallengesProgress();
      this.logger.log(`Monthly reset complete: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error('Monthly reset failed', error.stack || error.message);
    }
  }
}
