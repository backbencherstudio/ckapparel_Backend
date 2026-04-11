# Challenge Participation - Join Challenge API

## Overview

The join challenge feature allows users to participate in challenges. When a user attempts a challenge:

1. **Creates a participation record** in the database linking the user to the challenge
2. **Automatically adds the user to the challenge's GROUP conversation** for real-time communication with other participants
3. **Checks Strava connection status** and returns whether Strava is required and if the user is connected
4. **Returns start readiness** - whether the user can immediately start or needs to connect Strava first

## Endpoint

```
POST /challenges/:id/join
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "externalConnectionId": "optional_strava_connection_id"
}
```

### Response

#### Success (200 OK)

```json
{
  "id": "participation_id",
  "challengeId": "challenge_id",
  "userId": "user_id",
  "status": "JOINED",
  "joinedAt": "2025-04-02T10:30:00Z",
  "conversation": {
    "id": "conversation_id",
    "title": "Challenge Room: 50KM Ultra Run [challenge_id]",
    "type": "GROUP",
    "membersCount": 5
  },
  "strava": {
    "connected": false,
    "required": true,
    "connectionUrl": "https://yourapp.com/auth/strava",
    "externalConnectionId": null
  },
  "canStart": false,
  "message": "Elite challenges require Strava connection. Please connect your Strava account to start."
}
```

### Strava Connection Response

**If Strava is NOT required** (e.g., Monthly, Virtual, Community challenges):
```json
{
  "strava": {
    "connected": false,
    "required": false,
    "externalConnectionId": null
  },
  "canStart": true,
  "message": "Successfully joined the challenge. You can now start if all requirements are met."
}
```

**If Strava IS connected**:
```json
{
  "strava": {
    "connected": true,
    "required": true,
    "externalConnectionId": "conn_abc123"
  },
  "canStart": true,
  "message": "Successfully joined the challenge. You can now start if all requirements are met."
}
```

## Error Responses

### Already Joined (409 Conflict)
```json
{
  "statusCode": 409,
  "message": "You have already joined this challenge (status: JOINED)",
  "error": "Conflict"
}
```

### Challenge Not Found (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Challenge not found or has been deleted",
  "error": "Bad Request"
}
```

### Challenge Not Active (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Challenge is not active (status: PENDING)",
  "error": "Bad Request"
}
```

## Strava Integration Requirements

### What You Need to Connect Strava

To enable Strava integration in your app, you need:

#### 1. **Strava OAuth Application**
- Go to https://www.strava.com/settings/api
- Create a new application with:
  - **Application Name**: Your App Name
  - **Category**: Track athletes' training activities
  - **Club**: Optional, select if you have a club
  - **Website**: Your app's website URL
  - **Application Description**: Describe what your app does
  - **Redirect URI**: `https://yourapp.com/auth/strava/callback` (update with your domain)

#### 2. **OAuth Credentials**
After creating the application, you'll receive:
- **Client ID**: Used to request authorization
- **Client Secret**: Must be kept private, used for token exchange  
- **Redirect URI(s)**: Must match exactly in your implementation

#### 3. **Environment Variables**

Add these to your `.env` file:

```env
# Strava OAuth Configuration
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
STRAVA_CALLBACK_URL=https://yourapp.com/auth/strava/callback
STRAVA_API_BASE=https://www.strava.com
STRAVA_API_V3=https://www.strava.com/api/v3
```

#### 4. **OAuth Scopes**

Request the following scopes from Strava:
```
read,activity:read_all,profile:read_all
```

- **`read`**: Basic profile data
- **`activity:read_all`**: Access to all of user's activities (public + private)
- **`profile:read_all`**: Access to profile data

### Implementation Steps

#### Step 1: Create Strava Auth Strategy (Passport.js)

```typescript
// src/modules/auth/strategies/strava.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-strava-oauth2';
import { AuthService } from '../auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import appConfig from 'src/config/app.config';

@Injectable()
export class StravaStrategy extends PassportStrategy(Strategy, 'strava') {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {
    super({
      clientID: appConfig().strava.client_id,
      clientSecret: appConfig().strava.client_secret,
      callbackURL: appConfig().strava.callback_url,
      scope: ['read', 'activity:read_all', 'profile:read_all'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
  ) {
    // Profile object contains:
    // - id: Strava athlete ID
    // - name: Athlete name
    // - avatar: Profile picture
    // - city, state, country: Location info

    const userId = req.user?.userId; // Get from JWT

    // Create or update ExternalConnection record
    const externalConnection = await this.prisma.externalConnection.upsert({
      where: {
        user_id_provider: {
          user_id: userId,
          provider: 'STRAVA',
        },
      },
      create: {
        user_id: userId,
        provider: 'STRAVA',
        provider_user_id: profile.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        scope: ['read', 'activity:read_all'].join(','),
        is_active: true,
        metadata: {
          athlete: {
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            city: profile.city,
            state: profile.state,
            country: profile.country,
          },
        },
      },
      update: {
        provider_user_id: profile.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        is_active: true,
        metadata: {
          athlete: {
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            city: profile.city,
            state: profile.state,
            country: profile.country,
          },
        },
      },
    });

    return { externalConnection };
  }
}
```

#### Step 2: Create Strava Service for API Calls

