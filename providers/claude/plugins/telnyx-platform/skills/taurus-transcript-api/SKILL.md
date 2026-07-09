---
name: taurus-transcript-api
description: >-
  Use Taurus API to search meetings and fetch call transcripts for authorized
  sales and revenue workflows.
metadata:
  author: telnyx
  product: taurus
  language: null
  internal: true
---

# Taurus Transcript API

Use this skill when helping an authorized bot search Taurus call intelligence records or retrieve meeting transcripts from the Taurus API.

## Safety Rules

- Do not paste, log, or expose API keys.
- Do not include raw transcript text in shared chats unless the user explicitly asks and the destination is authorized.
- Prefer summaries or extracted snippets over full transcript dumps.
- Treat transcripts as customer/prospect call data.
- Use a read-only Taurus API key for bot integrations.
- Do not use Taurus worker secrets for API access. The deployed API reads from `revenueops-squad/taurus-api`.

## Auth

Use a bearer token from Vault or the bot's secret manager.

Preferred Vault path:

```text
revenueops-squad/taurus-api
```

Preferred key format:

```text
TAURUS_API_KEYS_JSON
```

For a Steele/Hermes integration, create a named read-only key such as:

```json
{
  "name": "steele-bot",
  "scopes": ["read"]
}
```

Fallback legacy key:

```text
TAURUS_API_KEY
```

HTTP header:

```http
Authorization: Bearer ${TAURUS_API_KEY}
```

## Base URL

Dev Taurus API:

```text
http://taurus-api.query.dev.telnyx.io:8787
```

If a production endpoint exists later, use the production base URL for production bots. Do not assume dev data or dev keys are suitable for production.

## Health Check

Health is unauthenticated:

```bash
curl -s "$TAURUS_BASE_URL/health" | jq
```

Expected healthy shape:

```json
{
  "ok": true,
  "service": "taurus-api",
  "checks": {
    "db": "ok"
  }
}
```

## Search Meetings

Endpoint:

```http
GET /v1/meetings/search
```

Common query params:

```text
q
account
owner
date_from
date_to
limit
include_no_show
```

Default behavior blocks no-show calls unless `include_no_show=true` is supplied.

Example search:

```bash
curl -s "$TAURUS_BASE_URL/v1/meetings/search?q=pricing&account=Acme&date_from=2026-07-01&limit=10" \
  -H "Authorization: Bearer $TAURUS_API_KEY" | jq
```

Use search results to identify the meeting ID before fetching the transcript.

## Fetch Transcript

Endpoint:

```http
GET /v1/meetings/:meetingId/transcript
```

Example:

```bash
MEETING_ID="..."

curl -s "$TAURUS_BASE_URL/v1/meetings/$MEETING_ID/transcript" \
  -H "Authorization: Bearer $TAURUS_API_KEY" | jq
```

The response includes meeting metadata plus the transcript text. Typical fields include:

```text
meeting metadata
transcript text
transcript length
source document type
source document fallback reason
storage manifest key
transcript object key
```

When presenting results to humans, prefer this sanitized shape unless full transcript text is explicitly needed:

```bash
curl -s "$TAURUS_BASE_URL/v1/meetings/$MEETING_ID/transcript" \
  -H "Authorization: Bearer $TAURUS_API_KEY" \
  | jq '{meeting: .meeting, sourceDocumentType, sourceDocumentFallbackReason, transcriptLength: ((.transcript.text // .transcript // "") | length)}'
```

## Bot Workflow

1. Check `/health` if the bot has not called Taurus recently.
2. Search meetings using `q`, `account`, `owner`, and date filters.
3. Show a short list of candidate meetings to the user unless the meeting is unambiguous.
4. Fetch the transcript for the selected meeting ID.
5. Feed the transcript to the bot's reasoning workflow.
6. Return summaries, answers, or cited snippets instead of dumping the whole transcript by default.

## Error Handling

- `401`: missing or invalid API key. Refresh/read the key from `revenueops-squad/taurus-api` or the bot secret manager.
- `403`: key exists but lacks required scope. Use a read-only key with `read` scope.
- `404`: meeting ID does not exist, no transcript artifact exists, or the record is not available through the API.
- `5xx`: Taurus, DB, or storage issue. Retry with backoff and check `/health`.

## Implementation Notes

- Keep API keys in the bot secret manager, not source code.
- Cache search results briefly if needed, but do not cache transcript text longer than the bot workflow requires unless explicitly approved.
- Log meeting IDs and request status, but avoid logging full transcript text.
- If a transcript is missing, search may still return the meeting record; report that the meeting exists but no transcript is available through Taurus.
