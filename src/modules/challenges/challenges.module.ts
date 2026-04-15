import { Module } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConversationsModule } from 'src/modules/chat/conversations/conversations.module';
import { StravaModule } from '../application/strava/strava.module';

@Module({
  imports: [PrismaModule, ConversationsModule, StravaModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