```typescript
// src/modules/strava/strava.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import appConfig from 'src/config/app.config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class StravaService {
  private apiClient: AxiosInstance;

  constructor(private prisma: PrismaService) {
    this.apiClient = axios.create({
      baseURL: appConfig().strava.api_v3,
    });
  }

  // Sync activities from Strava for a user
  async syncUserActivities(
    userId: string,
    externalConnectionId: string,
    after?: number,
  ) {
    const connection = await this.prisma.externalConnection.findUnique({
      where: { id: externalConnectionId },
    });

    if (!connection || !connection.access_token) {
      throw new Error('No Strava connection found');
    }

    const params: any = {
      per_page: 200,
      page: 1,
    };

    if (after) {
      params.after = after;
    }

    try {
      const response = await this.apiClient.get('/athlete/activities', {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
        params,
      });

      // Store activities in SyncedActivity table
      const activities = response.data;
      // Implementation details...

      return activities;
    } catch (error) {
      // Handle token refresh if expired
      if (error.response?.status === 401) {
        await this.refreshAccessToken(externalConnectionId);
      }
      throw error;
    }
  }

  // Refresh expired access token
  async refreshAccessToken(externalConnectionId: string) {
    const connection = await this.prisma.externalConnection.findUnique({
      where: { id: externalConnectionId },
    });

    if (!connection?.refresh_token) throw new Error('No refresh token');

    try {
      const response = await axios.post('https://www.strava.com/api/v3/oauth/token', {
        client_id: appConfig().strava.client_id,
        client_secret: appConfig().strava.client_secret,
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      });

      await this.prisma.externalConnection.update({
        where: { id: externalConnectionId },
        data: {
          access_token: response.data.access_token,
          refresh_token: response.data.refresh_token,
          token_expires_at: new Date(response.data.expires_at * 1000),
        },
      });
    } catch (error) {
      throw new Error('Failed to refresh Strava token');
    }
  }

  // Get athlete profile from Strava
  async getAthleteProfile(externalConnectionId: string) {
    const connection = await this.prisma.externalConnection.findUnique({
      where: { id: externalConnectionId },
    });

    if (!connection?.access_token) throw new Error('No Strava connection');

    const response = await this.apiClient.get('/athlete', {
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
      },
    });

    return response.data;
  }
}
```

#### Step 3: Add Auth Endpoints

```typescript
// In your auth.controller.ts

@Get('strava')
@UseGuards(AuthGuard('strava'))
async stravaLogin() {
  // Redirects to Strava OAuth
}

@Get('strava/callback')
@UseGuards(AuthGuard('strava'))
async stravaCallback(@Req() req, @Res() res: Response) {
  // Handle Strava OAuth response
  const { externalConnection } = req.user;
  
  // Return connection success to frontend
  return res.json({
    message: 'Strava connected successfully',
    externalConnection: {
      id: externalConnection.id,
      provider: externalConnection.provider,
    },
  });
}
```

### Flow Diagram

```
User clicks "Attempt Challenge"
            |
            v
     POST /challenges/:id/join
            |
            v
Check if user already joined ---> If yes, return 409 Conflict
            |
            v
Check if challenge is ACTIVE
            |
            v
Create ChallengeParticipation record
            |
            v
Find or create conversation membership
            |
            v
Check for Strava connection ----------> If NOT required, canStart=true
            |                              If required & NOT connected, canStart=false
            v                              If connected, canStart=true
Return joinResponse with:
- participationId
- conversationId
- strava.connected status
- strava.required status
- strava.connectionUrl (if needed)
- canStart (boolean)
            |
            v
Frontend shows response:
- If canStart=true: "You can start now"
- If canStart=false: Show "Connect Strava" button with connectionUrl
```

### Strava Data Sync Workflow

Once a challenge is started with Strava connected:

1. **Activity Detection**: Strava webhook or periodic sync detects new activities
2. **Activity Matching**: Match Strava activity type to challenge metrics (distance, elevation, duration)
3. **Progress Update**: Automatically update `ChallengeParticipation.metric_values`
4. **Checkpoint Progress**: Update `ChallengeCheckpointProgress` based on matched metrics
5. **Leaderboard Update**: Recalculate rankings based on progress

### Security Considerations

1. **Client Secret**: Never expose `STRAVA_CLIENT_SECRET` to frontend
2. **Token Storage**: Store tokens encrypted in database
3. **Token Refresh**: Implement token refresh logic before expiration
4. **Scope Limitation**: Request only necessary scopes
5. **Webhook Verification**: Verify Strava webhook signatures
6. **Rate Limiting**: Implement rate limiting for API calls to Strava

### Testing Strava Integration

1. **Create a Strava test account**: https://www.strava.com
2. **Use Strava's sandbox**: https://developers.strava.com/docs/sandbox/
3. **Mock activities**: Strava allows creating test activities in sandbox mode
4. **Test token refresh**: Set token expiration to test refresh flow

### Useful Strava API Endpoints

- `GET /athlete` - Current athlete's profile
- `GET /athlete/activities` - Athlete's activities
- `GET /activities/{id}` - Specific activity details
- `POST /activities` - Create manual activity
- `PUT /activities/{id}` - Update activity

### References

- [Strava OAuth Documentation](https://developers.strava.com/docs/authentication/)
- [Strava API Reference](https://developers.strava.com/docs/reference/)
- [Strava Webhook Documentation](https://developers.strava.com/docs/webhooks/)

