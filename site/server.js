const express = require('express');
const fs = require('fs');
const path = require('path');
const { gettingStartedHandler } = require('./src/getting-started');

const app = express();
const PORT = process.env.PORT || 3000;

// Load static assets once at startup
const agentJson = fs.readFileSync(path.join(__dirname, 'agent.json'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Getting Started endpoint — personalized next steps based on account state
// Spec: docs/co2-getting-started-endpoint.md
// Supports content negotiation: JSON (default) or HTML (Accept: text/html)
function gettingStartedWithContentNegotiation(req, res, next) {
  const accept = req.headers.accept || '';

  // If client explicitly wants HTML, wrap the JSON handler
  if (accept.includes('text/html') && !accept.includes('application/json')) {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const data = body.data || body;
      const level = data.account_level ?? 'N/A';
      const progress = data.progress_percent ?? 0;
      const suggestions = data.suggested_next || [];
      const milestones = data.completed_milestones || [];
      const quickWins = data.quick_wins || [];

      const suggestionsHtml = suggestions.map(s =>
        `<li><strong>${s.title}</strong> (${s.priority})<br/>
         <em>${s.description}</em><br/>
         <code>${s.command}</code></li>`
      ).join('\n');

      const milestonesHtml = milestones.map(m => `<li>✅ ${m}</li>`).join('\n');

      const quickWinsHtml = quickWins.map(q =>
        `<li><strong>${q.title}</strong><br/><code>${q.command}</code></li>`
      ).join('\n');

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Telnyx Agent — Getting Started</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { color: #00c48f; }
    h2 { margin-top: 1.5rem; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3rem; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    .progress { background: #e0e0e0; border-radius: 8px; overflow: hidden; height: 24px; margin: 0.5rem 0; }
    .progress-bar { background: #00c48f; height: 100%; line-height: 24px; color: white; text-align: center; font-size: 0.85em; }
    ul { padding-left: 1.2rem; }
    li { margin-bottom: 0.75rem; }
  </style>
</head>
<body>
  <h1>🚀 Telnyx Agent — Getting Started</h1>
  <p>Account Level: <strong>${level}</strong></p>
  <div class="progress"><div class="progress-bar" style="width:${progress}%">${progress}%</div></div>

  <h2>✅ Completed Milestones</h2>
  <ul>${milestonesHtml || '<li>None yet</li>'}</ul>

  <h2>📋 Suggested Next Steps</h2>
  <ol>${suggestionsHtml || '<li>All caught up!</li>'}</ol>

  <h2>⚡ Quick Wins</h2>
  <ul>${quickWinsHtml}</ul>

  <p style="margin-top:2rem;color:#888;font-size:0.85em">Tip: Use <code>Accept: application/json</code> for the machine-readable version.</p>
</body>
</html>`;

      res.set({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      });
      return res.send(html);
    };
  }

  // Delegate to the actual handler (which calls res.json)
  return gettingStartedHandler(req, res, next);
}

app.get('/v1/getting-started', gettingStartedWithContentNegotiation);
app.get('/v2/agent/getting-started', gettingStartedWithContentNegotiation);

// Well-known agent manifest — always JSON
app.get('/.well-known/agent.json', (req, res) => {
  res.set({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  });
  res.send(agentJson);
});

// Root — content negotiation
app.get('/', (req, res) => {
  const accept = req.headers.accept || '';

  // If the client explicitly wants JSON and doesn't prefer HTML, serve the manifest
  if (accept.includes('application/json') && !accept.includes('text/html')) {
    res.set({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    });
    return res.send(agentJson);
  }

  // Default: serve HTML
  res.set({
    'Content-Type': 'text/html',
    'Cache-Control': 'public, max-age=3600',
  });
  res.send(indexHtml);
});

// 404 for everything else
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', hint: 'Try / or /.well-known/agent.json' });
});

app.listen(PORT, () => {
  console.log(`\n  🟢 Telnyx Agent Portal running at http://localhost:${PORT}\n`);
  console.log(`  Routes:`);
  console.log(`    GET /                          → HTML (browser) or JSON (Accept: application/json)`);
  console.log(`    GET /.well-known/agent.json    → Capabilities manifest (always JSON)`);
  console.log(`    GET /v1/getting-started        → Personalized next steps (Bearer auth)`);
  console.log(`    GET /v2/agent/getting-started   → Personalized next steps (Bearer auth)`);
  console.log(`    GET /health                    → Health check\n`);
});
