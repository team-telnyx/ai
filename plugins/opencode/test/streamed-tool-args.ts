// Live regression probe for team-telnyx/ai#248: streamed tool_calls on GLM models
// once re-emitted overlapping fragments inside function.arguments, so a path like
// C:\work\project\docs\telnyx\worker.js came back as ...\worker.jsrker.js — valid
// JSON, wrong value. The backend no longer does this (verified 2026-10-16: GLM-5.2
// emits its arguments in a single final delta). This probe calls the chat
// completions endpoint directly (no opencode binary needed) and fails if any
// Telnyx-hosted text model returns a filePath that differs from the one requested.
//
// Usage: TELNYX_API_KEY=... npm run test:stream-args
//   TELNYX_TEST_MODEL_MATCH=GLM   only models whose id contains the string
//   TELNYX_TEST_LIMIT=2           cap the number of models probed
//   TELNYX_TEST_RUNS=5            attempts per model (default 3)

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, "..")
const ENDPOINT = "https://api.telnyx.com/v2/ai/chat/completions"
const MODELS_URL = "https://api.telnyx.com/v2/ai/models"
const TEXT_TASKS = new Set(["text-generation", "text generation"])
const TARGET_PATH = "C:\\work\\project\\docs\\telnyx\\worker.js"
const TOOL_NAME = "filesystem-read"
const DEFAULT_RUNS = 3
const REQUEST_TIMEOUT_MS = 90_000

type Outcome =
  | { kind: "exact"; fragments: number }
  | { kind: "mismatch"; got: string | null; fragments: number; concatenated: string }
  | { kind: "no_tool_call"; finishReason: string | null }
  | { kind: "unsupported"; detail: string }
  | { kind: "http_error"; status: number; body: string }

