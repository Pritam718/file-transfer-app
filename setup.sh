#!/bin/bash

# File Transfer App - Setup Script for Linux/Ubuntu
# This script will install all required dependencies and set up the project

echo "================================="
echo "File Transfer App - Setup Script"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get version
get_version() {
    $1 --version 2>/dev/null | head -n1
}

echo "Step 1: Checking system requirements..."
echo "----------------------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js is installed: $NODE_VERSION"
    
    # Check if version is at least v18
    MAJOR_VERSION=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}⚠${NC} Warning: Node.js 18+ is recommended (you have v$MAJOR_VERSION)"
    fi
else
    echo -e "${RED}✗${NC} Node.js is not installed"
    echo ""
    echo "Please install Node.js 18+ from:"
    echo "  - https://nodejs.org/"
    echo "  - Or use: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm is installed: v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm is not installed"
    echo "npm should come with Node.js. Please reinstall Node.js."
    exit 1
fi

# Check Git (optional but recommended)
if command_exists git; then
    GIT_VERSION=$(git --version)
    echo -e "${GREEN}✓${NC} Git is installed: $GIT_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Git is not installed (optional but recommended)"
fi

echo ""
echo "Step 2: Installing system dependencies (if needed)..."
echo "-------------------------------------------------------"

# Check if running on Ubuntu/Debian
if command_exists apt-get; then
    echo "Detected Debian/Ubuntu system"
    
    # List of required system packages for Electron
    REQUIRED_PACKAGES="libnotify4 libxtst6 libnss3 libxss1 libgbm1"
    
    # Build helper packages for native modules
    BUILD_PACKAGES="build-essential python3 python3-pip"
    
    echo "Checking required system packages..."
    MISSING_PACKAGES=""
    
    for pkg in $REQUIRED_PACKAGES; do
        if dpkg -l | grep -q "^ii  $pkg"; then
            echo -e "${GREEN}✓${NC} $pkg is installed"
        else
            echo -e "${YELLOW}⚠${NC} $pkg is missing"
            MISSING_PACKAGES="$MISSING_PACKAGES $pkg"
        fi
    done
    
    echo ""
    echo "Checking build helper packages..."
    MISSING_BUILD_PACKAGES=""
    
    for pkg in $BUILD_PACKAGES; do
        if dpkg -l | grep -q "^ii  $pkg"; then
            echo -e "${GREEN}✓${NC} $pkg is installed"
        else
            echo -e "${YELLOW}⚠${NC} $pkg is missing"
            MISSING_BUILD_PACKAGES="$MISSING_BUILD_PACKAGES $pkg"
        fi
    done
    
    # Combine all missing packages
    ALL_MISSING="$MISSING_PACKAGES $MISSING_BUILD_PACKAGES"
    
    if [ -n "$ALL_MISSING" ]; then
        echo ""
        echo "Installing missing packages..."
        echo "This may require sudo password:"
        sudo apt-get update
        sudo apt-get install -y $ALL_MISSING
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} All packages installed successfully"
        else
            echo -e "${YELLOW}⚠${NC} Some packages may have failed to install"
        fi
    else
        echo -e "${GREEN}✓${NC} All system packages are installed"
    fi
else
    echo "Non-Debian system detected. Skipping system package check."
    echo "Please ensure you have the required libraries for Electron."
    echo "Required: build-essential, python3, and Electron runtime libraries"
fi

echo ""
echo "Step 3: Installing Node.js dependencies..."
echo "-------------------------------------------"

if [ -f "package.json" ]; then
    echo "Running npm install..."
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Dependencies installed successfully"
    else
        echo -e "${RED}✗${NC} Failed to install dependencies"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} package.json not found. Are you in the project directory?"
    exit 1
fi

echo ""
echo "Step 4: Building the project..."
echo "--------------------------------"

npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Project built successfully"
else
    echo -e "${RED}✗${NC} Build failed"
    exit 1
fi

echo ""
echo "Step 5: Running tests (optional)..."
echo "------------------------------------"

read -p "Do you want to run tests? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm test
fi

echo ""
echo "================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================="
echo ""
echo "Available commands:"
echo "  npm run dev          - Start development mode"
echo "  npm run build        - Build TypeScript"
echo "  npm test             - Run tests"
echo "  npm run lint         - Lint code"
echo "  npm run dist:linux   - Build Linux installer"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
