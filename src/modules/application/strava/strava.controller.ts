import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import appConfig from '../../../config/app.config';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StravaSyncDto } from './dto/strava-sync.dto';
import { StravaService } from './strava.service';

@ApiTags('Strava Integration')
@Controller()
export class StravaController {
  constructor(private readonly stravaService: StravaService) {}

  //   @ApiOperation({
  //     summary: 'Connect Strava (redirect)',
  //     description:
  //       'Generates Strava OAuth authorization URL and redirects authenticated user to Strava consent page. Best for web browser flows. For mobile apps, prefer GET /api/auth/strava/url and open the returned authUrl with in-app browser/deep link handling.',
  //   })
  //   @ApiBearerAuth('user_token')
  //   @ApiFoundResponse({
  //     description: 'Redirects to Strava authorization page.',
  //   })
  //   @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  //   @UseGuards(JwtAuthGuard)
  //   @Get('auth/strava')
  //   async connect(@GetUser('userId') userId: string, @Res() res: Response) {
  //     const authUrl = this.stravaService.getAuthUrl(userId, 'redirect');
  //     return res.redirect(authUrl);
  //   }

  @ApiOperation({
    summary: 'Connect Strava - Get Strava authorization URL',
    description:
      'Returns the Strava OAuth authorization URL as JSON. Recommended for mobile apps and Swagger testing. Mobile client should open data.authUrl in system browser/in-app browser and wait for callback completion.',
  })
  @ApiBearerAuth('user_token')
  @ApiOkResponse({
    description: 'Strava authorization URL generated.',
    schema: {
      example: {
        success: true,
        data: {
          authUrl:
            'https://www.strava.com/oauth/authorize?client_id=177544&redirect_uri=http%3A%2F%2Flocalhost%3A4002%2Fapi%2Fauth%2Fstrava%2Fcallback&response_type=code&approval_prompt=auto&scope=read%2Cactivity%3Aread%2Cactivity%3Aread_all%2Cprofile%3Aread_all&state=eyJ...',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Get('auth/strava/url')
  async getConnectUrl(@GetUser('userId') userId: string) {
    const authUrl = this.stravaService.getAuthUrl(userId, 'json');

    return {
      success: true,
      data: {
        authUrl,
      },
    };
  }

  @ApiOperation({
    summary: 'Strava OAuth callback',
    description:
      'Internal callback endpoint called by Strava after consent. Backend handles token exchange and connection persistence. Mobile/frontend usually does not call this directly; app only needs to handle post-callback success/error redirect screen.',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Authorization code returned by Strava after user consent.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description:
      'Signed state created by backend to validate the callback request.',
  })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Error key returned by Strava when user denies consent.',
  })
  @ApiOkResponse({
    description: 'Swagger mode callback success response (JSON).',
    schema: {
      example: {
        success: true,
        provider: 'strava',
        externalConnectionId: 'cmnwnes3r0001v828c2ad5bdw',
        message: 'Strava connected successfully',
      },
    },
  })
  @ApiFoundResponse({
    description: 'Frontend mode callback response (HTTP redirect).',
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired callback state/code.',
  })
  @Get('auth/strava/callback')
  async callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Res() res?: Response,
  ) {
    const clientUrl =
      appConfig().app.client_app_url || process.env.APP_FRONTEND_URL;

    if (error) {
      const redirectUrl = `${clientUrl || ''}/auth/strava/callback?status=error&error=${encodeURIComponent(error)}`;
      return res.redirect(redirectUrl);
    }

    if (!code || !state) {
      const redirectUrl = `${clientUrl || ''}/auth/strava/callback?status=error&error=missing_code_or_state`;
      return res.redirect(redirectUrl);
    }

    try {
      const result = await this.stravaService.exchangeCodeAndSaveConnection(
        code,
        state,
      );

      if (result.callbackMode === 'json') {
        return res.status(200).json({
          success: true,
          provider: 'strava',
          externalConnectionId: result.connection.id,
          message: 'Strava connected successfully',
        });
      }

      const redirectUrl = `${clientUrl || ''}/auth/strava/callback?status=success&provider=strava&externalConnectionId=${result.connection.id}`;
      return res.redirect(redirectUrl);
    } catch (e) {
      const redirectUrl = `${clientUrl || ''}/auth/strava/callback?status=error&error=${encodeURIComponent(e?.message || 'strava_connection_failed')}`;
      return res.redirect(redirectUrl);
    }
  }

  @ApiOperation({
    summary: 'Get Strava connection status and details',
    description:
      'Returns current Strava connection for authenticated user. Shows connection status, provider, provider user ID, scopes granted, token expiration, and sync history. Used to check connection validity before starting challenges.',
  })
  @ApiBearerAuth('user_token')
  @ApiOkResponse({
    description: 'Strava connection fetched successfully.',
    schema: {
      example: {
        success: true,
        data: {
          connected: true,
          connection: {
            id: 'cmnwnes3r0001v828c2ad5bdw',
            provider: 'STRAVA',
            provider_user_id: '12345678',
            provider_name: 'John Athlete',
            provider_profile_url: 'https://www.strava.com/athletes/12345678',
            scope: 'read,activity:read,activity:read_all,profile:read_all',
            is_active: true,
            token_expires_at: '2026-05-13T08:20:13.000Z',
            last_sync_at: '2026-04-15T14:30:00.000Z',
            synced_activities_count: 247
          }
        }
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @UseGuards(JwtAuthGuard)
  @Get('strava/connection')
  async getConnectionStatus(@GetUser('userId') userId: string) {
    return this.stravaService.getConnectionStatus(userId);
  }

  @ApiOperation({
    summary: 'Disconnect Strava account',
    description:
      'Revokes Strava connection for authenticated user. Disables automatic activity syncing. User must reconnect to participate in Strava-dependent challenges afterward. Existing synced activities remain in database for audit/history.',
  })
  @ApiBearerAuth('user_token')
  @ApiOkResponse({
    description: 'Strava connection revoked successfully.',
    schema: {
      example: {
        success: true,
        message: 'Strava disconnected successfully',
        data: {
          isActive: false,
          nextSyncAt: null
        }
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({ description: 'No active Strava connection found.' })
  @UseGuards(JwtAuthGuard)
  @Delete('strava/connection')
  async disconnect(@GetUser('userId') userId: string) {
    return this.stravaService.disconnect(userId);
  }

  @ApiOperation({
    summary: 'Sync activities from Strava',
    description:
      'Pulls activities from Strava using stored tokens and upserts into synced activities table. Request body contains only optional filters/pagination, not activity payload. This endpoint can be called manually by app (on-demand sync). Optional automatic schedule is also available via env flags: STRAVA_AUTO_SYNC_ENABLED=true and STRAVA_AUTO_SYNC_CRON (default: */30 * * * *). Recommended first test body is {} or {"perPage":20,"maxPages":1}.',
  })
  @ApiBearerAuth('user_token')
  @ApiBody({
    type: StravaSyncDto,
    description:
      'Optional sync options only. Values are not taken from Strava payloads. Use GET /api/strava/connection to read externalConnectionId when needed.',
    examples: {
      minimal: {
        summary: 'Recommended first test',
        value: {},
      },
      smallBatch: {
        summary: 'Fetch small recent batch',
        value: {
          perPage: 20,
          maxPages: 1,
        },
      },
      timeWindow: {
        summary: 'Sync specific date range',
        value: {
          after: 1775000000,
          before: 1777600000,
          perPage: 50,
          maxPages: 2,
        },
      },
      specificConnection: {
        summary: 'Target one specific external connection',
        value: {
          externalConnectionId: 'cmnwnes3r0001v828c2ad5bdw',
          perPage: 20,
          maxPages: 1,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Strava activities synced successfully.',
    schema: {
      example: {
        success: true,
        data: {
          synced: 7,
          pagesFetched: 1,
          externalConnectionId: 'cmnwnes3r0001v828c2ad5bdw',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  @ApiBadRequestResponse({ description: 'Invalid sync payload.' })
  @UseGuards(JwtAuthGuard)
  @Post('strava/sync')
  async sync(@GetUser('userId') userId: string, @Body() dto: StravaSyncDto) {
    return this.stravaService.syncActivities(userId, dto);
  }

  @ApiOperation({
    summary: 'Strava webhook verification handshake',
    description:
      'Handles Strava webhook verification request (GET). Part of Strava webhook subscription setup flow. Called by Strava servers during subscription creation to verify callback URL ownership. Frontend/clients should NOT call this endpoint manually. Validates verify_token against STRAVA_WEBHOOK_VERIFY_TOKEN and echoes back challenge string.',
  })
  @ApiQuery({
    name: 'hub.verify_token',
    required: true,
    description: 'Token sent by Strava. Must match environment variable STRAVA_WEBHOOK_VERIFY_TOKEN.',
  })
  @ApiQuery({
    name: 'hub.challenge',
    required: true,
    description: 'Challenge string from Strava that must be echoed back in response.',
  })
  @ApiOkResponse({
    description: 'Webhook verification successful. Challenge echoed back.',
    schema: {
      example: {
        'hub.challenge': 'abc123challenge456',
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Webhook verify token does not match STRAVA_WEBHOOK_VERIFY_TOKEN.' })
  @Get('strava/webhook')
  async verifyWebhook(
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.stravaService.validateWebhookChallenge(verifyToken, challenge);
  }

  @ApiOperation({
    summary: 'Receive Strava push events in real-time (webhook)',
    description:
      'Receives real-time Strava activity push events after webhook subscription is active. Called by Strava servers only when user completes/updates activities in Strava app. Frontend MUST NOT call this directly. Events trigger automatic activity sync and challenge progress projection rebuild. Supported events: activity.created (new activity), activity.updated (modified activity).',
  })
  @ApiBody({
    description: 'Strava webhook event payload with updated activity metadata.',
    schema: {
      example: {
        aspect_type: 'create',
        event_time: 1776052000,
        object_id: 1234567890,
        object_type: 'activity',
        owner_id: 12345678,
        subscription_id: 99999,
        updates: {
          title: 'Morning Run',
          sport_type: 'Run'
        }
      },
    },
  })
  @ApiOkResponse({
    description: 'Webhook event accepted and queued for async processing.',
    schema: {
      example: {
        success: true,
        message: 'Webhook event queued',
      },
    },
  })
  @HttpCode(200)
  @Post('strava/webhook')
  async webhook(@Body() body: any) {
    return this.stravaService.processWebhookEvent(body);
  }

  @ApiOperation({
    summary: 'Create Strava webhook subscription (Admin)',
    description:
      'Creates Strava push subscription for real-time activity events. Requires STRAVA_WEBHOOK_CALLBACK_URL and STRAVA_WEBHOOK_VERIFY_TOKEN environment variables. Use for manual setup/recovery. Automatic one-time subscription bootstrap available via STRAVA_AUTO_WEBHOOK_SUBSCRIBE=true on backend startup. Strava UI does not provide webhook subscription form fields - must be created programmatically via this endpoint or Strava API.',
  })
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({
    description: 'Webhook subscription created successfully on Strava servers.',
    schema: {
      example: {
        id: 99999,
        resource_state: 2,
        callback_url: 'https://api.example.com/api/strava/webhook',
        created_at: '2026-04-15T12:00:00Z'
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid admin access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required.' })
  @ApiBadRequestResponse({
    description: 'Missing STRAVA_WEBHOOK_CALLBACK_URL or STRAVA_WEBHOOK_VERIFY_TOKEN environment variables.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN || Role.SUPER_ADMIN)
  @Post('strava/webhook/subscription')
  async createSubscription() {
    return this.stravaService.createWebhookSubscription();
  }

  @ApiOperation({
    summary: 'View all Strava webhook subscriptions (Admin)',
    description:
      'Fetches list of active Strava push webhook subscriptions for this application. Use to verify subscription is set up and healthy. Useful after setup to confirm exactly one subscription exists and is correctly configured.',
  })
  @ApiBearerAuth('admin_token')
  @ApiOkResponse({
    description: 'List of Strava webhook subscriptions fetched successfully.',
    schema: {
      example: [
        {
          id: 99999,
          callback_url: 'https://api.example.com/api/strava/webhook',
          created_at: '2026-04-15T12:00:00Z',
          resource_state: 2
        }
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid admin access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN || Role.SUPER_ADMIN)
  @Get('strava/webhook/subscription')
  async getSubscription() {
    return this.stravaService.getWebhookSubscription();
  }

  @ApiOperation({
    summary: 'Delete Strava webhook subscription (Admin)',
    description:
      'Deletes a specific Strava webhook subscription by ID. Use for maintenance, decommissioning, or when rotating callback domain/verify token. After deletion, webhook events will no longer be received until new subscription is created.',
  })
  @ApiBearerAuth('admin_token')
  @ApiQuery({
    name: 'id',
    required: true,
    type: String,
    description: 'Subscription ID from Strava (obtained from GET subscription endpoint)',
  })
  @ApiOkResponse({
    description: 'Webhook subscription deleted successfully.',
    schema: {
      example: {
        success: true,
        message: 'Subscription 99999 deleted successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid admin access token.' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required.' })
  @ApiBadRequestResponse({ description: 'Invalid or non-existent subscription ID.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN || Role.SUPER_ADMIN)
  @Delete('strava/webhook/subscription')
  async deleteSubscription(@Query('id') id: string) {
    return this.stravaService.deleteWebhookSubscription(id);
  }
}