function loadDotEnvIfNeeded(): void {
  if (process.env.TELNYX_API_KEY?.trim()) return
  const envPath = join(ROOT_DIR, ".env")
  if (!existsSync(envPath)) return
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const normalized = line.startsWith("export ") ? line.slice(7) : line
    const separator = normalized.indexOf("=")
    if (separator <= 0) continue
    const key = normalized.slice(0, separator).trim()
    let value = normalized.slice(separator + 1).trim()
    if (!key || process.env[key] !== undefined) continue
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

// Same filtering as the plugin and test/run.ts: Telnyx-hosted text models only.
async function fetchTelnyxModels(apiKey: string): Promise<string[]> {
  const response = await fetch(MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`Failed to fetch Telnyx models: ${response.status} ${response.statusText}`)

  const payload = (await response.json()) as { data?: unknown }
  const data = Array.isArray(payload.data) ? payload.data : []
  const ids = data.flatMap((item) => {
    if (typeof item !== "object" || item === null) return []
    const record = item as Record<string, unknown>
    if (typeof record.id !== "string" || typeof record.task !== "string") return []
    if (!TEXT_TASKS.has(record.task)) return []
    if (typeof record.owned_by !== "string" || record.owned_by.toLowerCase() !== "telnyx") return []
    return [record.id]
  }).sort()

  const match = process.env.TELNYX_TEST_MODEL_MATCH?.trim()
  const filtered = match ? ids.filter((id) => id.includes(match)) : ids
  const limit = Number(process.env.TELNYX_TEST_LIMIT?.trim() || 0)
  return limit > 0 ? filtered.slice(0, limit) : filtered
}

async function streamToolCall(apiKey: string, model: string): Promise<Outcome> {
  const body = {
    model,
    stream: true,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: `Read the file at ${TARGET_PATH} using the ${TOOL_NAME} tool. Call the tool now with that exact path; do not ask questions.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: TOOL_NAME,
          description: "Read a file from disk",
          parameters: {
            type: "object",
            properties: { filePath: { type: "string", description: "Absolute path of the file" } },
            required: ["filePath"],
          },
        },
      },
    ],
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const text = await response.text()
  if (response.status === 422 && /tool.?choice|tool-call-parser/i.test(text)) {
    // Model is served without a tool-call parser: nothing to stream, nothing to corrupt.
    return { kind: "unsupported", detail: text.replace(/\s+/g, " ").slice(0, 160) }
  }
  if (response.status !== 200) return { kind: "http_error", status: response.status, body: text.replace(/\s+/g, " ").slice(0, 160) }

  const fragments: string[] = []
  let finishReason: string | null = null
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue
    const payload = line.slice(5).trim()
    if (payload === "[DONE]") continue
    let chunk: { choices?: Array<{ finish_reason?: string | null; delta?: { tool_calls?: Array<{ function?: { arguments?: unknown } }> } }> }
    try {
      chunk = JSON.parse(payload)
    } catch {
      continue
    }
    const choice = chunk.choices?.[0]
    if (!choice) continue
    if (choice.finish_reason) finishReason = choice.finish_reason
    for (const call of choice.delta?.tool_calls ?? []) {
      const args = call.function?.arguments
      if (typeof args === "string") fragments.push(args)
    }
  }

  if (fragments.length === 0) return { kind: "no_tool_call", finishReason }
  const concatenated = fragments.join("")
  let got: string | null = null
  try {
    got = (JSON.parse(concatenated) as { filePath?: unknown }).filePath as string | null
  } catch {
    got = null
  }
  if (got === TARGET_PATH) return { kind: "exact", fragments: fragments.length }
  return { kind: "mismatch", got, fragments: fragments.length, concatenated }
}

async function main(): Promise<void> {
  loadDotEnvIfNeeded()
  const apiKey = process.env.TELNYX_API_KEY?.trim()
  if (!apiKey) {
    console.log("TELNYX_API_KEY not set; skipping streamed tool-argument probe.")
    return
  }

  const runs = Number(process.env.TELNYX_TEST_RUNS?.trim() || DEFAULT_RUNS)
  const models = await fetchTelnyxModels(apiKey)
  if (models.length === 0) throw new Error("No Telnyx-hosted text models matched the current filters.")

  let failed = false
  for (const model of models) {
    const outcomes: Outcome[] = []
    for (let i = 0; i < runs; i++) outcomes.push(await streamToolCall(apiKey, model))

    const exact = outcomes.filter((o) => o.kind === "exact").length
    const mismatches = outcomes.filter((o): o is Extract<Outcome, { kind: "mismatch" }> => o.kind === "mismatch")
    const noCall = outcomes.filter((o) => o.kind === "no_tool_call").length
    const unsupported = outcomes.filter((o): o is Extract<Outcome, { kind: "unsupported" }> => o.kind === "unsupported")
    const httpErrors = outcomes.filter((o): o is Extract<Outcome, { kind: "http_error" }> => o.kind === "http_error")
    const fragmentCounts = outcomes.flatMap((o) => ("fragments" in o ? [o.fragments] : []))

    // Only corrupted arguments fail the probe. Models without tool support are skipped,
    // and transient HTTP errors are reported as warnings so capacity blips do not mask #248.
    let status = "ok"
    if (mismatches.length > 0) status = "FAIL"
    else if (unsupported.length === outcomes.length) status = "skip"
    else if (httpErrors.length > 0) status = "warn"
    console.log(
      `${status.padEnd(4)} ${model}: exact=${exact}/${runs} no_tool_call=${noCall} fragments=${fragmentCounts.join(",") || "-"}`,
    )
    for (const m of mismatches) {
      failed = true
      console.log(`     corrupted arguments: got ${JSON.stringify(m.got)} from ${m.fragments} fragment(s): ${m.concatenated}`)
    }
    if (unsupported.length > 0) console.log(`     no tool-call support: ${unsupported[0].detail}`)
    for (const e of httpErrors) console.log(`     HTTP ${e.status}: ${e.body}`)
  }

  if (failed) {
    process.exitCode = 1
    console.log("Streamed tool-call arguments were corrupted; see team-telnyx/ai#248.")
  }
}

await main()
