# Chat Integration Guide for Flutter

## 1. Purpose
This guide explains how to integrate DM and Group chat from the backend into a Flutter app.

It covers:
- Authentication requirements
- REST endpoints to create/list conversations and upload messages
- WebSocket realtime events for send/read/typing/presence
- Recommended Flutter architecture and implementation order
- Payload examples and edge cases

## 2. Base Configuration
- REST base URL: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`
- Socket namespace: `/ws`
- Auth: Bearer JWT required for all chat HTTP endpoints and websocket connection

## 3. Production Message Flow (Recommended)
Use a hybrid approach:
1. Realtime text messages via websocket `message:send`
2. Media/file messages via HTTP upload endpoint
3. Listen to websocket `message:new` for all incoming messages (including uploaded media)

Why this works:
- Fast UX for text (low latency)
- Reliable upload handling for files
- Single realtime stream (`message:new`) for rendering both text and media

## 4. Conversation APIs
### 4.1 Create or Get DM
- Method: `POST`
- URL: `/conversations/dm`
- Body:
```json
{
  "otherUserId": "cmmliufke0000v8xs48uyxj6p"
}
```
- Result: Existing DM or newly created DM conversation

### 4.2 Create Group
- Method: `POST`
- URL: `/conversations/group`
- Content-Type: `multipart/form-data`
- Fields:
  - `title` (string, required)
  - `memberIds` (required)
  - `avatar` (optional image file)

`memberIds` accepted formats:
1. Array
2. Comma-separated string
3. JSON array string

Examples:
- `memberIds=id1,id2`
- `memberIds=["id1","id2"]`

### 4.3 List My Conversations
- Method: `GET`
- URL: `/conversations?take=20&skip=0`

### 4.4 List Group Conversations
- Method: `GET`
- URL: `/conversations/group-conversations`

## 5. Message APIs
### 5.1 List Messages
- Method: `GET`
- URL: `/conversations/{conversationId}/messages?cursor={messageId}&take=20`

### 5.2 Upload Media and Send Message
- Method: `POST`
- URL: `/conversations/{conversationId}/messages/upload`
- Content-Type: `multipart/form-data`
- Fields:
  - `media` (file)
  - `kind` (`IMAGE | VIDEO | FILE | AUDIO`)
  - `content` (optional JSON string/object for caption and metadata)
  - `media_Url` (optional pre-uploaded URL)

Supported file MIME types:
- `image/png`
- `image/jpeg`
- `image/webp`
- `image/gif`
- `video/mp4`
- `audio/mpeg`
- `application/pdf`
- `text/plain`

Max file size: 20 MB

Important behavior:
- If `media` is provided, backend uploads file and sets media URL
- Endpoint returns saved message
- Endpoint also emits realtime `message:new`

### 5.3 List Media Tab
- Method: `GET`
- URL: `/conversations/{conversationId}/media?cursor={messageId}&take=20`
- Kinds returned: `IMAGE`, `VIDEO`

### 5.4 List Files Tab
- Method: `GET`
- URL: `/conversations/{conversationId}/files?cursor={messageId}&take=20`
- Kinds returned: `FILE`

### 5.5 Search Messages
- Method: `GET`
- URL: `/messages/search?q=test&conversationId={conversationId}&skip=0&take=20`
- Behavior:
  - Searches text in `content.text`
  - Also searches legacy `message` field
  - If `conversationId` provided, search is scoped to that conversation

### 5.6 Delete Message
- Method: `DELETE`
- URL: `/messages/{messageId}`

## 6. WebSocket Realtime
Socket namespace: `/ws`

### 6.1 Connect
Send token in `auth.token` (recommended), or Authorization header.

On success:
- Event: `connection:ok`

On fail:
- Event: `connection:error`

### 6.2 Join Conversation Room
Emit:
```json
{
  "event": "conversation:join",
  "data": { "conversationId": "cmmlk8qn20002v8xsglb2csrh" }
}
```

Receive:
- `conversation:joined`
- or `error:conversation`

### 6.3 Send Text Message
Emit `message:send`:
```json
{
  "conversationId": "cmmlk8qn20002v8xsglb2csrh",
  "kind": "TEXT",
  "content": { "text": "Hello" }
}
```

Receive:
- `message:new` (to self and other participants)
- `message:ack` (sender acknowledgement)
- `error:message` on failure

### 6.4 Receive Messages
Listen for `message:new` globally after connection.

Use the same renderer for:
- websocket text messages
- HTTP uploaded media messages

### 6.5 Typing Indicator
Emit `typing`:
```json
{
  "conversationId": "cmmlk8qn20002v8xsglb2csrh",
  "on": true
}
```
Receive `typing` from others.

### 6.6 Read Receipts
Emit `message:read`:
```json
{
  "conversationId": "cmmlk8qn20002v8xsglb2csrh",
  "at": "2026-03-12T12:00:00.000Z"
}
```
Receive `message:read` updates.

### 6.7 Presence
Listen to:
- `presence:update`

## 7. DM and Group Behavior Rules
### 7.1 Shared Rules
- User must be a conversation member to send/read/list
- Non-members receive forbidden errors

### 7.2 DM-specific
- Backend checks block status before send
- If blocked either direction, send is rejected

### 7.3 Group-specific
- Any member can send messages
- Admin role is required only for member-management actions (add/remove/set-role)

## 8. Flutter Implementation Blueprint
## 8.1 Suggested Packages
- HTTP: `dio`
- WebSocket: `socket_io_client`
- State: `bloc` or `riverpod`
- Models: `freezed` + `json_serializable` (optional but recommended)

### 8.2 Suggested Layers
1. `ChatApiClient` for REST
2. `ChatSocketClient` for websocket
3. `ChatRepository` to merge API + socket
4. `ChatController/Bloc` per screen

### 8.3 Startup Sequence
1. Login and store JWT
2. Load conversation list (REST)
3. Connect socket with token
4. Open chat screen
5. Join room via `conversation:join`
6. Load initial messages (REST)
7. Subscribe to `message:new`, `typing`, `message:read`

### 8.4 Send Text Sequence
1. Emit `message:send`
2. Optionally show local pending bubble
3. Replace/confirm on `message:new` + `message:ack`

### 8.5 Send Media Sequence
1. Select file
2. POST upload endpoint
3. Append response message immediately
4. Also handle `message:new` event (dedupe by message id)

## 9. UI Rendering Contract
Each message item should support:
- `id`
- `kind`
- `content` (caption/metadata)
- `media_Url`
- `senderId`
- `createdAt`

Render strategy:
- `TEXT`: `content.text`
- `IMAGE/VIDEO/AUDIO/FILE`: render from `media_Url`
- Use `content.text` as optional caption for media

## 10. Error Handling Matrix
- 401 Unauthorized: token expired/invalid, refresh auth and reconnect
- 403 Forbidden: not a member or blocked (DM)
- 400 Bad Request: invalid payload/invalid cursor/validation failures
- Upload type/size errors: show user-friendly file constraints in UI

## 11. Testing Checklist for Flutter Team
1. Create DM and send text via websocket
2. Create group with avatar upload
3. Send file with caption (`media` + `content.text`)
4. Verify `message:new` received on both sender and receiver
5. Verify media and files tab pagination
6. Verify search in one conversation and global search
7. Verify typing and read events
8. Verify blocked DM cannot send
9. Verify app reconnect and room rejoin after network drop

## 12. Known Integration Notes
1. Upload endpoint Swagger currently marks `media` required.
2. Backend supports `media_Url` but primary production path is uploading `media`.
3. If you need URL-only media message flow in Flutter, request backend to mark schema as `oneOf(media, media_Url)` for strict API contract clarity.

## 13. Quick Example: Send File with Caption (Flutter FormData)
- `media`: picked file bytes
- `kind`: `FILE`
- `content`: `{"text":"Please review","fileName":"proposal.pdf"}`

Expected result:
- HTTP success returns message object
- Socket emits `message:new` to participants

## 14. Backend Source References
- [src/modules/chat/messages/messages.controller.ts](../src/modules/chat/messages/messages.controller.ts)
- [src/modules/chat/messages/messages.service.ts](../src/modules/chat/messages/messages.service.ts)
- [src/modules/chat/realtime/realtime.gateway.ts](../src/modules/chat/realtime/realtime.gateway.ts)
- [src/modules/chat/conversations/conversations.controller.ts](../src/modules/chat/conversations/conversations.controller.ts)
- [src/modules/chat/conversations/conversations.service.ts](../src/modules/chat/conversations/conversations.service.ts)
