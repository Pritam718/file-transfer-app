@echo off
REM File Transfer App - Setup Script for Windows
REM This script will install all required dependencies and set up the project

echo =================================
echo File Transfer App - Setup Script
echo =================================
echo.

echo Step 1: Checking system requirements...
echo ----------------------------------------

REM Check Node.js
where node >nul 2>nul
if %errorlevel% == 0 (
    echo [✓] Node.js is installed
    node --version
) else (
    echo [✗] Node.js is not installed
    echo.
    echo Please install Node.js 18+ from:
    echo   https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% == 0 (
    echo [✓] npm is installed
    npm --version
) else (
    echo [✗] npm is not installed
    echo npm should come with Node.js. Please reinstall Node.js.
    pause
    exit /b 1
)

REM Check Git (optional)
where git >nul 2>nul
if %errorlevel% == 0 (
    echo [✓] Git is installed
    git --version
) else (
    echo [⚠] Git is not installed (optional but recommended)
)

echo.
echo Step 2: Checking build tools...
echo ----------------------------------

REM Check if Python is installed (needed for node-gyp)
where python >nul 2>nul
if %errorlevel% == 0 (
    echo [✓] Python is installed
    python --version
) else (
    echo [⚠] Python is not installed
    echo Python is recommended for building native modules
    echo Download from: https://www.python.org/downloads/
)

REM Check for Visual Studio Build Tools (optional but recommended)
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019" (
    echo [✓] Visual Studio 2019 Build Tools detected
) else if exist "C:\Program Files (x86)\Microsoft Visual Studio\2022" (
    echo [✓] Visual Studio 2022 Build Tools detected
) else (
    echo [⚠] Visual Studio Build Tools not detected
    echo For building native modules, install:
    echo   https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
    echo Or run: npm install --global windows-build-tools
)

echo.
echo Step 3: Installing Node.js dependencies...
echo -------------------------------------------

if exist package.json (
    echo Running npm install...
    call npm install
    
    if %errorlevel% == 0 (
        echo [✓] Dependencies installed successfully
    ) else (
        echo [✗] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [✗] package.json not found. Are you in the project directory?
    pause
    exit /b 1
)

echo.
echo Step 4: Building the project...
echo --------------------------------

call npm run build

if %errorlevel% == 0 (
    echo [✓] Project built successfully
) else (
    echo [✗] Build failed
    pause
    exit /b 1
)

echo.
echo Step 5: Running tests (optional)...
echo ------------------------------------

set /p RUN_TESTS="Do you want to run tests? (y/n): "
if /i "%RUN_TESTS%"=="y" (
    call npm test
)

echo.
echo =================================
echo Setup Complete!
echo =================================
echo.
echo Available commands:
echo   npm run dev          - Start development mode
echo   npm run build        - Build TypeScript
echo   npm test             - Run tests
echo   npm run lint         - Lint code
echo   npm run dist:win     - Build Windows installer
echo.
echo To start development:
echo   npm run dev
echo.
pause
