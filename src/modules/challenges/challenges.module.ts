import { Module } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConversationsModule } from 'src/modules/chat/conversations/conversations.module';

@Module({
  imports: [PrismaModule, ConversationsModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
