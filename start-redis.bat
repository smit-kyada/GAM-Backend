@echo off
echo Starting Redis Server...

:: Check if Redis is installed
if not exist "C:\Redis\redis-server.exe" (
    echo ERROR: Redis is not installed!
    echo.
    echo Please download Redis from: https://github.com/tporadowski/redis/releases
    echo Extract it to C:\Redis
    echo.
    pause
    exit /b 1
)

:: Start Redis with password
echo Starting Redis with password protection...
C:\Redis\redis-server.exe --requirepass GAM-Backend-Redis-2024

pause
