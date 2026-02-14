#!/bin/bash
# build-linux.sh - Build Linux installers

set -e

echo "🐧 File Transfer App - Linux Build"
echo "==================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Clean and build
echo -e "${YELLOW}🧹 Cleaning...${NC}"
npm run clean
rm -rf release

echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Create icons directory
mkdir -p build/icons

# Copy icon if exists
if [ -f "src/public/assets/icon.png" ]; then
    # Create different sizes for Linux
    if command -v convert &> /dev/null; then
        echo -e "${YELLOW}🖼️  Creating Linux icons...${NC}"
        convert src/public/assets/icon.png -resize 16x16 build/icons/16x16.png
        convert src/public/assets/icon.png -resize 32x32 build/icons/32x32.png
        convert src/public/assets/icon.png -resize 48x48 build/icons/48x48.png
        convert src/public/assets/icon.png -resize 64x64 build/icons/64x64.png
        convert src/public/assets/icon.png -resize 128x128 build/icons/128x128.png
        convert src/public/assets/icon.png -resize 256x256 build/icons/256x256.png
        convert src/public/assets/icon.png -resize 512x512 build/icons/512x512.png
        echo -e "${GREEN}✓ Icons created${NC}"
    else
        echo -e "${YELLOW}⚠️  ImageMagick not found. Install with: sudo apt install imagemagick${NC}"
        cp src/public/assets/icon.png build/icon.png
    fi
fi

echo ""
echo -e "${GREEN}🏗️  Building Linux packages...${NC}"
npm run dist:linux

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Linux build successful!${NC}"
    echo ""
    echo "📦 Generated packages:"
    ls -lh release/*.{AppImage,deb,rpm,snap} 2>/dev/null || echo "No packages found"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
