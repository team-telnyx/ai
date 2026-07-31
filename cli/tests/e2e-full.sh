#!/usr/bin/env bash
# FULL end-to-end walkthrough: drives the REAL packaged bin (bin/telnyx-agent.mjs)
# against a local mock Telnyx API, exercising BOTH:
#   - REST commands (call-dial, call-status, send-group-mms, whatsapp-templates)
#   - Go-CLI shell-out commands (send-sms, sms-status, list/search numbers,
#     and the number-buy step inside setup-sms) via a --base-url shim so the
#     bundled telnyx Go CLI also hits the mock. ZERO real spend.
#
# Covers AIF-325..336 end to end. This is the "full" version of
# e2e-walkthrough.sh — it adds the shell-out path the blind agent couldn't reach.
set -u
CLI_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$CLI_DIR/bin/telnyx-agent.mjs"
SHIM="$CLI_DIR/tests/telnyx-shim.mjs"
LOG="$(mktemp -t e2e-full-XXXX).jsonl"; : > "$LOG"

PASS=0; FAIL=0
ok(){ echo "  ✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }

if [ ! -x "$CLI_DIR/vendor/telnyx" ]; then
  echo "FATAL: vendor/telnyx (Go CLI v0.21.0) missing — run: npm install (postinstall fetches it)"; exit 1
fi

start_mock(){ # $1 = seed json (optional). Truncates the shared request log so
  # each phase asserts only against requests it actually made.
  pkill -f e2e-mock-server 2>/dev/null; sleep 0.2
  : > "$LOG"
  MOCK_OUT="$(mktemp)"
  E2E_SEED="${1:-}" node "$CLI_DIR/tests/e2e-mock-server.mjs" "$LOG" >"$MOCK_OUT" 2>&1 &
  MOCK_PID=$!
  for i in $(seq 1 50); do grep -q "PORT=" "$MOCK_OUT" && break; sleep 0.1; done
  PORT="$(grep -oE 'PORT=[0-9]+' "$MOCK_OUT" | cut -d= -f2)"
  [ -z "$PORT" ] && { echo "mock failed:"; cat "$MOCK_OUT"; exit 1; }
  export TELNYX_API_KEY="KEY_test"
  export TELNYX_API_BASE_URL="http://127.0.0.1:${PORT}/v2"   # native fetch() REST path
  export TELNYX_E2E_BASE_URL="http://127.0.0.1:${PORT}/v2"   # consumed by the shim
  export TELNYX_CLI_PATH="$SHIM"                             # Go CLI shell-out -> shim -> mock
}
cleanup(){ pkill -f e2e-mock-server 2>/dev/null; }
trap cleanup EXIT
run(){ node "$BIN" "$@" 2>&1; }

start_mock
echo "Mock on $TELNYX_API_BASE_URL ; Go-CLI via shim=$SHIM"
echo "bin=$BIN ; vendor telnyx=$($CLI_DIR/vendor/telnyx --version 2>&1)"
echo

# ================= REST commands =================
echo "AIF-327 call-dial +E.164 (intl):"
OUT="$(run call-dial --connection-id conn_1 --from +13125550000 --to +94771280314 --json)"
echo "$OUT" | grep -q 'cc_e2e_1' && ok "returned call-control-id" || bad "call-dial failed: $OUT"
grep -q '"to":"+94771280314"' "$LOG" && ok "+E.164 reached POST /calls verbatim" || bad "to not verbatim"

echo "AIF-334 call-status:"
OUT="$(run call-status --call-control-id cc_e2e_1 --json)"
echo "$OUT" | grep -qiE '"(call_status|status)": *"ended"' && ok "derived ended" || bad "not ended: $OUT"

echo "AIF-335 send-group-mms:"
OUT="$(run send-group-mms --from +13125550000 --to "+13125550001,+13125550002" --text hi --json)"
echo "$OUT" | grep -q '"id_queryable": *false' && ok "flags id non-queryable" || bad "missing id_queryable=false"
grep -q '"path":"/messages/group_mms"' "$LOG" && ok "POST /messages/group_mms" || bad "wrong endpoint"

echo "AIF-326 whatsapp-templates:"
OUT="$(run whatsapp-templates --waba-id waba_e2e --json)"
echo "$OUT" | grep -q 'order_ready' && ok "listed templates" || bad "templates failed: $OUT"
if grep -qE '"path":"/v2/whatsapp' "$LOG"; then bad "doubled /v2 leaked"; else ok "no doubled /v2 path"; fi

# ================= Go-CLI shell-out commands (the part the blind agent couldn't reach) =================
echo "send-sms (Go CLI shell-out):"
OUT="$(run send-sms --from +13125550000 --to +13125550009 --text "hello e2e" --json)"
if echo "$OUT" | grep -qiE 'not found|error'; then bad "send-sms failed: $(echo "$OUT" | head -1)"; else ok "send-sms succeeded via Go CLI -> mock"; fi
MSGID="$(echo "$OUT" | grep -oE 'msg_[0-9]+' | head -1)"
grep -q '"path":"/messages"' "$LOG" && ok "hit POST /messages" || bad "did not POST /messages"

echo "sms-status (Go CLI shell-out):"
if [ -n "$MSGID" ]; then
  OUT="$(run sms-status --id "$MSGID" --json)"
  if echo "$OUT" | grep -qiE 'not found'; then bad "sms-status command-not-found: $OUT"; else ok "sms-status resolved $MSGID"; fi
else bad "no message id captured from send-sms"; fi

echo "list-phone-numbers (Go CLI shell-out):"
OUT="$(run list-phone-numbers --json 2>&1)"
if echo "$OUT" | grep -qiE 'command .*not found'; then bad "list-phone-numbers command-not-found"; else ok "list-phone-numbers ran (no command-not-found)"; fi

echo "search-phone-numbers (Go CLI shell-out):"
OUT="$(run search-phone-numbers --country US --json 2>&1)"
echo "$OUT" | grep -q '+13125557001' && ok "found available numbers via Go CLI -> mock" || { if echo "$OUT" | grep -qiE 'command .*not found'; then bad "search command-not-found"; else bad "search-phone-numbers no results: $(echo "$OUT"|head -1)"; fi; }

# ================= setup-sms FULL happy path (REST profile + Go-CLI buy + REST assign) =================
echo "setup-sms full provision (fresh):"
OUT="$(run setup-sms --json 2>&1)"
if echo "$OUT" | grep -qiE 'command .*not found'; then bad "setup-sms number-buy crashed (command-not-found)"; \
  elif echo "$OUT" | grep -qE '"phone_number": *"\+1'; then ok "setup-sms provisioned end-to-end (profile+number+assign)"; \
  else bad "setup-sms did not complete: $(echo "$OUT" | tail -2 | head -1)"; fi

# ================= setup-sms idempotency (AIF-336, seeded reuse) =================
echo "AIF-336 setup-sms reuse (seeded):"
start_mock '{"messagingProfiles":[{"id":"mp_seed","name":"Agent SMS Profile - 2026-07-24 02:29:55"}],"phoneNumbers":[{"id":"pn_seed","phone_number":"+13125557777","messaging_profile_id":"mp_seed"}]}'
OUT="$(run setup-sms --json 2>&1)"
echo "$OUT" | grep -q '"reused": *true' && ok "reused existing profile+number" || bad "did not reuse: $(echo "$OUT"|tail -1)"
if grep -qE '"method":"POST","path":"/number_orders"' "$LOG"; then bad "bought a NEW number despite reuse"; else ok "did not buy a new number"; fi

echo "AIF-325 help never provisions:"
: > "$LOG"
run setup-sms --help >/dev/null 2>&1
if grep -qE '"method":"POST"' "$LOG"; then bad "help triggered a POST (provisioned!)"; else ok "setup-sms --help made no POSTs"; fi

# ================= Previously-unreachable products: verify / tts / stt / schedule =================
# These were only covered by unit tests before; the full mock now has routes so
# they get real end-to-end coverage here too.
start_mock
echo "AIF-332 schedule-sms (REST, scheduled state):"
OUT="$(run schedule-sms --from +13125550000 --to +13125550009 --text later --send-at 2026-08-01T10:00:00Z --json 2>&1)"
echo "$OUT" | grep -q '"scheduled": *true' && ok "schedule-sms reports scheduled=true" || bad "schedule-sms not scheduled: $(echo "$OUT"|tail -1)"
grep -q '"send_at":"2026-08-01T10:00:00Z"' "$LOG" && ok "send_at reached POST /messages" || bad "send_at not sent"

echo "AIF-330 setup-verify (profile only, no number bought):"
: > "$LOG"
OUT="$(run setup-verify --json 2>&1)"
echo "$OUT" | grep -q '"profile_id": *"vp_e2e_1"' && ok "verify profile created" || bad "verify profile not created: $(echo "$OUT"|head -3|tail -1)"
echo "$OUT" | grep -q '"ready": *true' && ok "setup-verify ready=true" || bad "setup-verify not ready: $(echo "$OUT"|tail -2|head -1)"
grep -q '"path":"/verify_profiles"' "$LOG" && ok "POST /verify_profiles" || bad "did not POST /verify_profiles"
# Decision #1: Verify uses Telnyx's managed sender pool — setup-verify must NOT buy a number.
if grep -qE '"path":"/(number_orders|available_phone_numbers)"' "$LOG"; then bad "setup-verify bought/searched a number (should not)"; else ok "setup-verify did NOT buy a number (managed pool)"; fi
echo "$OUT" | grep -q '"phone_number"' && bad "setup-verify still returns a phone_number" || ok "no phone_number in output (correct)"

echo "AIF-331 tts (base64 audio, not a url):"
OUT="$(run tts --text "hello e2e" --provider telnyx --voice Telnyx.Bayan.Amanda --json 2>&1)"
echo "$OUT" | grep -q '"audio_data"' && ok "tts returned audio_data (base64)" || bad "tts no audio_data: $(echo "$OUT"|head -1)"
if echo "$OUT" | grep -qiE '"(audio_)?url"'; then bad "tts leaked a url field (it returns base64, not a url)"; else ok "tts did not return a url (matches reality)"; fi
grep -q '"path":"/text-to-speech/speech"' "$LOG" && ok "POST /text-to-speech/speech" || bad "wrong tts endpoint"

echo "stt (needs public audio-url):"
OUT="$(run stt --audio-url https://example.com/a.wav --json 2>&1)"
echo "$OUT" | grep -qiE 'transcription|"text"' && ok "stt transcribed via public url" || bad "stt failed: $(echo "$OUT"|head -1)"
grep -q '"path":"/ai/audio/transcriptions"' "$LOG" && ok "POST /ai/audio/transcriptions" || bad "wrong stt endpoint"

echo
echo "=================================="
echo "FULL E2E: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
