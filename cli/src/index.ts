/**
 * Command router for telnyx-agent CLI.
 */

import { setupSmsCommand } from "./commands/setup-sms.ts";
import { setupVoiceCommand } from "./commands/setup-voice.ts";
import { setupIotCommand } from "./commands/setup-iot.ts";
import { setupAiCommand } from "./commands/setup-ai.ts";
import { setupWireguardCommand } from "./commands/setup-wireguard.ts";
import { setupVerifyCommand } from "./commands/setup-verify.ts";
import { setup10dlcCommand } from "./commands/setup-10dlc.ts";
import { capabilitiesCommand } from "./commands/capabilities.ts";
import { statusCommand } from "./commands/status.ts";
import { fundAccountCommand } from "./commands/fund-account.ts";
import { parseFlags } from "./utils/output.ts";

const HELP = `
telnyx-agent — Agent-friendly CLI for Telnyx API v2

Usage:
  telnyx-agent <command> [flags]

Commands:
  setup-sms         Zero to SMS: create profile, buy number, assign it
  setup-voice       Zero to voice: create connection, buy number, assign it
  setup-iot         Zero to IoT: list SIMs, create group, activate SIM
  setup-ai          Zero to AI: create assistant, buy number, wire them together
  setup-wireguard   Zero to VPN: create network, WireGuard interface, peer
  setup-verify      Zero to verification: create profile, buy number
  setup-10dlc       Zero to A2P: create brand, campaign, assign number
  status            Account health overview
  capabilities      List all available API capabilities
  fund-account      Fund account via x402 USDC payment (EIP-712 signing)

Global Flags:
  --json            Output structured JSON instead of human-readable text
  --country <code>  Country code for number search (default: US)

Setup-specific Flags:
  --webhook <url>   Webhook URL (setup-voice)
  --instructions    AI assistant instructions (setup-ai)
  --name            AI assistant name (setup-ai)
  --network-id      Use existing network (setup-wireguard)
  --profile-name    Custom verify profile name (setup-verify)
  --phone           Contact phone for brand (setup-10dlc, required)
  --email           Contact email for brand (setup-10dlc, required)
  --brand-name      Brand display name (setup-10dlc)
  --company-name    Company name (setup-10dlc)
  --vertical        Business vertical (setup-10dlc, default: TECHNOLOGY)
  --usecase         Campaign use case (setup-10dlc, default: CUSTOMER_CARE)
  --description     Campaign description (setup-10dlc)
  --sample-message  Sample message text (setup-10dlc)
  --phone-number-id Assign existing number to campaign (setup-10dlc)

Fund-account Flags:
  --amount <usd>    Amount to fund in USD (required, e.g., 50.00)
  --wallet-key <0x> Private key for signing (optional, outputs payment requirements if omitted)

Environment:
  TELNYX_API_KEY    API key (or configure ~/.config/telnyx/config.json)

Examples:
  telnyx-agent status
  telnyx-agent status --json
  telnyx-agent capabilities
  telnyx-agent setup-sms --country US
  telnyx-agent setup-voice --webhook https://example.com/calls
  telnyx-agent setup-ai --instructions "You are a pizza ordering bot"
  telnyx-agent fund-account --amount 50.00
  telnyx-agent fund-account --amount 50.00 --wallet-key 0x... --json
`;

const COMMANDS: Record<string, (flags: Record<string, string | boolean>) => Promise<void>> = {
  "setup-sms": setupSmsCommand,
  "setup-voice": setupVoiceCommand,
  "setup-iot": setupIotCommand,
  "setup-ai": setupAiCommand,
  "setup-wireguard": setupWireguardCommand,
  "setup-verify": setupVerifyCommand,
  "setup-10dlc": setup10dlcCommand,
  capabilities: capabilitiesCommand,
  status: statusCommand,
  "fund-account": fundAccountCommand,
};

export async function run(argv: string[]): Promise<void> {
  const { command, flags } = parseFlags(argv);

  if (command === "help" || command === "--help" || command === "-h" || !command) {
    console.log(HELP);
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}\n`);
    console.log(HELP);
    process.exit(1);
  }

  await handler(flags);
}
