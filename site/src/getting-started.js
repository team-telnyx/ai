/**
 * Getting Started Endpoint — /v2/agent/getting-started
 *
 * Inspects account state via Telnyx API and returns personalized next steps.
 * Implements Option B from the spec (CLI-side aggregation via the landing page server).
 *
 * Spec: docs/co2-getting-started-endpoint.md
 */

const BASE_URL = 'https://api.telnyx.com/v2';

// ─── Account State Detection ───────────────────────────────────────────────────

const CHECKS = [
  { key: 'phone_numbers', path: '/phone_numbers?page[size]=1' },
  { key: 'messaging_profiles', path: '/messaging_profiles?page[size]=1' },
  { key: 'connections', path: '/credential_connections?page[size]=1' },
  { key: 'brands', path: '/10dlc/brands?page[size]=1' },
  { key: 'campaigns', path: '/10dlc/campaigns?page[size]=1' },
  { key: 'assistants', path: '/ai/assistants?page[size]=1' },
  { key: 'sims', path: '/sim_cards?page[size]=1' },
  { key: 'storage', path: '/storage/buckets?page[size]=1' },
  { key: 'verify', path: '/verify/profiles?page[size]=1' },
];

async function fetchTelnyxAPI(path, apiKey) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    // Non-fatal — some endpoints may 403 depending on account type
    return { data: [], meta: { total_results: 0 } };
  }

  return res.json();
}

async function detectAccountState(apiKey) {
  // Fan out all checks in parallel using allSettled for resilience
  const results = await Promise.allSettled([
    fetchTelnyxAPI('/balance', apiKey),
    ...CHECKS.map(c => fetchTelnyxAPI(c.path, apiKey).then(r => ({
      key: c.key,
      count: r.meta?.total_results ?? r.data?.length ?? 0,
      hasAny: (r.meta?.total_results ?? r.data?.length ?? 0) > 0,
    }))),
  ]);

  const balanceRes = results[0].status === 'fulfilled' ? results[0].value : { data: {} };
  const checkResults = results.slice(1).map((r, i) =>
    r.status === 'fulfilled' ? r.value : { key: CHECKS[i].key, count: 0, hasAny: false }
  );

  const state = {};
  for (const result of checkResults) {
    state[result.key] = { count: result.count, exists: result.hasAny };
  }

  const balance = balanceRes.data?.balance ?? balanceRes.data?.available_credit ?? '0.00';

  return {
    has_phone_numbers: state.phone_numbers?.exists ?? false,
    phone_number_count: state.phone_numbers?.count ?? 0,
    has_messaging_profile: state.messaging_profiles?.exists ?? false,
    has_voice_connection: state.connections?.exists ?? false,
    has_10dlc_brand: state.brands?.exists ?? false,
    has_10dlc_campaign: state.campaigns?.exists ?? false,
    has_ai_assistant: state.assistants?.exists ?? false,
    has_sim_cards: state.sims?.exists ?? false,
    has_storage: state.storage?.exists ?? false,
    has_verify_profile: state.verify?.exists ?? false,
    balance_sufficient: parseFloat(balance) > 0,
    balance_usd: balance,
  };
}

// ─── Account Level Computation ─────────────────────────────────────────────────

function computeLevel(state) {
  // Level 4: Advanced (multiple channels active)
  const advancedFeatures = [state.has_ai_assistant, state.has_sim_cards, state.has_storage].filter(Boolean).length;
  if (state.has_messaging_profile && state.has_voice_connection && advancedFeatures >= 1) return 4;

  // Level 3: Production ready (has compliance or multiple numbers)
  if ((state.has_10dlc_brand || state.phone_number_count > 1) && (state.has_messaging_profile || state.has_voice_connection)) return 3;

  // Level 2: Working channel (complete messaging OR voice setup)
  if (state.has_messaging_profile && state.has_phone_numbers) return 2;
  if (state.has_voice_connection && state.has_phone_numbers) return 2;

  // Level 1: First resource
  if (state.has_phone_numbers || state.has_messaging_profile || state.has_voice_connection) return 1;

  // Level 0: Fresh account
  return 0;
}

