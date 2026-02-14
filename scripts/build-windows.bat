@echo off
REM build-windows.bat - Build Windows installers

echo ====================================
echo File Transfer App - Windows Build
echo ====================================
echo.

REM Check for node_modules
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Clean previous builds
echo Cleaning previous builds...
call npm run clean
if exist "release\" rmdir /s /q release
echo.

REM Build TypeScript
echo Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)
echo.

REM Check for icon
if not exist "build\" mkdir build
if not exist "build\icon.ico" (
    echo Warning: Icon not found at build\icon.ico
    echo Using default icon...
    if exist "src\public\assets\icon.png" (
        copy "src\public\assets\icon.png" "build\icon.png"
    )
)
echo.

REM Build Windows installers
echo Building Windows installers...
call npm run dist:win

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Build successful!
    echo ========================================
    echo.
    echo Generated installers:
    dir /b release\*.exe
    echo.
    echo Release directory: .\release\
) else (
    echo Build failed!
)

pause
