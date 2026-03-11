#!/bin/bash
# Setup script for 10dlc-registration skill
# Installs prerequisites and configures the skill

set -e

echo "🔧 10DLC Registration - Setup"
echo "============================="

# Function to install Telnyx CLI
install_telnyx_cli() {
    echo "📦 Installing Telnyx CLI..."
    if command -v npm &> /dev/null; then
        npm install -g @telnyx/api-cli
    else
        echo "❌ npm not found. Install Node.js first:"
        echo "   macOS: brew install node"
        echo "   Ubuntu: sudo apt install nodejs npm"
        return 1
    fi
}

# Check Telnyx CLI
echo "1. Checking Telnyx CLI..."
if ! command -v telnyx &> /dev/null; then
    echo "   Telnyx CLI not found."
    read -p "   Install Telnyx CLI? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        install_telnyx_cli
    else
        echo "   ⚠️  Telnyx CLI required for this skill"
        exit 1
    fi
else
    echo "   ✅ Telnyx CLI found"
fi

# Check Telnyx auth
echo ""
echo "2. Checking Telnyx authentication..."
if ! telnyx auth status &> /dev/null; then
    echo "   Telnyx CLI not authenticated."
    read -p "   Run 'telnyx auth setup' now? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        echo ""
        echo "   Get your API key from: https://portal.telnyx.com/#/app/api-keys"
        echo ""
        telnyx auth setup
    else
        echo "   ⚠️  Run 'telnyx auth setup' before using this skill"
    fi
else
    echo "   ✅ Telnyx CLI authenticated"
fi

# Check 10DLC access
echo ""
echo "3. Checking 10DLC API access..."
if telnyx 10dlc brand list &> /dev/null; then
    echo "   ✅ 10DLC API accessible"
    
    # Show current brands if any
    BRANDS=$(telnyx 10dlc brand list --json 2>/dev/null | grep -c '"id"' || echo "0")
    if [[ "$BRANDS" -gt 0 ]]; then
        echo "   📋 You have $BRANDS brand(s) registered"
    else
        echo "   📭 No brands registered yet"
    fi
else
    echo "   ❌ 10DLC API not accessible. Check authentication."
fi

# Check for US phone numbers
echo ""
echo "4. Checking for US phone numbers..."
US_NUMBERS=$(telnyx number list --json 2>/dev/null | grep -E '"\+1[0-9]{10}"' | head -5 || echo "")
if [[ -n "$US_NUMBERS" ]]; then
    echo "   ✅ US phone numbers found"
else
    echo "   ⚠️  No US phone numbers found"
    echo "   You'll need at least one US number for 10DLC registration"
    echo "   Search: telnyx number search --country US"
fi

# Make scripts executable
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$SCRIPT_DIR/scripts/"*.sh 2>/dev/null || true

echo ""
echo "============================="
echo "✅ Setup complete!"
echo ""
echo "Usage:"
echo "  $SCRIPT_DIR/scripts/register.sh  # Start 10DLC wizard"
echo "  $SCRIPT_DIR/scripts/status.sh    # Check brand/campaign status"
echo "  $SCRIPT_DIR/scripts/assign.sh    # Assign number to campaign"
