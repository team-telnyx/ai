#!/bin/bash
# Test script for 10dlc-registration skill
# Verifies CLI, auth, and basic operations

set -e

echo "🧪 10DLC Registration - Tests"
echo "============================="

PASS=0
FAIL=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo "  ✅ $2"
        PASS=$((PASS + 1))
    else
        echo "  ❌ $2"
        FAIL=$((FAIL + 1))
    fi
}

# Test 1: CLI installed
echo ""
echo "1. Checking Telnyx CLI..."
command -v telnyx &> /dev/null
test_result $? "Telnyx CLI installed"

# Test 2: CLI authenticated
echo ""
echo "2. Checking authentication..."
telnyx auth status &> /dev/null
test_result $? "Telnyx CLI authenticated"

# Test 3: 10DLC commands available
echo ""
echo "3. Checking 10DLC support..."
telnyx 10dlc --help &> /dev/null
test_result $? "10DLC commands available"

# Test 4: Can list brands (API access)
echo ""
echo "4. Checking 10DLC API access..."
telnyx 10dlc brand list &> /dev/null
test_result $? "10DLC API accessible"

# Test 5: Scripts exist and are executable
echo ""
echo "5. Checking scripts..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
[ -x "$SCRIPT_DIR/scripts/register.sh" ]
test_result $? "register.sh executable"
[ -x "$SCRIPT_DIR/scripts/status.sh" ]
test_result $? "status.sh executable"
[ -x "$SCRIPT_DIR/scripts/assign.sh" ]
test_result $? "assign.sh executable"

# Summary
echo ""
echo "============================="
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
    exit 1
fi
