# Challenge Join Implementation Summary

## What's Been Added

### 1. **New Endpoint: POST `/challenges/:id/join`**

Allows users to join a challenge as a participant. Automatically:

- Creates a `ChallengeParticipation` record
- Adds user to the challenge's GROUP conversation
- Checks Strava connection status
- Returns whether Strava is required and if user can start

### 2. **Updated Files**

#### `src/modules/challenges/dto/join-challenge.dto.ts` (NEW)

```typescript
export class JoinChallengeDto {
  externalConnectionId?: string; // optional pre-selected Strava connection
}

export class JoinChallengeResponseDto {
  id: string;
  challengeId: string;
  status: ParticipationStatus;
  conversation: { id; title; type; membersCount };
  strava: {
    connected: boolean;
    required: boolean;
    connectionUrl?: string;
    externalConnectionId?: string;
  };
  canStart: boolean;
  message: string;
}
```

#### `src/modules/challenges/challenges.controller.ts` (UPDATED)

Added imports:

- `Post`, `Body`, `ConflictException` from `@nestjs/common`
- `JoinChallengeDto`, `JoinChallengeResponseDto`

Added new POST endpoint:

```typescript
@Post(':id/join')
async joinChallenge(
  @GetUser('userId') userId: string,
  @Param('id') challengeId: string,
  @Body() joinDto: JoinChallengeDto,
): Promise<JoinChallengeResponseDto>
```

#### `src/modules/challenges/challenges.service.ts` (UPDATED)

Added imports:

- `ConflictException` from `@nestjs/common`
- `ConversationsService` from `src/modules/chat/conversations/conversations.service`

Updated constructor:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly conversationsService: ConversationsService,
)
```

Added new method:

```typescript
async joinChallenge(
  userId: string,
  challengeId: string,
  joinDto: any,
): Promise<JoinChallengeResponseDto>
```

Logic:

1. Validates challenge exists and is ACTIVE
2. Checks if user already participated (409 Conflict if yes)
3. Creates ChallengeParticipation record with source_provider
4. Finds or resolves challenge's GROUP conversation (deterministic title + legacy fallback)
5. Adds user to conversation membership
6. Checks for active Strava connection
7. Returns response with all metadata

#### `src/modules/challenges/challenges.module.ts` (UPDATED)

Added import:

```typescript
import { ConversationsModule } from 'src/modules/chat/conversations/conversations.module';
```

Updated imports array:

```typescript
imports: [PrismaModule, ConversationsModule];
```

### 3. **Documentation**

#### `docs/STRAVA_INTEGRATION_GUIDE.md` (NEW)

Complete guide including:

- API response examples
- Strava OAuth setup steps
- Required environment variables
- Strava auth strategy implementation
- Strava service for API calls
- Activity sync workflow
- Security considerations
- Testing guide
- API endpoints reference

## Strava Integration Details

### Strava Required For:

- **ELITE_ATHLETE** challenges (yes)
- **MONTHLY_CHALLENGE**, **VIRTUAL_ADVENTURE**, **COMMUNITY_CHALLENGE** challenges (no)

### Response Behavior:

**Elite Challenge Without Strava:**

```json
{
  "strava": {
    "connected": false,
    "required": true,
    "connectionUrl": "https://yourapp.com/auth/strava"
  },
  "canStart": false,
  "message": "Elite challenges require Strava connection..."
}
```

**Non-Elite or With Strava:**

```json
{
  "strava": {
    "connected": true,
    "required": true // or false depending on challenge path
  },
  "canStart": true,
  "message": "Successfully joined the challenge..."
}
```

## Database Changes

No schema changes needed. Uses existing:

- `ChallengeParticipation` model
- `ExternalConnection` model
- `Membership` model

## Error Handling

1. **Challenge not found**: 400 Bad Request
2. **Challenge not active**: 400 Bad Request
3. **User already joined**: 409 Conflict
4. **Invalid inputs**: 400 Bad Request

## Testing the Endpoint

```bash
# Join ELITE_ATHLETE challenge (Strava required)
curl -X POST http://localhost:3000/challenges/{challengeId}/join \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{}'

# Response if no Strava:
{
  "strava": {
    "connected": false,
    "required": true,
    "connectionUrl": "https://yourapp.com/auth/strava"
  },
  "canStart": false
}

# Join with Strava connection
curl -X POST http://localhost:3000/challenges/{challengeId}/join \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"externalConnectionId": "conn_abc123"}'

# Response with Strava:
{
  "strava": {
    "connected": true,
    "required": true,
    "externalConnectionId": "conn_abc123"
  },
  "canStart": true
}
```

## Conversation Auto-Join

When user joins a challenge:

1. Service finds conversation with title `Challenge Room: {title} [{challengeId}]`
2. If not found, tries legacy matching by title + creator + time proximity
3. Automatically creates `Membership` record with role=MEMBER
4. User can immediately access conversation without additional invitations

## Next Steps for Strava Integration

1. **Set up Strava OAuth application** at https://www.strava.com/settings/api
2. **Add environment variables** to .env (see guide)
3. **Implement Strava auth strategy** (Passport.js)
4. **Implement Strava service** for API calls
5. **Add Strava auth endpoints** to auth controller
6. **Implement activity sync** from Strava to SyncedActivity table
7. **Update progress** based on synced activities
8. **Test with test account** on Strava sandbox

## Build Status

✅ Build successful: `Done in 11.76s`

All code compiles without errors and is ready for testing!
