import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { RealtimeModule } from './realtime/realtime.module';
// import { RtcModule } from './rtc/rtc.module';

@Module({
  imports: [
    UsersModule,
    ConversationsModule,
    MessagesModule,
    RealtimeModule,
    // RtcModule,
  ],
})
export class ChatModule {}
