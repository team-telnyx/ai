/**
 * Shared helper for ordering phone numbers and resolving the real resource ID.
 *
 * The Telnyx `/number_orders` response contains `number_order_phone_number` IDs,
 * NOT the actual phone number resource IDs used by `/phone_numbers/:id`.
 * We need to poll the order until success, then look up the real phone number resource.
 */

import { TelnyxClient, TelnyxAPIError } from "../client.ts";

const ORDER_POLL_INTERVAL_MS = 1500;
const ORDER_POLL_MAX_ATTEMPTS = 20; // 30 seconds max

interface OrderResult {
  phoneNumberId: string;
  orderId: string;
  orderStatus: string;
}

/**
 * Place a number order and poll until success, then resolve the real phone number resource ID.
 * Handles 409 (already purchased) by throwing a specific error so callers can retry.
 */
export async function orderAndResolveNumber(
  client: TelnyxClient,
  phoneNumber: string,
  orderBody: Record<string, unknown>,
): Promise<OrderResult> {
  // Place the order — 409 means number is already owned
  let orderRes;
  try {
    orderRes = await client.post("/number_orders", {
      phone_numbers: [{ phone_number: phoneNumber }],
      ...orderBody,
    });
  } catch (err) {
    if (err instanceof TelnyxAPIError && err.statusCode === 409) {
      throw new NumberAlreadyOwnedError(phoneNumber);
    }
    throw err;
  }
  const orderData = orderRes.data as Record<string, unknown>;
  const orderId = String(orderData.id ?? "");
  let orderStatus = String(orderData.status ?? "pending");

  // Poll order until success/failure (orders can be async)
  if (orderStatus === "pending") {
    for (let i = 0; i < ORDER_POLL_MAX_ATTEMPTS; i++) {
      await sleep(ORDER_POLL_INTERVAL_MS);
      try {
        const pollRes = await client.get(`/number_orders/${orderId}`);
        const pollData = pollRes.data as Record<string, unknown>;
        orderStatus = String(pollData.status ?? "pending");
        if (orderStatus === "success" || orderStatus === "failed") break;
      } catch {
        // Ignore poll errors, keep trying
      }
    }
  }

  if (orderStatus === "failed") {
    throw new Error(`Number order ${orderId} failed for ${phoneNumber}`);
  }

  // Resolve the real phone number resource ID by looking it up
  const phoneNumberId = await resolvePhoneNumberId(client, phoneNumber);

  return { phoneNumberId, orderId, orderStatus };
}

/**
 * Look up a phone number's resource ID by its E.164 value.
 * Retries a few times since the number may take a moment to appear after ordering.
 */
async function resolvePhoneNumberId(client: TelnyxClient, phoneNumber: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await client.get("/phone_numbers", {
        "filter[phone_number]": phoneNumber,
        "page[size]": 1,
      });
      const numbers = res.data as Record<string, unknown>[];
      if (numbers?.length && numbers[0].id) {
        return String(numbers[0].id);
      }
    } catch {
      // Ignore lookup errors, retry
    }
    if (i < 4) await sleep(1000);
  }
  throw new Error(`Could not resolve phone number resource ID for ${phoneNumber}`);
}

/**
 * Search for available numbers and try to buy one, retrying on 409 (already owned).
 * Returns the first successfully ordered number's resource ID.
 */
export async function searchAndBuyNumber(
  client: TelnyxClient,
  searchParams: Record<string, unknown>,
  orderBody: Record<string, unknown> = {},
): Promise<OrderResult & { phoneNumber: string }> {
  const res = await client.get("/available_phone_numbers", {
    ...searchParams,
    "filter[limit]": 5,
  });
  const numbers = res.data as Array<Record<string, unknown>>;
  if (!numbers?.length) {
    throw new Error("No phone numbers available matching search criteria");
  }

  for (const num of numbers) {
    const phoneNumber = String(num.phone_number);
    try {
      const result = await orderAndResolveNumber(client, phoneNumber, orderBody);
      return { ...result, phoneNumber };
    } catch (err) {
      if (err instanceof NumberAlreadyOwnedError) continue;
      throw err;
    }
  }
  throw new Error(`All ${numbers.length} candidate numbers were already owned`);
}

export class NumberAlreadyOwnedError extends Error {
  constructor(phoneNumber: string) {
    super(`Number ${phoneNumber} is already owned (409)`);
    this.name = "NumberAlreadyOwnedError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
