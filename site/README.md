# Telnyx Agent Portal — Dev Server

Local development server for the `agent.telnyx.com` landing page with content negotiation.

## Quick Start

```bash
cd site && npm install && npm start
```

Server runs on `http://localhost:3000`.

## Routes

| Route | Behavior |
|-------|----------|
| `GET /` | Content negotiation: HTML for browsers, JSON for `Accept: application/json` |
| `GET /.well-known/agent.json` | Capabilities manifest (always JSON) |
| `GET /health` | `{ "status": "ok" }` |

## Testing

```bash
# Browser — open in your browser
open http://localhost:3000

# JSON via content negotiation
curl -H "Accept: application/json" http://localhost:3000

# Well-known manifest (always JSON)
curl http://localhost:3000/.well-known/agent.json

# Health check
curl http://localhost:3000/health

# Verify content negotiation: browser default gets HTML
curl http://localhost:3000
```

## Files

| File | Purpose |
|------|---------|
| `server.js` | Express server with content negotiation |
| `agent.json` | Machine-readable capabilities manifest |
| `index.html` | Branded HTML landing page with embedded JSON-LD |
| `package.json` | Dependencies (just Express) |

## Design

- **Content negotiation** on `/`: `Accept: application/json` → JSON manifest; anything else → branded HTML
- **JSON-LD** embedded in HTML `<head>` for search engine / agent discoverability
- **Telnyx design tokens**: PP Formula font (display), Inter (body), `#00E3AA` green, `#FEFDF5` background
- **Only real CLI commands** — all commands verified against `@telnyx/api-cli` v1.1.0 audit
- **Signup URL** points to `https://telnyx.com/agent-signup.md` (Aisling's package)
- **Cross-links** to `agent-access.json` for onboarding discovery
