#!/bin/bash
# 10DLC Registration Script
# Wraps 'telnyx 10dlc wizard' with checks and guidance
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}📱 10DLC Registration${NC}"
echo "======================================"

# Check prerequisites
if ! command -v telnyx &>/dev/null; then
    echo -e "${RED}Error: Telnyx CLI not installed${NC}"
    echo "Install with: npm install -g @telnyx/api-cli"
    exit 1
fi

# Check auth
if ! telnyx auth status &>/dev/null; then
    echo -e "${YELLOW}Telnyx CLI not configured. Running setup...${NC}"
    telnyx auth setup
fi

echo ""
echo "This wizard will help you register for 10DLC (A2P SMS in the USA)."
echo ""
echo -e "${YELLOW}You'll need:${NC}"
echo "  • Business name (or personal name for sole proprietor)"
echo "  • Contact phone number"
echo "  • Contact email"
echo "  • Description of your SMS use case"
echo "  • 2 sample messages"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Check for existing registrations
echo ""
echo -e "${GREEN}Checking existing registrations...${NC}"
BRANDS=$(telnyx 10dlc brand list --format json 2>/dev/null || echo "[]")
if [ "$BRANDS" != "[]" ] && [ -n "$BRANDS" ]; then
    echo -e "${YELLOW}You have existing brands:${NC}"
    telnyx 10dlc brand list
    echo ""
    read -p "Continue with new registration? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Use 'telnyx 10dlc campaign create' to add a campaign to an existing brand."
        exit 0
    fi
fi

# Run the wizard
echo ""
echo -e "${GREEN}Starting 10DLC registration wizard...${NC}"
echo ""
telnyx 10dlc wizard

echo ""
echo -e "${GREEN}✅ Registration submitted!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check status:  ./status.sh"
echo "  2. Assign number: ./assign.sh +15551234567 <campaign-id>"
echo ""
echo "Note: Approval typically takes 1-3 business days."
