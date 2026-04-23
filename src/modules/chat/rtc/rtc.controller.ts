// import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
// import {
//   ApiBearerAuth,
//   ApiBody,
//   ApiExcludeController,
//   ApiOkResponse,
//   ApiOperation,
//   ApiParam,
//   ApiTags,
// } from '@nestjs/swagger';
// import { RtcService } from './rtc.service';
// import { CallKind } from '@prisma/client';
// import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
// import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';
// import { RealtimeGateway } from '../realtime/realtime.gateway';

// @ApiTags('chat-rtc')
// @ApiBearerAuth('user_token')
// @ApiBearerAuth('admin_token')
// @Controller('rtc')
// @ApiExcludeController() // Hide from Swagger docs
// export class RtcController {
//   constructor(
//     private readonly rtcService: RtcService,
//     private readonly realtimeGateway: RealtimeGateway,
//   ) {}

//   // Start a call explicitly (group or dm)
//   @Post('conversations/:id/start')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Start call for a conversation' })
//   @ApiParam({
//     name: 'id',
//     description: 'Conversation id',
//     example: 'cmmlk8qn20002v8xsglb2csrh',
//   })
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         kind: { type: 'string', enum: ['AUDIO', 'VIDEO'], example: 'VIDEO' },
//       },
//     },
//   })
//   @ApiOkResponse({ description: 'Call started successfully.' })
//   async startCall(
//     @GetUser() user: any,
//     @Param('id') conversationId: string,
//     @Body() body: { kind?: CallKind },
//   ) {
//     const kind = body.kind || 'VIDEO';
//     const resp = await this.rtcService.startCall(
//       conversationId,
//       user.userId,
//       kind,
//     );

//     const memberIds =
//       await this.rtcService.getConversationMemberIds(conversationId);
//     const recipients = memberIds.filter((id) => id !== user.userId);
//     this.realtimeGateway.emitCallIncoming(
//       conversationId,
//       user.userId,
//       kind,
//       recipients,
//     );

//     return resp;
//   }

//   // Join existing call (fails if none active)
//   @Post('conversations/:id/join')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Join active call in a conversation' })
//   @ApiParam({
//     name: 'id',
//     description: 'Conversation id',
//     example: 'cmmlk8qn20002v8xsglb2csrh',
//   })
//   @ApiOkResponse({ description: 'Joined call successfully.' })
//   async joinCall(@GetUser() user: any, @Param('id') conversationId: string) {
//     const resp = await this.rtcService.joinCall(conversationId, user.userId);
//     return resp;
//   }

//   // Leave call (any member for now from group call only)
//   @Post('conversations/:id/leave')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'Leave active call' })
//   @ApiParam({
//     name: 'id',
//     description: 'Conversation id',
//     example: 'cmmlk8qn20002v8xsglb2csrh',
//   })
//   @ApiOkResponse({ description: 'Left call successfully.' })
//   async leaveCall(@GetUser() user: any, @Param('id') conversationId: string) {
//     const resp = await this.rtcService.leaveCall(conversationId, user.userId);
//     return resp;
//   }

//   // End call (any member for now)
//   @Post('conversations/:id/end')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({ summary: 'End active call for a conversation' })
//   @ApiParam({
//     name: 'id',
//     description: 'Conversation id',
//     example: 'cmmlk8qn20002v8xsglb2csrh',
//   })
//   @ApiOkResponse({ description: 'Call ended successfully.' })
//   async endCall(@GetUser() user: any, @Param('id') conversationId: string) {
//     const resp = await this.rtcService.endCall(conversationId, user.userId);

//     const memberIds =
//       await this.rtcService.getConversationMemberIds(conversationId);
//     const recipients = memberIds.filter((id) => id !== user.userId);
//     this.realtimeGateway.emitCallEnded(conversationId, user.userId, recipients);

//     return resp;
//   }

//   // Convenience: issue token bound to conversation call (auto-start if not active)
//   @Post('conversations/:id/token')
//   @UseGuards(JwtAuthGuard)
//   @ApiOperation({
//     summary: 'Issue LiveKit token for current user in conversation',
//   })
//   @ApiParam({
//     name: 'id',
//     description: 'Conversation id',
//     example: 'cmmlk8qn20002v8xsglb2csrh',
//   })
//   @ApiOkResponse({ description: 'Call token issued successfully.' })
//   async issueConversationToken(
//     @GetUser() user: any,
//     @Param('id') conversationId: string,
//   ) {
//     const data = await this.rtcService.issueCallToken(
//       conversationId,
//       user.userId,
//     );
//     return { success: true, data };
//   }

//   @Get('health')
//   @ApiOperation({ summary: 'RTC service health check' })
//   @ApiOkResponse({ description: 'RTC health status.' })
//   health() {
//     return this.rtcService.health();
//   }
// }
