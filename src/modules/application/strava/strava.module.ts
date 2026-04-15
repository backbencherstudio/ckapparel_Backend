import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import appConfig from '../../../config/app.config';
import { StravaChallengeProjectionService } from './strava-challenge-projection.service';
import { StravaAutomationService } from './strava.automation.service';
import { StravaController } from './strava.controller';
import { StravaService } from './strava.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: appConfig().jwt.secret,
      }),
    }),
  ],
  controllers: [StravaController],
  providers: [
    StravaService,
    StravaAutomationService,
    StravaChallengeProjectionService,
  ],
  exports: [StravaService, StravaChallengeProjectionService],
})
export class StravaModule {}
