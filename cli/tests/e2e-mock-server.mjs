/**
 * Standalone mock Telnyx API for the end-to-end walkthrough.
 *
 * Emulates just enough of the v2 REST surface for the fixed commands
 * (AIF-326/327/334/335/336) to run against the REAL built CLI binary, the way
 * a zero-knowledge developer or a blind agent would invoke it. Records every
 * request to a log file so the harness can assert what the CLI actually did.
 *
 * Usage: node e2e-mock-server.mjs <logPath>   (prints "PORT=<n>" then serves)
 */
import { createServer } from "node:http";
import { appendFileSync } from "node:fs";

const logPath = process.argv[2];
function log(entry) {
  appendFileSync(logPath, JSON.stringify(entry) + "\n");
}

// In-memory state so setup-* idempotency (AIF-336) is exercised realistically.
const state = {
  messagingProfiles: [],
  callControlApps: [],
  phoneNumbers: [], // { id, phone_number, messaging_profile_id, connection_id }
  seq: 1,
};
const nextId = (p) => `${p}_${state.seq++}`;

// Optional pre-seed (JSON) so the harness can exercise setup-* reuse (AIF-336)
// without first running the Go-CLI number-buy path.
if (process.env.E2E_SEED) {
  try {
    const seed = JSON.parse(process.env.E2E_SEED);
    if (seed.messagingProfiles) state.messagingProfiles = seed.messagingProfiles;
    if (seed.callControlApps) state.callControlApps = seed.callControlApps;
    if (seed.phoneNumbers) state.phoneNumbers = seed.phoneNumbers;
  } catch { /* ignore bad seed */ }
}

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const path = url.pathname.replace(/^\/v2/, "");
  let raw = "";
  req.on("data", (c) => (raw += c.toString()));
  req.on("end", () => {
    // Body may be non-JSON (e.g. multipart uploads, malformed retries). A bare
    // JSON.parse here used to throw and crash the ENTIRE mock, taking down every
    // subsequent request. Parse defensively and keep serving.
    let body;
    try {
      body = raw ? JSON.parse(raw) : undefined;
    } catch {
      body = undefined; // non-JSON body; routes that need it will just 404/echo empty
    }
    log({ method: req.method, path, query: url.search, body });
    const ok = (json, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(json));
    };
    const notFound = () => {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ errors: [{ code: "10005", detail: `no route ${req.method} ${path}` }] }));
    };
    try {

    // --- Voice: call-dial (AIF-327), call-status (AIF-334) ---
    if (req.method === "POST" && path === "/calls") {
      // Echo back the +E.164 to so the harness can prove it survived.
      return ok({ data: { call_control_id: "cc_e2e_1", call_leg_id: "leg_1", call_session_id: "sess_1", is_alive: true, to: body?.to } });
    }
    if (req.method === "GET" && /^\/calls\/[^/]+$/.test(path)) {
      // Simulate an ended call so call-status derives "ended" from is_alive:false.
      return ok({ data: { call_control_id: path.split("/").pop(), is_alive: false, call_session_id: "sess_1" } });
    }

    // --- Go-CLI shell-out paths (send-sms, sms-status, number search/order) ---
    // These are hit by the bundled telnyx Go CLI when pointed at the mock via
    // the --base-url shim, so the FULL e2e exercises the shell-out path too.
    if (req.method === "POST" && path === "/messages") {
      const id = nextId("msg");
      // Model the real API: a message with send_at comes back with recipient
      // status "scheduled" (and send_at may echo null) — this is what lets
      // schedule-sms be tested end-to-end. Immediate sends are "queued".
      const scheduled = !!body?.send_at;
      const row = { id, record_type: "message", type: body?.media_url ? "MMS" : "SMS",
        from: { phone_number: body?.from },
        to: [{ phone_number: body?.to, status: scheduled ? "scheduled" : "queued" }],
        send_at: scheduled ? null : undefined,
        text: body?.text };
      state.messages ??= []; state.messages.push(row);
      return ok({ data: row });
    }
    if (req.method === "GET" && /^\/messages\/msg_[^/]+$/.test(path)) {
      const id = path.split("/").pop();
      const row = (state.messages ?? []).find((m) => m.id === id);
      return row ? ok({ data: { ...row, to: [{ phone_number: row.to?.[0]?.phone_number, status: "delivered" }] } })
                 : ok({ errors: [{ code: "40303", detail: "Message not found" }] }, 404);
    }
    if (req.method === "GET" && path === "/available_phone_numbers") {
      return ok({ data: [
        { phone_number: "+13125557001", record_type: "available_phone_number", features: [{ name: "sms" }, { name: "mms" }, { name: "voice" }] },
        { phone_number: "+13125557002", record_type: "available_phone_number", features: [{ name: "sms" }, { name: "voice" }] },
      ], meta: { total_results: 2 } });
    }
    if (req.method === "POST" && path === "/number_orders") {
      const id = nextId("ord");
      const pn = body?.phone_numbers?.[0]?.phone_number ?? body?.phone_number?.[0]?.["phone-number"] ?? "+13125557001";
      const nid = nextId("pn");
      state.phoneNumbers.push({ id: nid, phone_number: pn,
        messaging_profile_id: body?.messaging_profile_id, connection_id: body?.connection_id });
      return ok({ data: { id, status: "success", phone_numbers: [{ phone_number: pn, id: nid }] } });
    }
    // GET /phone_numbers/{id-or-e164} — Go CLI resolvePhoneNumberId lookup.
    if (req.method === "GET" && /^\/phone_numbers\/.+$/.test(path)) {
      const key = decodeURIComponent(path.replace("/phone_numbers/", ""));
      const row = state.phoneNumbers.find((n) => n.phone_number === key || n.id === key)
        ?? { id: nextId("pn"), phone_number: key };
      return ok({ data: row });
    }

    // --- Group MMS (AIF-335) ---
    if (req.method === "POST" && path === "/messages/group_mms") {
      const recipients = (body?.to ?? []).map((p) => ({ phone_number: p, status: "queued" }));
      return ok({ data: { id: "grp_e2e_1", record_type: "message", type: "MMS", from: { phone_number: body?.from }, to: recipients } });
    }
    // A group id must 404 on GET /messages/{id} (the whole point of AIF-335).
    if (req.method === "GET" && path === "/messages/grp_e2e_1") {
      return ok({ errors: [{ code: "40303", detail: "Message not found" }] }, 404);
    }

    // --- WhatsApp (AIF-326) ---
    if (req.method === "GET" && path === "/whatsapp/business_accounts") {
      return ok({ data: [{ id: "waba_e2e", name: "E2E WABA" }] });
    }
    if (req.method === "GET" && /^\/whatsapp\/business_accounts\/[^/]+\/phone_numbers$/.test(path)) {
      return ok({ data: [{ phone_number: "+13125551000", status: "connected", enabled: true }] });
    }
    if (req.method === "GET" && path === "/whatsapp/message_templates") {
      return ok({ data: [{ id: "tpl_e2e", name: "order_ready", language: "en_US", category: "UTILITY", status: "APPROVED" }] });
    }
    if (req.method === "POST" && path === "/whatsapp/message_templates") {
      return ok({ data: { id: "tpl_new_e2e", name: body?.name, status: "PENDING" } });
    }
    if (req.method === "GET" && /^\/whatsapp\/phone_numbers\/[^/]+\/profile$/.test(path)) {
      return ok({ data: { display_name: "E2E", about: "hi" } });
    }

    // --- setup-sms / setup-voice idempotency (AIF-336) ---
    if (req.method === "GET" && path === "/messaging_profiles") {
      return ok({ data: state.messagingProfiles });
    }
    if (req.method === "POST" && path === "/messaging_profiles") {
      const id = nextId("mp");
      const row = { id, name: body?.name };
      state.messagingProfiles.push(row);
      return ok({ data: row });
    }
    if (req.method === "GET" && path === "/call_control_applications") {
      return ok({ data: state.callControlApps });
    }
    if (req.method === "POST" && path === "/call_control_applications") {
      const id = nextId("cca");
      const row = { id, application_name: body?.application_name };
      state.callControlApps.push(row);
      return ok({ data: row });
    }
    if (req.method === "GET" && path === "/outbound_voice_profiles") {
      return ok({ data: [{ id: "ovp_e2e", name: "default" }] });
    }

    // --- Verify (AIF-330): setup-verify step 1 creates a profile w/ SMS channel ---
    if (req.method === "POST" && path === "/verify_profiles") {
      return ok({ data: { id: "vp_e2e_1", name: body?.name ?? "Agent Verify Profile", ...body } });
    }

    // --- TTS (AIF-331): returns base64 audio, NOT a url/file. WAV, not MP3. ---
    if (req.method === "POST" && path === "/text-to-speech/speech") {
      // "RIFF....WAVE" header base64 so the shape matches reality (wav bytes).
      return ok({ data: { audio: Buffer.from("RIFF\u0000\u0000\u0000\u0000WAVEfmt ").toString("base64"), content_type: "audio/wav" } });
    }

    // --- STT: transcription needs a PUBLIC audio url (can't take a local file) ---
    if (req.method === "POST" && path === "/ai/audio/transcriptions") {
      return ok({ data: { text: "hello world", model: body?.model ?? "distil-whisper/distil-large-v2" } });
    }
    if (req.method === "GET" && path === "/speech-to-text/providers") {
      return ok({ data: [{ provider: "telnyx" }, { provider: "deepgram" }, { provider: "openai" }] });
    }
    if (req.method === "GET" && path === "/phone_numbers") {
      // Honour filter[messaging_profile_id] / filter[connection_id].
      const mp = url.searchParams.get("filter[messaging_profile_id]");
      const cc = url.searchParams.get("filter[connection_id]");
      let rows = state.phoneNumbers;
      if (mp) rows = rows.filter((n) => n.messaging_profile_id === mp);
      if (cc) rows = rows.filter((n) => n.connection_id === cc);
      return ok({ data: rows });
    }
    // Messaging-profile assignment lives on the /messaging subresource, NOT the
    // generic phone-number update. setup-sms step 4 PATCHes this path, so the
    // mock must honour it (otherwise the assign 404s and the harness reports a
    // false success from the error-path result still carrying phone_number).
    const msgAssign = path.match(/^\/phone_numbers\/([^/]+)\/messaging$/);
    if (req.method === "PATCH" && msgAssign) {
      const id = msgAssign[1];
      let row = state.phoneNumbers.find((n) => n.id === id);
      if (!row) { row = { id, phone_number: "+13125552000" }; state.phoneNumbers.push(row); }
      if (body?.messaging_profile_id) row.messaging_profile_id = body.messaging_profile_id;
      return ok({ data: row });
    }
    if (req.method === "PATCH" && /^\/phone_numbers\/[^/]+$/.test(path)) {
      const id = path.split("/").pop();
      let row = state.phoneNumbers.find((n) => n.id === id);
      if (!row) { row = { id, phone_number: "+13125552000" }; state.phoneNumbers.push(row); }
      Object.assign(row, body);
      return ok({ data: row });
    }

    return notFound();
    } catch (err) {
      // Never let a handler exception kill the server mid-suite.
      if (!res.headersSent) {
        // Log the detail server-side for debugging, but don't echo the raw
        // error/stack back in the HTTP response (CodeQL: stack-trace exposure).
        console.error("[mock] handler error:", err?.stack || err?.message || err);
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ errors: [{ code: "90000", detail: "internal mock error" }] }));
      }
    }
  });
});

// Last-resort guards so a stray error/rejection can't take the mock down
// (a dead mock silently breaks every downstream command in the walkthrough).
process.on("uncaughtException", (err) => { console.error("[mock] uncaughtException:", err?.message || err); });
process.on("unhandledRejection", (err) => { console.error("[mock] unhandledRejection:", err?.message || err); });

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address();
  console.log(`PORT=${port}`);
});
