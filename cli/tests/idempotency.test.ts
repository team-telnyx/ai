/**
 * Unit tests for idempotency helpers — specifically the fix that prevents
 * adopting a live app as "bare" when the assigned-number lookup fails with a
 * transient error (5xx, permission, network).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookupAssignedNumber, findBareByPrefix, findReusablePair } from "../src/utils/idempotency.ts";
import type { TelnyxClient } from "../src/client.ts";

// Minimal mock client — only `.get` is used by the idempotency helpers.
function mockClient(getFn: (path: string, params?: Record<string, unknown>) => Promise<unknown>): TelnyxClient {
  return { get: getFn } as unknown as TelnyxClient;
}

describe("lookupAssignedNumber — error vs empty distinction", () => {
  it("returns no-number status when resource has no assigned number", async () => {
    const client = mockClient(async () => ({ data: [] }));
    const result = await lookupAssignedNumber(client, "connection_id", "cca_1");
    assert.equal(result.status, "no-number");
  });

  it("returns has-number status with number info when a number is assigned", async () => {
    const client = mockClient(async () => ({
      data: [{ id: "num_1", phone_number: "+13125550001", country_iso_alpha2: "US" }],
    }));
    const result = await lookupAssignedNumber(client, "connection_id", "cca_1");
    assert.equal(result.status, "has-number");
    if (result.status === "has-number") {
      assert.equal(result.number.phoneNumber, "+13125550001");
      assert.equal(result.number.phoneNumberId, "num_1");
      assert.equal(result.number.country, "US");
    }
  });

  it("returns error status on lookup failure (5xx)", async () => {
    const client = mockClient(async () => {
      throw new Error("500 Internal Server Error");
    });
    const result = await lookupAssignedNumber(client, "connection_id", "cca_1");
    assert.equal(result.status, "error", "expected error status on 5xx");
  });

  it("returns error status on permission/403 failure", async () => {
    const client = mockClient(async () => {
      throw new Error("403 Forbidden");
    });
    const result = await lookupAssignedNumber(client, "messaging_profile_id", "mp_1");
    assert.equal(result.status, "error");
  });
});

describe("findBareByPrefix — does NOT adopt on lookup error", () => {
  it("skips resources whose number lookup fails with 5xx (does not adopt as bare)", async () => {
    // Two apps: cca_2 (newest) checked first — lookup fails (503), skipped.
    // cca_1 (older) checked second — has a number, not bare.
    // No bare app found — the lookup error did NOT cause cca_2 to be adopted as bare.
    let callCount = 0;
    const client = mockClient(async (path: string) => {
      if (path === "/call_control_applications") {
        return {
          data: [
            { id: "cca_2", application_name: "Agent Voice App - 2025-01-02T00:00:00Z" },
            { id: "cca_1", application_name: "Agent Voice App - 2025-01-01T00:00:00Z" },
          ],
        };
      }
      if (path === "/phone_numbers") {
        callCount++;
        if (callCount === 1) throw new Error("503 Service Unavailable");
        return { data: [{ id: "num_1", phone_number: "+13125550001", country_iso_alpha2: "US" }] };
      }
      return { data: [] };
    });

    const result = await findBareByPrefix(client, "/call_control_applications", "application_name", "Agent Voice App - ", "connection_id");
    assert.equal(result, undefined, "should not return a resource whose lookup failed");
  });

  it("returns a genuinely bare app (no number, no error)", async () => {
    const client = mockClient(async (path: string) => {
      if (path === "/call_control_applications") {
        return {
          data: [{ id: "cca_1", application_name: "Agent Voice App - 2025-01-01T00:00:00Z" }],
        };
      }
      if (path === "/phone_numbers") {
        return { data: [] }; // genuinely no number assigned
      }
      return { data: [] };
    });

    const result = await findBareByPrefix(client, "/call_control_applications", "application_name", "Agent Voice App - ", "connection_id");
    assert.ok(result, "expected to find a bare app");
    assert.equal(result?.id, "cca_1");
  });
});

describe("findReusablePair — does not reuse on lookup error", () => {
  it("skips resources whose number lookup fails", async () => {
    let callCount = 0;
    const client = mockClient(async (path: string) => {
      if (path === "/messaging_profiles") {
        return {
          data: [
            { id: "mp_2", name: "Agent SMS Profile - 2025-01-02T00:00:00Z" },
            { id: "mp_1", name: "Agent SMS Profile - 2025-01-01T00:00:00Z" },
          ],
        };
      }
      if (path === "/phone_numbers") {
        callCount++;
        if (callCount === 1) throw new Error("500 Internal Server Error");
        return { data: [{ id: "num_1", phone_number: "+13125550002", country_iso_alpha2: "US" }] };
      }
      return { data: [] };
    });

    const result = await findReusablePair(client, "/messaging_profiles", "name", "Agent SMS Profile - ", "messaging_profile_id");
    // mp_2 (newest) had a lookup error → skipped (findAssignedNumber returns undefined)
    // mp_1 (older) has a number → reusable
    assert.ok(result, "expected to find a reusable pair from mp_1");
    assert.equal(result?.resource.id, "mp_1");
    assert.equal(result?.phoneNumber, "+13125550002");
  });

  it("returns undefined when all lookups fail", async () => {
    const client = mockClient(async (path: string) => {
      if (path === "/messaging_profiles") {
        return {
          data: [{ id: "mp_1", name: "Agent SMS Profile - 2025-01-01T00:00:00Z" }],
        };
      }
      if (path === "/phone_numbers") {
        throw new Error("502 Bad Gateway");
      }
      return { data: [] };
    });

    const result = await findReusablePair(client, "/messaging_profiles", "name", "Agent SMS Profile - ", "messaging_profile_id");
    assert.equal(result, undefined, "should not reuse when lookup fails for all resources");
  });
});
