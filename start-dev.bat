@echo off
echo ========================================
echo    GAM Backend Development Server
echo ========================================
echo.

:: Set environment variables
set NODE_ENV=development
set PORT=3001

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Create required directories
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads

:: Start development server
echo Starting development server...
echo Server will be available at: http://localhost:%PORT%
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
