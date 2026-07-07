/**
 * Message status helpers — derive delivery state from Telnyx message resources.
 *
 * The Messages API reports delivery state per recipient (`data.to[].status`),
 * not as a top-level `status` field (see the OutboundMessagePayload schema:
 * `to` is an array of { phone_number, carrier, line_type, status }).
 */

export interface RecipientStatus {
  phone_number: string;
  status: string;
}

/** Extract per-recipient { phone_number, status } entries from a message resource. */
export function recipientStatuses(data: Record<string, unknown>): RecipientStatus[] {
  const to = data.to;
  if (!Array.isArray(to)) return [];
  const out: RecipientStatus[] = [];
  for (const entry of to) {
    if (entry && typeof entry === "object") {
      const rec = entry as Record<string, unknown>;
      out.push({
        phone_number: String(rec.phone_number ?? ""),
        status: String(rec.status ?? ""),
      });
    }
  }
  return out;
}

/**
 * Derive a single status string for a message resource.
 * Prefers recipient status(es) from `data.to[].status`; falls back to a
 * top-level `status`/`delivery_status` if present (defensive), then `fallback`.
 * Multiple distinct recipient statuses are joined with ", ".
 */
export function deriveMessageStatus(data: Record<string, unknown>, fallback: string): string {
  const statuses = recipientStatuses(data)
    .map((r) => r.status)
    .filter((s) => s.length > 0);
  if (statuses.length > 0) {
    const unique = [...new Set(statuses)];
    return unique.join(", ");
  }
  if (typeof data.status === "string" && data.status) return data.status;
  if (typeof data.delivery_status === "string" && data.delivery_status) return data.delivery_status;
  return fallback;
}