function computeMilestones(state) {
  const milestones = ['signup', 'api_key'];
  if (state.has_phone_numbers) milestones.push('first_number');
  if (state.has_messaging_profile) milestones.push('messaging_profile');
  if (state.has_voice_connection) milestones.push('voice_connection');
  if (state.has_10dlc_brand) milestones.push('10dlc_brand');
  if (state.has_10dlc_campaign) milestones.push('10dlc_campaign');
  if (state.has_ai_assistant) milestones.push('ai_assistant');
  if (state.has_storage) milestones.push('storage_bucket');
  if (state.has_verify_profile) milestones.push('verify_profile');
  return milestones;
}

// ─── Suggestion Engine ─────────────────────────────────────────────────────────

function computeSuggestions(state) {
  const suggestions = [];

  // Critical: Low balance — suggest x402 crypto funding
  if (!state.balance_sufficient) {
    suggestions.push({
      action: 'fund-account',
      title: 'Fund your account with USDC (x402 crypto payment)',
      description: `Your balance is $${state.balance_usd} USD. Fund your account instantly with USDC on Base blockchain — no credit card needed, fully autonomous.`,
      command: 'telnyx-agent fund-account --amount 50',
      api_equivalent: 'POST /v2/x402/credit_account/quote → sign EIP-712 → POST /v2/x402/credit_account',
      priority: 'critical',
      estimated_time_seconds: 15,
      category: 'payments',
      x402: {
        network: 'eip155:8453',
        asset: 'USDC',
        asset_contract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        min_amount_usd: '5.00',
        max_amount_usd: '10000.00',
        quote_endpoint: '/v2/x402/credit_account/quote',
        submit_endpoint: '/v2/x402/credit_account',
      },
    });
  }

  // Level 0 → Level 1: Get your first resource
  if (!state.has_phone_numbers && !state.has_messaging_profile) {
    suggestions.push({
      action: 'setup-sms',
      title: 'Send your first SMS',
      description: 'One command provisions a messaging profile, buys a US number, and gets you ready to send — all in one shot.',
      command: 'telnyx-agent setup-sms --country US',
      api_equivalent: 'POST /v2/messaging_profiles → GET /v2/available_phone_numbers → POST /v2/number_orders',
      priority: 'high',
      estimated_time_seconds: 30,
      category: 'messaging',
    });
  }

  if (!state.has_phone_numbers) {
    suggestions.push({
      action: 'buy-number',
      title: 'Buy a phone number',
      description: 'Search and purchase a phone number. Foundation for voice, messaging, and fax.',
      command: 'telnyx-agent setup-sms --country US',
      api_equivalent: 'GET /v2/available_phone_numbers → POST /v2/number_orders',
      priority: 'high',
      estimated_time_seconds: 10,
      category: 'numbers',
    });
  }

  // Level 1 → Level 2: Complete a channel
  if (state.has_phone_numbers && !state.has_messaging_profile) {
    suggestions.push({
      action: 'setup-messaging',
      title: 'Set up messaging on your number',
      description: 'You have a phone number but no messaging profile. Create one and assign your number to start sending SMS.',
      command: 'telnyx-agent setup-sms',
      api_equivalent: 'POST /v2/messaging_profiles → PATCH /v2/phone_numbers/{id}',
      priority: 'high',
      estimated_time_seconds: 15,
      category: 'messaging',
    });
  }

  if (!state.has_voice_connection) {
    suggestions.push({
      action: 'setup-voice',
      title: 'Set up voice calling',
      description: 'Create a voice connection and assign a number to make and receive phone calls.',
      command: 'telnyx-agent setup-voice --country US',
      api_equivalent: 'POST /v2/credential_connections → POST /v2/number_orders → PATCH /v2/phone_numbers/{id}',
      priority: state.has_messaging_profile ? 'medium' : 'high',
      estimated_time_seconds: 30,
      category: 'voice',
    });
  }

  // Level 2 → Level 3: Production readiness
  if (state.has_messaging_profile && !state.has_10dlc_brand) {
    suggestions.push({
      action: 'register-10dlc',
      title: 'Register for 10DLC (required for US A2P SMS)',
      description: 'US carriers require 10DLC registration for application-to-person messaging. Without it, your messages may be filtered or blocked.',
      command: 'telnyx 10dlc wizard',
      api_equivalent: 'POST /v2/10dlc/brands → POST /v2/10dlc/campaigns',
      priority: 'high',
      estimated_time_seconds: 120,
      category: 'messaging',
    });
  }

  // Level 3 → Level 4: Advanced features
  if (!state.has_ai_assistant) {
    suggestions.push({
      action: 'setup-ai',
      title: 'Create an AI voice assistant',
      description: 'Build an AI assistant that answers phone calls with a custom personality and instructions.',
      command: 'telnyx-agent setup-ai --instructions "You are a helpful receptionist"',
      api_equivalent: 'POST /v2/ai/assistants',
      priority: computeLevel(state) >= 2 ? 'medium' : 'low',
      estimated_time_seconds: 45,
      category: 'ai',
    });
  }

  if (!state.has_storage) {
    suggestions.push({
      action: 'setup-storage',
      title: 'Set up cloud storage',
      description: 'S3-compatible object storage for recordings, media, and files.',
      command: 'telnyx storage bucket create --name default --json',
      api_equivalent: 'POST /v2/storage/buckets',
      priority: 'low',
      estimated_time_seconds: 10,
      category: 'storage',
    });
  }

  if (!state.has_verify_profile) {
    suggestions.push({
      action: 'setup-verify',
      title: 'Add phone verification (2FA)',
      description: 'Set up phone number verification for user authentication flows.',
      command: 'telnyx verify profile create --name Auth --json',
      api_equivalent: 'POST /v2/verify/profiles',
      priority: 'low',
      estimated_time_seconds: 10,
      category: 'verify',
    });
  }

  // Sort by priority, limit to top 5
  const order = { critical: -1, high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.priority] - order[b.priority]);
  return suggestions.slice(0, 5);
}

