#!/bin/bash
# build-all.sh - Build installers for all platforms

set -e

echo "🚀 File Transfer App - Build All Platforms"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
npm run clean
rm -rf release
echo ""

# Build TypeScript
echo -e "${YELLOW}🔨 Compiling TypeScript...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo ""

# Check for icons
if [ ! -d "build" ] || [ ! -f "build/icon.ico" ]; then
    echo -e "${YELLOW}⚠️  Warning: Icons not found in build/ directory${NC}"
    echo "   Creating build directory..."
    mkdir -p build
    mkdir -p build/icons
    
    # Copy default icon if exists
    if [ -f "src/public/assets/icon.png" ]; then
        cp src/public/assets/icon.png build/icon.png
        echo -e "${GREEN}✓ Copied icon.png to build/${NC}"
    fi
fi
echo ""

# Build for all platforms
echo -e "${GREEN}🏗️  Building installers for all platforms...${NC}"
echo ""

npm run dist:all

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
    echo "📦 Generated installers:"
    ls -lh release/ | grep -E '\.(exe|dmg|AppImage|deb|rpm|snap)$'
    echo ""
    echo "📁 Release directory: ./release/"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
