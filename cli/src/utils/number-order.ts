/**
 * Shared helper for searching and ordering phone numbers via telnyx CLI (Go binary).
 *
 * Uses the Stainless-generated Go CLI commands:
 * - `available-phone-numbers list` for searching
 * - `number-orders create` for ordering
 * - `phone-numbers retrieve` for lookup
 */

import { telnyxCli, TelnyxCLIError } from "../telnyx-cli.ts";

export class NumberAlreadyOwnedError extends Error {
  constructor(phoneNumber: string) {
    super(`Number ${phoneNumber} is already owned (409)`);
    this.name = "NumberAlreadyOwnedError";
  }
}

interface OrderResult {
  phoneNumberId: string;
  orderId: string;
  orderStatus: string;
}

/**
 * Search for available phone numbers via CLI.
 *
 * @returns Array of available phone number objects
 */
export async function searchNumbers(
  country: string,
  opts?: {
    features?: string;
    type?: string;
    limit?: number;
  },
): Promise<Array<Record<string, unknown>>> {
  const args = ["available-phone-numbers", "list", "--filter.country-code", country];
  if (opts?.type) args.push("--filter.phone-number-type", opts.type);
  if (opts?.limit) args.push("--page.size", String(opts.limit));
  if (opts?.features) args.push("--filter.features", opts.features);

  const res = await telnyxCli(args);
  const numbers = res.data as Array<Record<string, unknown>>;
  if (!numbers?.length) {
    throw new Error(`No phone numbers available in ${country}`);
  }
  return numbers;
}

/**
 * Order a phone number via CLI and resolve the real phone number resource ID.
 * Uses `number-orders create` for the order flow.
 */
export async function orderNumber(
  phoneNumber: string,
  opts?: {
    messagingProfileId?: string;
    connectionId?: string;
    billingGroupId?: string;
  },
): Promise<OrderResult> {
  const args = ["number-orders", "create", "--phone-numbers", phoneNumber];
  if (opts?.messagingProfileId) args.push("--messaging-profile-id", opts.messagingProfileId);
  if (opts?.connectionId) args.push("--connection-id", opts.connectionId);
  if (opts?.billingGroupId) args.push("--billing-group-id", opts.billingGroupId);

  try {
    const res = await telnyxCli(args, { timeout: 120000 }); // Ordering can take time
    const orderData = res.data as Record<string, unknown>;

    // The order response contains the order details
    const orderId = String(orderData?.id ?? "");
    const orderStatus = String(orderData?.status ?? "success");

    // Resolve the real phone number resource ID by looking it up via CLI
    const phoneNumberId = await resolvePhoneNumberId(phoneNumber);

    return { phoneNumberId, orderId, orderStatus };
  } catch (err) {
    if (err instanceof TelnyxCLIError && err.stderr.includes("409")) {
      throw new NumberAlreadyOwnedError(phoneNumber);
    }
    throw err;
  }
}

/**
 * Search for available numbers and try to buy one, retrying on 409 (already owned).
 * Returns the first successfully ordered number.
 */
export async function searchAndBuyNumber(
  country: string,
  opts?: {
    features?: string;
    type?: string;
    messagingProfileId?: string;
    connectionId?: string;
  },
): Promise<OrderResult & { phoneNumber: string }> {
  const numbers = await searchNumbers(country, {
    features: opts?.features,
    type: opts?.type ?? "local",
    limit: 5,
  });

  for (const num of numbers) {
    const phoneNumber = String(num.phone_number);
    try {
      const result = await orderNumber(phoneNumber, {
        messagingProfileId: opts?.messagingProfileId,
        connectionId: opts?.connectionId,
      });
      return { ...result, phoneNumber };
    } catch (err) {
      if (err instanceof NumberAlreadyOwnedError) continue;
      throw err;
    }
  }
  throw new Error(`All ${numbers.length} candidate numbers were already owned`);
}

/**
 * Look up a phone number's resource ID by its E.164 value via CLI.
 * Retries a few times since the number may take a moment to appear after ordering.
 */
async function resolvePhoneNumberId(phoneNumber: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await telnyxCli(["phone-numbers", "retrieve", "--id", phoneNumber]);
      const data = res.data as Record<string, unknown>;
      if (data?.id) return String(data.id);
    } catch {
      // Ignore lookup errors, retry
    }
    if (i < 4) await sleep(1500);
  }
  throw new Error(`Could not resolve phone number resource ID for ${phoneNumber}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
