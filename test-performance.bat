@echo off
echo ========================================
echo    GAM Backend Performance Test
echo ========================================
echo.

:: Check if server is running
echo Checking if server is running...
curl -s http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo ERROR: Server is not running on port 3001
    echo Please start the server first using start-dev.bat or start-prod.bat
    pause
    exit /b 1
)

echo Server is running! Starting performance test...
echo.

:: Set test URL
set TEST_URL=http://localhost:3001

:: Run performance test
echo Running performance test...
echo This may take a few minutes...
echo.

node scripts/performance-test.js

echo.
echo Performance test completed!
echo Check the results above for performance metrics.
echo.

pause
