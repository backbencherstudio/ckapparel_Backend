import { Module } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { ConversationsModule } from 'src/modules/chat/conversations/conversations.module';
import { RoutePlanningController } from './route-planning.controller';

@Module({
  imports: [ConversationsModule],
  controllers: [ChallengesController, RoutePlanningController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
