/** Explicit read-only compositions; never invent a route or fall back to mutation. */
type ReadTool = (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

export async function executeComposition(
  name: string, args: Record<string, unknown>, readTool: ReadTool,
): Promise<Record<string, unknown>> {
  args = { ...args };
  if (name === "get_voice_clone") return getVoiceClone(args, readTool);
  if (name !== "bulk_lookup_numbers") throw new Error(`Unknown composition: ${name}`);
  // Copy before validation: sparse/externally mutated arrays cannot add work.
  const numbers = (Array.isArray(args.phone_numbers) ? Array.from(args.phone_numbers) : args.phone_numbers) as string[];
  const concurrency = (args.concurrency === undefined ? 5 : args.concurrency) as number;
  if (
    Object.keys(args).some((k) => !["phone_numbers", "concurrency", "type"].includes(k)) ||
    !Array.isArray(numbers) || numbers.length < 1 || numbers.length > 100 ||
    numbers.some((n) => typeof n !== "string" || !/^\+[1-9][0-9]{1,14}$/.test(n)) ||
    !Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10 ||
    (args.type != null && !["carrier", "caller-name"].includes(args.type as string))
  ) throw new Error("Invalid bulk_lookup_numbers arguments: expected 1-100 E.164 numbers, concurrency 1-10 and optional lookup type");
  const results: Record<string, unknown>[] = new Array(numbers.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < numbers.length) {
      const index = cursor++;
      const number = numbers[index];
      const lookupArgs: Record<string, unknown> = { phone_number: number };
      if (args.type != null) lookupArgs.type = args.type;
      try {
        const response = await readTool("lookup_number", lookupArgs);
        results[index] = { phone_number: number, response };
      } catch (error) {
        results[index] = { phone_number: number, error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, numbers.length) }, worker));
  const failed = results.filter((r) => "error" in r).length;
  return { results, succeeded: results.length - failed, failed };
}


async function getVoiceClone(args: Record<string, unknown>, readTool: ReadTool): Promise<Record<string, unknown>> {
  const id = args.id;
  const size = (args.page_size === undefined ? 100 : args.page_size) as number;
  const limit = (args.max_pages === undefined ? 20 : args.max_pages) as number;
  if (
    Object.keys(args).some((k) => !["id", "page_size", "max_pages"].includes(k)) ||
    typeof id !== "string" || !id.trim() ||
    !Number.isInteger(size) || size < 1 || size > 250 ||
    !Number.isInteger(limit) || limit < 1 || limit > 100
  ) throw new Error("Invalid get_voice_clone arguments: expected id, page_size 1-250 and max_pages 1-100");
  for (let page = 1; page <= limit; page++) {
    const response = await readTool("list_voice_clones", { page_number: page, page_size: size });
    const data = response.data;
    if (!Array.isArray(data) || data.some((item) => !item || typeof item !== "object" || typeof item.id !== "string")) {
      throw new Error("Invalid voice clone list response");
    }
    const meta = response.meta as Record<string, unknown> | undefined;
    const total = meta?.total_pages as number;
    if (!Number.isInteger(total) || !Number.isInteger(meta?.page_number) || meta?.page_number !== page ||
        total < 0 || (total === 0 && (page !== 1 || data.length > 0)) || (total > 0 && page > total)) {
      throw new Error("Invalid voice clone pagination metadata");
    }
    for (const clone of data) if (clone.id === id) return { data: clone };
    if (page >= total) return { data: null, status: "not_found", pages_scanned: page };
  }
  return { data: null, status: "incomplete", pages_scanned: limit };
}
