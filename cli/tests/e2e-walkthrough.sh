#!/usr/bin/env bash
# End-to-end walkthrough of the fixed agent-cli commands, driving the REAL
# packaged bin (bin/telnyx-agent.mjs) against a local mock Telnyx API — the way
# a zero-knowledge developer / blind agent would run it after `npm i -g`.
#
# Exercises AIF-326 (whatsapp), 327 (call-dial +E.164), 334 (call-status),
# 335 (group-mms unverifiable id), 336 (setup-* idempotency).
set -u
CLI_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN="$CLI_DIR/bin/telnyx-agent.mjs"
LOG="$(mktemp -t e2e-mock-XXXX).jsonl"
: > "$LOG"

PASS=0; FAIL=0
ok(){ echo "  ✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }

# Start the mock and capture its port.
MOCK_OUT="$(mktemp)"
node "$CLI_DIR/tests/e2e-mock-server.mjs" "$LOG" >"$MOCK_OUT" 2>&1 &
MOCK_PID=$!
for i in $(seq 1 50); do grep -q "PORT=" "$MOCK_OUT" && break; sleep 0.1; done
PORT="$(grep -oE 'PORT=[0-9]+' "$MOCK_OUT" | cut -d= -f2)"
if [ -z "$PORT" ]; then echo "mock failed to start:"; cat "$MOCK_OUT"; exit 1; fi
BASE="http://127.0.0.1:${PORT}/v2"
export TELNYX_API_KEY="KEY_e2e_test"
export TELNYX_API_BASE_URL="$BASE"
cleanup(){ kill "$MOCK_PID" 2>/dev/null; }
trap cleanup EXIT
run(){ node "$BIN" "$@" 2>&1; }
echo "Mock API on $BASE ; bin=$BIN"
echo

# --- AIF-327: call-dial accepts a valid +E.164 --to ---
echo "AIF-327 call-dial +E.164:"
OUT="$(run call-dial --connection-id conn_1 --from +13125550000 --to +94771280314 --json)"
echo "$OUT" | grep -q '"call_control_id": *"cc_e2e_1"' && ok "call-dial returned a call-control-id" || { bad "call-dial failed: $OUT"; }
grep -q '"to":"+94771280314"' "$LOG" && ok "+E.164 to reached POST /calls body verbatim" || bad "to not found verbatim in request body"
echo

# --- AIF-334: call-status derives ended from is_alive:false ---
echo "AIF-334 call-status:"
OUT="$(run call-status --call-control-id cc_e2e_1 --json)"
echo "$OUT" | grep -qiE '"(call_status|status)": *"ended"' && ok "call-status derived 'ended'" || bad "call-status not ended: $OUT"
grep -q '"path":"/calls/cc_e2e_1"' "$LOG" && ok "used GET /calls/{id}" || bad "did not GET /calls/{id}"
echo

# --- AIF-335: send-group-mms honest unverifiable id ---
echo "AIF-335 send-group-mms:"
OUT="$(run send-group-mms --from +13125550000 --to "+13125550001,+13125550002" --text "hi" --json)"
echo "$OUT" | grep -q '"id_queryable": *false' && ok "flags id as non-queryable" || bad "missing id_queryable=false: $OUT"
echo "$OUT" | grep -qi 'not resolvable' && ok "warns id not resolvable" || bad "missing warning"
grep -q '"path":"/messages/group_mms"' "$LOG" && ok "used POST /messages/group_mms" || bad "wrong endpoint"
echo

# --- AIF-326: whatsapp commands hit un-doubled paths ---
echo "AIF-326 whatsapp:"
OUT="$(run whatsapp-templates --waba-id waba_e2e --json)"
echo "$OUT" | grep -q 'order_ready' && ok "whatsapp-templates listed templates" || bad "templates list failed: $OUT"
grep -q '"path":"/whatsapp/message_templates"' "$LOG" && ok "hit /whatsapp/message_templates (not /v2/v2)" || bad "wrong templates path"
if grep -qE '"path":"/v2/whatsapp' "$LOG"; then bad "a doubled /v2 path leaked"; else ok "no doubled /v2 path in any request"; fi
echo

# --- AIF-336: setup-sms reuse (seeded) ---
echo "AIF-336 setup-sms idempotency (reuse):"
kill "$MOCK_PID" 2>/dev/null; sleep 0.2
: > "$LOG"; MOCK_OUT2="$(mktemp)"
E2E_SEED='{"messagingProfiles":[{"id":"mp_seed","name":"Agent SMS Profile - 2026-07-24 02:29:55"}],"phoneNumbers":[{"id":"pn_seed","phone_number":"+13125557777","messaging_profile_id":"mp_seed"}]}' \
  node "$CLI_DIR/tests/e2e-mock-server.mjs" "$LOG" >"$MOCK_OUT2" 2>&1 &
MOCK_PID=$!
for i in $(seq 1 50); do grep -q "PORT=" "$MOCK_OUT2" && break; sleep 0.1; done
PORT="$(grep -oE 'PORT=[0-9]+' "$MOCK_OUT2" | cut -d= -f2)"
export TELNYX_API_BASE_URL="http://127.0.0.1:${PORT}/v2"
OUT="$(run setup-sms --json)"
echo "$OUT" | grep -q '"reused": *true' && ok "setup-sms reused existing profile+number" || bad "setup-sms did not reuse: $OUT"
echo "$OUT" | grep -q '"phone_number": *"+13125557777"' && ok "reused the seeded number" || bad "wrong reused number"
if grep -qE '"method":"POST","path":"/messaging_profiles"' "$LOG"; then bad "created a NEW profile despite reuse"; else ok "did not create a new profile"; fi
echo

echo "=================================="
echo "E2E walkthrough: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
