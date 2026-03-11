#!/bin/bash
# Assign a phone number to a 10DLC campaign
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
    echo "Usage: $0 <phone-number> <campaign-id>"
    echo ""
    echo "Examples:"
    echo "  $0 +15551234567 abc123-def456"
    echo "  $0 +15551234567 --list    # List available campaigns"
    exit 1
}

if [ $# -lt 1 ]; then
    usage
fi

PHONE="${1:-}"
CAMPAIGN="${2:-}"

if ! command -v telnyx &>/dev/null; then
    echo -e "${RED}Error: Telnyx CLI not installed${NC}"
    exit 1
fi

# List campaigns if requested
if [ "$PHONE" = "--list" ] || [ "$CAMPAIGN" = "--list" ]; then
    echo -e "${GREEN}Available campaigns:${NC}"
    telnyx 10dlc campaign list
    exit 0
fi

if [ -z "$CAMPAIGN" ]; then
    echo -e "${RED}Error: Campaign ID required${NC}"
    echo ""
    echo "Available campaigns:"
    telnyx 10dlc campaign list 2>/dev/null || echo "  (none found)"
    echo ""
    usage
fi

# Validate phone format
if [[ ! "$PHONE" =~ ^\+1[0-9]{10}$ ]]; then
    echo -e "${YELLOW}Warning: Phone number should be in E.164 format (+15551234567)${NC}"
fi

echo -e "${GREEN}📱 Assigning Number to Campaign${NC}"
echo "======================================"
echo "Phone:    $PHONE"
echo "Campaign: $CAMPAIGN"
echo ""

# Check current status
echo "Current assignment status:"
telnyx 10dlc assignment status "$PHONE" 2>/dev/null || echo "  (not assigned)"
echo ""

read -p "Proceed with assignment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Assign
if telnyx 10dlc assign "$PHONE" "$CAMPAIGN"; then
    echo ""
    echo -e "${GREEN}✅ Assignment submitted!${NC}"
    echo ""
    echo "Check status with: telnyx 10dlc assignment status $PHONE"
else
    echo ""
    echo -e "${RED}❌ Assignment failed${NC}"
    exit 1
fi
