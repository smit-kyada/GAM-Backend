@echo off
echo ========================================
echo    Redis Installation for Windows
echo ========================================
echo.

echo This script will help you install Redis on Windows.
echo.

echo Choose installation method:
echo 1. Download Redis for Windows (Recommended)
echo 2. Install via Chocolatey (if you have Chocolatey)
echo 3. Use Docker (if you have Docker)
echo 4. Skip Redis installation
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto download_redis
if "%choice%"=="2" goto chocolatey_redis
if "%choice%"=="3" goto docker_redis
if "%choice%"=="4" goto skip_redis
goto invalid_choice

:download_redis
echo.
echo Downloading Redis for Windows...
echo Please download Redis from: https://github.com/microsoftarchive/redis/releases
echo.
echo After downloading:
echo 1. Extract the ZIP file to C:\Redis
echo 2. Open Command Prompt as Administrator
echo 3. Navigate to C:\Redis
echo 4. Run: redis-server.exe
echo.
echo Alternative: Download Redis from https://github.com/tporadowski/redis/releases
echo (More recent Windows builds)
goto end

:chocolatey_redis
echo.
echo Installing Redis via Chocolatey...
choco install redis-64
if errorlevel 1 (
    echo ERROR: Failed to install Redis via Chocolatey
    echo Make sure Chocolatey is installed: https://chocolatey.org/install
    goto end
)
echo Redis installed successfully!
echo Starting Redis service...
redis-server
goto end

:docker_redis
echo.
echo Starting Redis via Docker...
docker run -d -p 6379:6379 --name redis redis:alpine
if errorlevel 1 (
    echo ERROR: Failed to start Redis container
    echo Make sure Docker is installed and running
    goto end
)
echo Redis container started successfully!
echo Redis is available on localhost:6379
goto end

:skip_redis
echo.
echo Skipping Redis installation.
echo Note: The application will work without Redis but caching features will be disabled.
goto end

:invalid_choice
echo Invalid choice. Please run the script again.
goto end

:end
echo.
echo Redis setup completed!
echo You can test Redis by running: redis-cli ping
echo.
pause
