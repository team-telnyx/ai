/**
 * Structural validation for operational guides.
 * No API key needed — validates file structure, content, and parity with agent.json.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = typeof import.meta.dirname === "string"
  ? import.meta.dirname
  : dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GUIDES_DIR = join(ROOT, "guides");
const SKILLS_DIR = join(ROOT, "skills");
// agent.json lives alongside guides in the repo root (site is a separate repo)
const AGENT_JSON_PATH = join(ROOT, "agent.json");

// Load agent.json
const agentJson = JSON.parse(readFileSync(AGENT_JSON_PATH, "utf-8"));

// Get guide files
const guideFiles = readdirSync(GUIDES_DIR).filter((f) => f.endsWith(".md"));

// Get capabilities with guide fields
const capabilitiesWithGuides = agentJson.capabilities.filter(
  (c: any) => c.guide
);
const guidePathsFromAgent = capabilitiesWithGuides.map((c: any) =>
  c.guide.replace(/^\/guides\//, "")
);

describe("agent.json validity", () => {
  it("is valid JSON with required top-level keys", () => {
    for (const key of ["name", "capabilities", "auth", "cli", "sdks"]) {
      assert.ok(
        key in agentJson,
        `agent.json missing required key: ${key}`
      );
    }
  });

  it("keeps canonical RCS discovery synchronized", () => {
    const rcs = agentJson.capabilities.find((capability: any) => capability.id === "rcs");
    assert.ok(rcs, "agent.json missing RCS capability");
    assert.equal(rcs.guide, "/guides/rcs-messaging.md");
    assert.equal(rcs.api, "POST /v2/messages/rcs");
    assert.match(rcs.cli, /telnyx-agent rcs-send/);

    const guide = readFileSync(join(GUIDES_DIR, "rcs-messaging.md"), "utf-8");
    assert.match(guide, /POST \/v2\/messages\/rcs/);
    assert.match(guide, /GET \/v2\/messaging\/rcs\/capabilities\/\{agent_id\}\/\{phone_number\}/);
    assert.match(guide, /telnyx-agent rcs-send/);
    assert.match(guide, /telnyx-agent rcs-capabilities/);
    assert.match(guide, /skills\/telnyx-messaging-hosted-curl\/SKILL\.md/);
  });
});

describe("Meeting Bot discovery and durable alert contract", () => {
  const capability = agentJson.capabilities.find(
    (candidate: any) => candidate.id === "meeting_bot"
  );
  const guide = readFileSync(join(GUIDES_DIR, "meeting-bot.md"), "utf-8");
  const skill = readFileSync(
    join(SKILLS_DIR, "telnyx-meeting-bot", "SKILL.md"),
    "utf-8"
  );
  const repeatProtocol = readFileSync(
    join(SKILLS_DIR, "telnyx-meeting-bot", "references", "repeating-semantic-actions.md"),
    "utf-8"
  );
  const artifactRecovery = readFileSync(
    join(SKILLS_DIR, "telnyx-meeting-bot", "references", "artifact-selection-and-recovery.md"),
    "utf-8"
  );

  it("registers the canonical capability and guide", () => {
    assert.ok(capability, 'agent.json missing the "meeting_bot" capability');
    assert.equal(capability.guide, "/guides/meeting-bot.md");
    assert.equal(capability.api, "POST /v2/meeting_sessions");
    assert.equal(capability.docs, "https://developers.telnyx.com/docs/meeting");
    assert.match(guide, /https:\/\/api\.telnyx\.com\/v2\/meeting_bot\/mcp/);
    assert.match(guide, /skills\/telnyx-meeting-bot\/SKILL\.md/);
    assert.match(guide, /meeting-bot-service\/tree\/a9f6326bcaf7428364861290b787d5db1772e9f6/);
    assert.match(guide, /wait_seconds=2/);
    assert.match(guide, /actions\/speak/);
    assert.match(
      guide,
      /headers\.set\("Authorization", \["Bearer", apiKey\]\.join\(" "\)\);/
    );
    for (const type of ["summary", "action_items", "decisions", "topics", "open_questions", "custom"]) {
      assert.ok(
        guide.includes("| `" + type + "` |"),
        `meeting-bot guide missing artifact type: ${type}`
      );
    }
  });

  it("keeps mention delivery crash-safe", () => {
    assert.match(skill, /"status": "pending"/);
    assert.match(skill, /stable `delivery_id`/);
    assert.match(skill, /Mark the outbox item\s+`sent` only after confirmed delivery/);
    assert.match(skill, /retry pending alerts/i);
    assert.match(skill, /wait_seconds: 2/);
    assert.match(skill, /### Reactive lunch answer/);
    assert.match(skill, /A one-shot\s+key uses only session and rule/);
    assert.match(skill, /"key": "action:<session_id>:<rule_id>"/);
    assert.doesNotMatch(skill, /"key": "action:<session_id>:<rule_id>:<first_trigger_seq>"/);
    assert.match(skill, /repeating-semantic-actions\.md/);
    assert.match(skill, /persist `occurrence_first_seq` and `evidence_seqs`/);
    assert.match(skill, /action:<session_id>:<rule_id>:repeat:<occurrence_first_seq>/);
    assert.match(skill, /repeating literal rule, atomically claim `action:<session_id>:<rule_id>:repeat:<segment\.seq>`/);
    assert.match(skill, /never key from the newest evaluation segment/);
    assert.match(repeatProtocol, /shortest contiguous suffix ending at the current sequence/);
    assert.match(repeatProtocol, /durable exclusive lease/);
    assert.match(repeatProtocol, /active_occurrence/);
    assert.match(repeatProtocol, /compares the prior `generation`, lease owner\/validity, and prior\s+`last_evaluated_seq`/);
    assert.match(repeatProtocol, /must fail that CAS/);
    assert.match(repeatProtocol, /one per-sequence CAS transaction/);
    assert.match(repeatProtocol, /That same transaction must advance `last_evaluated_seq`/);
    assert.match(repeatProtocol, /create `active_occurrence` plus the durable\s+action claim/);
    assert.match(repeatProtocol, /Dispatch only after that combined transaction commits/);
    assert.match(repeatProtocol, /CAS loser reloads state without dispatching/);
    assert.match(repeatProtocol, /never advance the cursor and clear in separate\s+writes/);
    assert.match(repeatProtocol, /every positive overlapping window reuses its\s+persisted claim key/);
    assert.match(repeatProtocol, /context window contains none of the persisted `evidence_seqs`/);
    assert.match(repeatProtocol, /persisted semantic condition evaluates false/);
    assert.match(repeatProtocol, /clear commits and a\s+still-later ordered evaluation produces a new false-to-true transition/);
    assert.match(skill, /do \*\*not\*\* automatically repeat an\s+accepted action/);
  });

  it("selects the final summary and retries only proven non-dispatches", () => {
    assert.match(skill, /artifact-selection-and-recovery\.md/);
    assert.match(skill, /`transcript\.completed\.occurred_at`/);
    assert.doesNotMatch(skill, /summary_creation_attempted/);
    assert.match(guide, /no automatic-origin marker/);
    assert.match(guide, /`pre_send_failed`/);
    assert.match(guide, /`outcome_unknown`/);
    assert.match(artifactRecovery, /no `automatic`, `origin`, or final-summary marker/);
    assert.match(artifactRecovery, /known_manual_artifact_ids/);
    assert.match(artifactRecovery, /unreconciled_unknown_manual_creates/);
    assert.match(artifactRecovery, /`created_at >= transcript_completed_at`/);
    assert.match(artifactRecovery, /Poll all current candidates/);
    assert.match(artifactRecovery, /Never use\s+artifact ID, list order, completion order, or client-clock windows as an\s+origin tie-breaker/);
    assert.match(artifactRecovery, /two candidates share\s+the minimum timestamp/);
    assert.match(artifactRecovery, /same-type unknown create remains unreconciled/);
    assert.match(artifactRecovery, /every otherwise-unrecognized\s+same-type artifact is possible manual output/);
    assert.match(artifactRecovery, /Immediately before fallback, re-list once more/);
    assert.match(artifactRecovery, /proves that no request bytes were sent/);
    assert.match(artifactRecovery, /Recovery from either `dispatching` or `outcome_unknown`\s+must persist an unreconciled same-type unknown-create marker and\s+re-list\/reconcile only/);
    assert.match(artifactRecovery, /Never collapse `pre_send_failed` and `outcome_unknown`/);
  });
});

describe("guide ↔ agent.json parity", () => {
  it("every capability with a guide field → file exists", () => {
    for (const cap of capabilitiesWithGuides) {
      const filename = cap.guide.replace(/^\/guides\//, "");
      const filepath = join(GUIDES_DIR, filename);
      assert.ok(
        existsSync(filepath),
        `Capability "${cap.id}" references guide "${cap.guide}" but file not found at ${filepath}`
      );
    }
  });

  it("every .md file in guides/ is referenced by at least one capability", () => {
    for (const file of guideFiles) {
      assert.ok(
        guidePathsFromAgent.includes(file),
        `Guide file "${file}" is not referenced by any capability in agent.json`
      );
    }
  });

  it("total guide count matches guide fields count in agent.json", () => {
    assert.equal(
      guideFiles.length,
      guidePathsFromAgent.length,
      `Guide files (${guideFiles.length}) != agent.json guide refs (${guidePathsFromAgent.length})`
    );
  });
});

describe("Verify discovery parity", () => {
  const verifyCapability = agentJson.capabilities.find((c: any) => c.id === "verify");
  const verifyGuide = readFileSync(join(GUIDES_DIR, "phone-verification.md"), "utf-8");

  it("advertises WhatsApp with the current endpoint and generated CLI command", () => {
    assert.ok(verifyCapability, 'agent.json missing the "verify" capability');
    assert.match(verifyCapability.description, /SMS.*voice call.*flash call.*WhatsApp/i);
    assert.equal(verifyCapability.api, "POST /v2/verifications/whatsapp");
    assert.equal(
      verifyCapability.cli,
      "telnyx-agent verify-send --phone-number +15551234567 --verify-profile-id prof_xxx --method whatsapp"
    );

    assert.match(verifyGuide, /SMS.*voice call.*flash call.*WhatsApp/i);
    assert.match(verifyGuide, /### Send WhatsApp Verification/);
    assert.match(verifyGuide, /POST \/v2\/verifications\/whatsapp/);
    assert.ok(
      verifyGuide.includes(verifyCapability.cli),
      "phone verification guide must include the canonical Verify CLI example"
    );
  });
});

describe("guide content requirements", () => {
  for (const file of guideFiles) {
    const filepath = join(GUIDES_DIR, file);
    const content = readFileSync(filepath, "utf-8");
    const lines = content.split("\n");

    describe(file, () => {
      it('has "## Prerequisites" section', () => {
        assert.ok(
          content.includes("## Prerequisites"),
          `${file} missing "## Prerequisites" section`
        );
      });

      it('has "## Quick Start" section', () => {
        assert.ok(
          content.includes("## Quick Start"),
          `${file} missing "## Quick Start" section`
        );
      });

      it('has "## API Reference" section', () => {
        assert.ok(
          content.includes("## API Reference"),
          `${file} missing "## API Reference" section`
        );
      });

      it("has at least 1 curl example", () => {
        assert.ok(
          /curl\s/.test(content),
          `${file} has no curl examples`
        );
      });

      it("has at least 1 Python code block", () => {
        assert.ok(
          content.includes("```python"),
          `${file} has no Python code blocks`
        );
      });

      it("has at least 1 TypeScript code block", () => {
        assert.ok(
          content.includes("```typescript"),
          `${file} has no TypeScript code blocks`
        );
      });

      it("is between 50-500 lines", () => {
        assert.ok(
          lines.length >= 50 && lines.length <= 500,
          `${file} has ${lines.length} lines (expected 50-500)`
        );
      });

      it("has no internal URL leaks", () => {
        const leakPatterns = [
          /\.consul/i,
          /internal\.telnyx/i,
          /clawdbot/i,
          /clawhub/i,
          /openclaw/i,
        ];
        for (const pattern of leakPatterns) {
          assert.ok(
            !pattern.test(content),
            `${file} contains internal URL leak matching ${pattern}`
          );
        }
      });
    });
  }
});
