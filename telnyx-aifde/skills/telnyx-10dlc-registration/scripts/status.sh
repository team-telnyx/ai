#!/bin/bash
# 10DLC Status Check
# Shows all brands, campaigns, and number assignments
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}📱 10DLC Status${NC}"
echo "======================================"

if ! command -v telnyx &>/dev/null; then
    echo "Error: Telnyx CLI not installed"
    exit 1
fi

# Brands
echo ""
echo -e "${BLUE}Brands:${NC}"
if ! telnyx 10dlc brand list 2>/dev/null; then
    echo "  No brands found (or CLI not authenticated)"
fi

# Campaigns
echo ""
echo -e "${BLUE}Campaigns:${NC}"
if ! telnyx 10dlc campaign list 2>/dev/null; then
    echo "  No campaigns found"
fi

# Check specific brand/campaign if provided
if [ -n "${1:-}" ]; then
    echo ""
    echo -e "${BLUE}Details for: $1${NC}"
    # Try as brand first, then campaign
    if telnyx 10dlc brand get "$1" 2>/dev/null; then
        :
    elif telnyx 10dlc campaign get "$1" 2>/dev/null; then
        :
    else
        echo "  Not found as brand or campaign ID"
    fi
fi

echo ""
echo -e "${YELLOW}Tip:${NC} Check a specific number with: telnyx 10dlc assignment status +15551234567"
