@echo off
echo ========================================
echo    GAM Backend Production Server
echo ========================================
echo.

:: Set environment variables
set NODE_ENV=production
set PORT=3001

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if PM2 is installed
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo Installing PM2 globally...
    npm install -g pm2
    if errorlevel 1 (
        echo ERROR: Failed to install PM2
        pause
        exit /b 1
    )
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

:: Stop existing PM2 processes
echo Stopping existing PM2 processes...
pm2 stop gam-backend 2>nul
pm2 delete gam-backend 2>nul

:: Start production server with PM2
echo Starting production server with PM2...
pm2 start ecosystem.config.js --env production

:: Show status
echo.
echo ========================================
echo    Server Status
echo ========================================
pm2 status

echo.
echo Server is running in production mode!
echo Health check: http://localhost:%PORT%/health
echo GraphQL endpoint: http://localhost:%PORT%/graphql
echo.
echo Useful commands:
echo   pm2 status     - Check server status
echo   pm2 logs       - View logs
echo   pm2 monit      - Monitor processes
echo   pm2 restart gam-backend - Restart server
echo   pm2 stop gam-backend    - Stop server
echo.

pause