const QUICK_WINS = [
  { action: 'check-balance', title: 'Check your account balance', command: 'telnyx-agent status --json', estimated_time_seconds: 2 },
  { action: 'explore-ai', title: 'Try AI chat (no setup needed)', command: 'telnyx ai chat --model meta-llama/Meta-Llama-3.1-70B-Instruct --message "Hello"', estimated_time_seconds: 5 },
  { action: 'explore-capabilities', title: 'See what you can do', command: 'telnyx-agent capabilities --json', estimated_time_seconds: 2 },
];

const DOCS = [
  { title: 'Telnyx Agent Toolkit', url: 'https://github.com/team-telnyx/telnyx-toolkit', relevance: 'All 140+ agent skills for autonomous provisioning' },
  { title: 'API Reference', url: 'https://developers.telnyx.com/api/v2', relevance: 'Full Telnyx API v2 documentation' },
  { title: 'Agent Signup Guide', url: 'https://telnyx.com/agent-signup.md', relevance: 'Autonomous account creation via Proof of Work' },
];

// ─── Express Handler ───────────────────────────────────────────────────────────

async function gettingStartedHandler(req, res) {
  // Extract API key from Authorization header
  const authHeader = req.headers.authorization || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!apiKey || !apiKey.startsWith('KEY')) {
    return res.status(401).json({
      error: 'Missing or invalid API key',
      hint: 'Include your Telnyx API key as: Authorization: Bearer KEY_xxx',
      signup: 'https://telnyx.com/agent-signup.md',
    });
  }

  try {
    const accountState = await detectAccountState(apiKey);
    const level = computeLevel(accountState);
    const milestones = computeMilestones(accountState);
    const suggestions = computeSuggestions(accountState);

    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });

    // Progress = milestones achieved out of total possible (11 milestones)
    const totalMilestones = 11;
    const progressPercent = Math.round((milestones.length / totalMilestones) * 100);

    res.json({
      data: {
        account_level: level,
        progress_percent: progressPercent,
        account_state: accountState,
        completed_milestones: milestones,
        suggested_next: suggestions,
        quick_wins: QUICK_WINS,
        docs: DOCS,
      },
    });
  } catch (err) {
    console.error('Getting started error:', err.message);
    res.status(502).json({
      error: 'Failed to check account state',
      detail: err.message,
      hint: 'Ensure your API key is valid. Try: telnyx auth status',
    });
  }
}

module.exports = { gettingStartedHandler, detectAccountState, computeLevel, computeSuggestions, computeMilestones };
