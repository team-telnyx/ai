import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

const MODELS_CONFIG_FILE = "telnyx-models.json"

type JsonObject = Record<string, unknown>

export type ModelsConfigFile = {
  version: number
  enabledModels: string[]
}

export const MODELS_CONFIG_VERSION = 1
export const DEFAULT_ENABLED_MODELS = [
  "moonshotai/Kimi-K2.6",
  "zai-org/GLM-5.1-FP8",
  "MiniMaxAI/MiniMax-M2.7",
  "zai-org/GLM-5.2",
  "MiniMaxAI/MiniMax-M3-MXFP8",
] as const

/**
 * Telnyx-hosted model IDs known to support the `enable_thinking` request
 * parameter (reasoning models). The Telnyx API rejects `enable_thinking`
 * for non-reasoner models with error 10015, so this set must only contain
 * confirmed reasoners. Verified via the Telnyx Chat Completions API.
 *
 * Extend this set as new reasoners are confirmed on the Telnyx platform.
 */
export const THINKING_CAPABLE_MODELS: ReadonlySet<string> = new Set([
  "moonshotai/Kimi-K2.6",
  "zai-org/GLM-5.1-FP8",
  "MiniMaxAI/MiniMax-M2.7",
  "zai-org/GLM-5.2",
  "MiniMaxAI/MiniMax-M3-MXFP8",
])

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null
}

function configDirPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config")
  return join(configHome, "opencode")
}

export function modelsConfigPath(): string {
  const override = process.env.OPENCODE_TELNYX_MODELS_PATH?.trim()
  return override && override.length > 0 ? override : join(configDirPath(), MODELS_CONFIG_FILE)
}

export function defaultModelsConfig(): ModelsConfigFile {
  return {
    version: MODELS_CONFIG_VERSION,
    enabledModels: [...DEFAULT_ENABLED_MODELS],
  }
}

export function persistDefaultModelsConfigIfMissing(): void {
  const path = modelsConfigPath()
  if (existsSync(path)) return

  const payload = `${JSON.stringify(defaultModelsConfig(), null, 2)}\n`
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, payload, "utf8")
  renameSync(tempPath, path)
}

function parseEnabledModels(raw: unknown): string[] | undefined {
  if (!isObject(raw) || raw.version !== MODELS_CONFIG_VERSION || !Array.isArray(raw.enabledModels)) {
    return undefined
  }

  return [...new Set(raw.enabledModels.filter((value): value is string => typeof value === "string" && value.length > 0))]
}

export function loadEnabledModels(): string[] {
  try {
    persistDefaultModelsConfigIfMissing()
    const raw = JSON.parse(readFileSync(modelsConfigPath(), "utf8")) as unknown
    return parseEnabledModels(raw) ?? [...DEFAULT_ENABLED_MODELS]
  } catch {
    return [...DEFAULT_ENABLED_MODELS]
  }
}

export function persistEnabledModels(enabledModels: readonly string[]): void {
  const payload: ModelsConfigFile = {
    version: MODELS_CONFIG_VERSION,
    enabledModels: [...new Set(enabledModels)],
  }
  const path = modelsConfigPath()
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  renameSync(tempPath, path)
}
