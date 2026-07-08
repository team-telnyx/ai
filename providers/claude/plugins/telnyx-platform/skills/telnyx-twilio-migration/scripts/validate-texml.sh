#!/usr/bin/env bash
#
# validate-texml.sh — Check TwiML/TeXML XML for Telnyx compatibility
#
# Usage: bash validate-texml.sh <file.xml>
#
# Reports:
#   [ERROR]   Unsupported verbs with no TeXML equivalent
#   [WARN]    Attributes with different defaults or behavior
#   [INFO]    Telnyx-only features you could adopt
#   [OK]      Verb is fully supported
#
# Exit codes:
#   0 — All checks passed (may have warnings/info)
#   1 — Errors found (unsupported verbs)
#   2 — Usage error (missing file, not XML)

set -euo pipefail

# --- Colors (disabled if not a terminal) ---
if [ -t 1 ]; then
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED='' YELLOW='' GREEN='' BLUE='' BOLD='' NC=''
fi

# --- Usage ---
if [ $# -lt 1 ]; then
  echo "Usage: bash validate-texml.sh <file.xml>"
  echo ""
  echo "Analyzes a TwiML/TeXML XML file for Telnyx TeXML compatibility."
  exit 2
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo -e "${RED}[ERROR]${NC} File not found: $FILE"
  exit 2
fi

# Check if file looks like XML
if ! head -5 "$FILE" | grep -qi '<\(Response\|response\)'; then
  echo -e "${RED}[ERROR]${NC} File does not appear to be a TwiML/TeXML document (no <Response> tag found)"
  exit 2
fi

echo -e "${BOLD}TeXML Compatibility Report${NC}"
echo -e "File: $FILE"
echo "─────────────────────────────────────"

ERRORS=0
WARNINGS=0
INFO=0
OK=0

# --- Supported top-level verbs ---
SUPPORTED_VERBS="Say Play Gather Dial Record Hangup Pause Redirect Reject Refer Enqueue Leave Start Stop Connect"

# --- Supported nouns ---
SUPPORTED_NOUNS="Number Sip Queue Conference Stream Transcription Suppression Siprec"

# --- Unsupported TwiML verbs ---
UNSUPPORTED_VERBS="Pay"

# --- Check for unsupported verbs ---
for verb in $UNSUPPORTED_VERBS; do
  if grep -q "<${verb}" "$FILE"; then
    echo -e "${RED}[ERROR]${NC} <${verb}> — No TeXML equivalent. This verb is not supported by Telnyx."
    ERRORS=$((ERRORS + 1))
  fi
done

# --- Check for supported verbs and report ---
for verb in $SUPPORTED_VERBS; do
  if grep -q "<${verb}" "$FILE"; then
    echo -e "${GREEN}[OK]${NC}    <${verb}> — Supported"
    OK=$((OK + 1))
  fi
done

for noun in $SUPPORTED_NOUNS; do
  if grep -q "<${noun}" "$FILE"; then
    echo -e "${GREEN}[OK]${NC}    <${noun}> — Supported"
    OK=$((OK + 1))
  fi
done

# --- Check for behavioral differences ---

# Recording channel default
if grep -q '<Record' "$FILE"; then
  if ! grep -q 'channels=' "$FILE" 2>/dev/null; then
    echo -e "${YELLOW}[WARN]${NC}  <Record> — No 'channels' attribute set. Telnyx defaults to dual-channel (Twilio defaults to single). Add channels=\"single\" to match Twilio behavior."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

if grep -q '<Dial' "$FILE" && grep -q 'record=' "$FILE"; then
  if ! grep -q 'recordingChannels=' "$FILE" 2>/dev/null; then
    echo -e "${YELLOW}[WARN]${NC}  <Dial record=...> — No 'recordingChannels' attribute. Telnyx defaults to dual-channel. Add recordingChannels=\"single\" to match Twilio."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Polly voice compatibility — warn about non-Neural variants
if grep -qE 'voice="Polly\.' "$FILE"; then
  non_neural=$(grep -oE 'voice="Polly\.[^"]*"' "$FILE" | grep -v '\-Neural' || true)
  if [ -n "$non_neural" ]; then
    echo -e "${YELLOW}[WARN]${NC}  Non-Neural Polly voice(s) found: $non_neural — may fall back to default voice. Prefer Neural variants (e.g., Polly.Amy-Neural) or use voice=\"woman\" with language attribute."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# HMAC signature references in code-like content
if grep -qi 'X-Twilio-Signature\|RequestValidator\|validateRequest' "$FILE"; then
  echo -e "${YELLOW}[WARN]${NC}  File references Twilio webhook signature validation. Telnyx uses Ed25519 (telnyx-signature-ed25519 header)."
  WARNINGS=$((WARNINGS + 1))
fi

# Twilio-specific URL patterns
if grep -q 'api\.twilio\.com' "$FILE"; then
  echo -e "${YELLOW}[WARN]${NC}  File contains api.twilio.com URLs. Replace with api.telnyx.com/v2/texml endpoints."
  WARNINGS=$((WARNINGS + 1))
fi

# Check for Basic Auth patterns
if grep -qi 'AccountSid\|AC[a-f0-9]\{32\}' "$FILE"; then
  echo -e "${YELLOW}[WARN]${NC}  File references Twilio Account SID. Telnyx uses Bearer token authentication."
  WARNINGS=$((WARNINGS + 1))
fi

# --- Telnyx-only features they could adopt ---
echo ""
echo -e "${BOLD}Telnyx-Only Features Available${NC}"
echo "─────────────────────────────────────"

if grep -q '<Gather' "$FILE"; then
  if ! grep -q 'transcriptionEngine=' "$FILE" 2>/dev/null; then
    echo -e "${BLUE}[INFO]${NC}  <Gather> supports multiple STT engines: Google, Telnyx, Deepgram, Azure. Add transcriptionEngine=\"Deepgram\" for enhanced speech recognition."
    INFO=$((INFO + 1))
  fi
fi

if grep -q '<Say' "$FILE"; then
  echo -e "${BLUE}[INFO]${NC}  <Say> supports ElevenLabs voices: voice=\"ElevenLabs.{ModelId}.{VoiceId}\" for high-quality synthesis."
  INFO=$((INFO + 1))
fi

if grep -q '<Dial' "$FILE"; then
  if ! grep -q '<Transcription' "$FILE" 2>/dev/null; then
    echo -e "${BLUE}[INFO]${NC}  Add real-time transcription with <Start><Transcription .../></Start> before <Dial>. No TwiML equivalent."
    INFO=$((INFO + 1))
  fi
  if ! grep -q 'ringTone=' "$FILE" 2>/dev/null; then
    echo -e "${BLUE}[INFO]${NC}  <Dial> supports country-specific ringback tones via ringTone attribute (37+ countries)."
    INFO=$((INFO + 1))
  fi
fi

if grep -q '<Start' "$FILE" || grep -q '<Stream' "$FILE"; then
  if ! grep -q 'bidirectionalMode=' "$FILE" 2>/dev/null; then
    echo -e "${BLUE}[INFO]${NC}  <Stream> supports bidirectional audio via bidirectionalMode and bidirectionalCodec attributes."
    INFO=$((INFO + 1))
  fi
fi

if grep -q '<Connect' "$FILE"; then
  echo -e "${BLUE}[INFO]${NC}  <Connect> is Telnyx-only — synchronous streaming that blocks until the service ends."
  INFO=$((INFO + 1))
fi

# --- Summary ---
echo ""
echo "─────────────────────────────────────"
echo -e "${BOLD}Summary${NC}"
echo -e "  ${GREEN}OK${NC}:       $OK supported elements"
echo -e "  ${RED}Errors${NC}:   $ERRORS unsupported verbs"
echo -e "  ${YELLOW}Warnings${NC}: $WARNINGS behavioral differences"
echo -e "  ${BLUE}Info${NC}:     $INFO Telnyx-only features available"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Migration blocked:${NC} $ERRORS unsupported verb(s) found. These must be removed or replaced before migrating."
  exit 1
else
  echo ""
  echo -e "${GREEN}${BOLD}Migration compatible.${NC} Address warnings before going to production."
  exit 0
fi
