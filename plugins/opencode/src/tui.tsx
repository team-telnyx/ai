/** @jsxImportSource @opentui/solid */
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { TuiPlugin, TuiPluginModule, TuiPluginApi } from "@opencode-ai/plugin/tui"
import { loadEnabledModels, persistEnabledModels, THINKING_CAPABLE_MODELS } from "./models-config"

const PROVIDER_ID = "telnyx"
const API_BASE = "https://api.telnyx.com/v2/ai"
const OPENAI_BASE = `${API_BASE}/openai`
const MODELS_URL = `${API_BASE}/models`
const TEXT_TASKS = new Set(["text-generation", "text generation"])

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null
}

function authFilePath(): string {
  const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share")
  return join(dataHome, "opencode", "auth.json")
}

function storedApiKey(): string | undefined {
  try {
    const auth = JSON.parse(readFileSync(authFilePath(), "utf8")) as unknown
    if (!isObject(auth)) return undefined
    const telnyx = auth[PROVIDER_ID]
    if (!isObject(telnyx) || telnyx.type !== "api") return undefined
    return typeof telnyx.key === "string" && telnyx.key.length > 0 ? telnyx.key : undefined
  } catch {
    return undefined
  }
}

function apiKey(): string | undefined {
  return process.env.TELNYX_API_KEY ?? storedApiKey()
}

function isTelnyxHostedModel(model: JsonObject): boolean {
  return typeof model.owned_by === "string" && model.owned_by.toLowerCase() === "telnyx"
}

type HostedModel = { id: string; name: string; context: number; output: number; vision: boolean; thinking: boolean }

function normalizeModel(model: JsonObject): HostedModel | undefined {
  const id = typeof model.id === "string" ? model.id : undefined
  const task = typeof model.task === "string" ? model.task : undefined
  const context = typeof model.context_length === "number" ? model.context_length : undefined
  if (!id || !task || context === undefined) return undefined
  if (!TEXT_TASKS.has(task)) return undefined
  if (!isTelnyxHostedModel(model)) return undefined
  const name = id.includes("/") ? id.split("/").pop() ?? id : id
  const vision = model.is_vision_supported === true
  const output = typeof model.max_output_length === "number" ? model.max_output_length : 16384
  const thinking = THINKING_CAPABLE_MODELS.has(id)
  return { id, name, context, output, vision, thinking }
}

async function fetchHostedModels(key: string | undefined): Promise<HostedModel[]> {
  if (!key) return []
  try {
    const response = await fetch(MODELS_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return []
    const payload = (await response.json()) as unknown
    const data = isObject(payload) && Array.isArray(payload.data) ? payload.data : []
    return data
      .flatMap((item) => {
        if (!isObject(item)) return []
        const normalized = normalizeModel(item)
        return normalized ? [normalized] : []
      })
      .sort((left, right) => left.id.localeCompare(right.id))
  } catch {
    return []
  }
}

function providerModels(models: HostedModel[], enabled: Set<string>) {
  return Object.fromEntries(
    models.flatMap((model) => {
      if (!enabled.has(model.id)) return []
      const entry: Record<string, unknown> = {
        name: model.name,
        limit: { context: model.context, output: model.output },
      }
      if (model.vision) {
        entry.attachment = true
        entry.modalities = { input: ["text", "image"], output: ["text"] }
      }
      if (model.thinking) {
        entry.reasoning = true
        entry.options = { enable_thinking: true }
        entry.variants = {
          thinking: { enable_thinking: true },
          "no-thinking": { enable_thinking: false },
          max: { disabled: true },
          high: { disabled: true },
          medium: { disabled: true },
          low: { disabled: true },
          fast: { disabled: true },
          none: { disabled: true },
        }
      }
      return [[model.id, entry] as const]
    }),
  )
}

async function openManager(api: TuiPluginApi): Promise<void> {
  const key = apiKey()
  if (!key) {
    api.ui.toast({ title: "Telnyx", message: "No API key found. Run opencode auth login --provider telnyx" })
    return
  }

  const models = await fetchHostedModels(key)
  if (models.length === 0) {
    api.ui.toast({ title: "Telnyx", message: "No Telnyx-hosted models found." })
    return
  }

  const enabled = new Set(loadEnabledModels())
  const DialogSelect = api.ui.DialogSelect
  const options = models.map((model) => ({
    title: model.name,
    value: model.id,
    category: "Telnyx",
    footer: enabled.has(model.id) ? "ON" : "OFF",
  }))

  api.ui.dialog.replace(() => (
    <DialogSelect<string>
      title={`Telnyx Models (${enabled.size} enabled)`}
      placeholder="Search models..."
      options={options}
      current={options[0]?.value}
      onSelect={async (option) => {
        const next = new Set(loadEnabledModels())
        if (next.has(option.value)) next.delete(option.value)
        else next.add(option.value)
        const persisted = [...next].sort((left, right) => left.localeCompare(right))
        const modelsMap = providerModels(models, next)
        try {
          await api.client.config.update({
            config: {
              provider: {
                [PROVIDER_ID]: {
                  npm: "@ai-sdk/openai-compatible",
                  name: "Telnyx",
                  options: {
                    baseURL: OPENAI_BASE,
                    apiKey: key,
                  },
                  models: modelsMap,
                },
              },
            },
          })
        } catch {
          api.ui.toast({ title: "Telnyx", message: `Failed to update ${option.title}` })
          return
        }
        persistEnabledModels(persisted)
        api.ui.toast({
          title: "Telnyx",
          message: `${next.has(option.value) ? "Enabled" : "Disabled"} ${option.title}`,
        })
        await openManager(api)
      }}
    />
  ))
  api.ui.dialog.setSize("large")
}

const tui: TuiPlugin = async (api) => {
  api.command.register(() => [
    {
      title: "Manage Telnyx models",
      value: "telnyx.manage-models",
      description: "Enable or disable Telnyx-hosted models",
      category: "Telnyx",
      slash: {
        name: "telnyx",
        aliases: ["telnyx-models"],
      },
      onSelect() {
        void openManager(api)
      },
    },
  ])
}

export default {
  id: "telnyx",
  tui,
} satisfies TuiPluginModule & { id: string }
