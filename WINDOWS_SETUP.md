# 🚀 Windows 11 Setup Guide for GAM Backend Performance

This guide provides Windows-specific instructions for setting up the performance-optimized GAM Backend.

## 📋 Prerequisites for Windows 11

### 1. **Node.js Installation**
```powershell
# Download and install Node.js 18+ from https://nodejs.org
# Or use Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

### 2. **Redis Installation (Windows)**

#### Option A: Redis for Windows (Recommended)
```powershell
# Download Redis for Windows from:
# https://github.com/microsoftarchive/redis/releases
# Or use Chocolatey
choco install redis-64

# Start Redis service
redis-server
```

#### Option B: Redis using WSL2
```powershell
# Install WSL2
wsl --install

# Inside WSL2
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

#### Option C: Docker Redis (Alternative)
```powershell
# Install Docker Desktop for Windows
# Then run Redis container
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 3. **MongoDB Installation**
```powershell
# Download MongoDB Community Server from:
# https://www.mongodb.com/try/download/community
# Or use Chocolatey
choco install mongodb

# Start MongoDB service
net start MongoDB
```

## 🛠️ Windows-Specific Setup

### 1. **Install Dependencies**
```powershell
# Navigate to project directory
cd "C:\Users\Mahek\Downloads\raj\funclicks\GAM-Backend"

# Install all dependencies
npm install
```

### 2. **Environment Configuration**
```powershell
# Copy example config
copy config.example.env .env

# Edit .env file (use your preferred editor)
notepad .env
```

### 3. **Windows Environment Variables**
Add these to your `.env` file:
```env
# Windows-specific paths
REDIS_HOST=localhost
REDIS_PORT=6379
DATABASE_URL=mongodb://localhost:27017/gam-backend

# Windows file paths (use forward slashes)
ASSETS_STORAGE=./uploads

# Log paths (Windows compatible)
LOG_LEVEL=debug
```

### 4. **Create Required Directories**
```powershell
# Create logs directory
mkdir logs

# Create uploads directory
mkdir uploads
```

## 🚀 Running the Application on Windows

### Development Mode
```powershell
# Start development server
npm run dev

# Or using nodemon directly
npm start
```

### Production Mode with PM2
```powershell
# Install PM2 globally (if not already installed)
npm install -g pm2

# Start with PM2
npm run start:pm2

# Monitor processes
npm run monitor:pm2

# View logs
npm run logs:pm2
```

## 🔧 Windows-Specific Configurations

### PM2 Configuration for Windows
Update `ecosystem.config.js` for Windows:
```javascript
module.exports = {
  apps: [
    {
      name: 'gam-backend',
      script: 'src/index.js',
      instances: process.env.NODE_ENV === 'production' ? 2 : 1, // Reduced for Windows
      exec_mode: 'cluster',
      
      // Windows-specific settings
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        // Windows path handling
        TMPDIR: process.env.TEMP || 'C:\\temp'
      },
      
      // Windows-compatible logging
      log_file: '.\\logs\\pm2-combined.log',
      out_file: '.\\logs\\pm2-out.log',
      error_file: '.\\logs\\pm2-error.log',
      
      // Windows-specific options
      kill_timeout: 10000,
      listen_timeout: 15000,
      
      // Disable watch in production (Windows performance)
      watch: process.env.NODE_ENV === 'development' ? ['src'] : false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
    }
  ]
};
```

### Windows Service Setup (Optional)
```powershell
# Install PM2 as Windows service
pm2-service-install

# Start PM2 service
pm2-service-start
```

## 📊 Performance Testing on Windows

### Run Performance Tests
```powershell
# Basic performance test
npm run perf:test

# Production performance test
npm run perf:test:prod

# Custom test URL
$env:TEST_URL="http://localhost:3001"; npm run perf:test
```

### Windows Performance Monitoring
```powershell
# Check system resources
Get-Process node | Select-Object ProcessName, CPU, WorkingSet

# Monitor Redis
redis-cli info memory

# Check MongoDB status
mongo --eval "db.runCommand('serverStatus')"
```

## 🔍 Windows Troubleshooting

### Common Windows Issues

#### 1. **Redis Connection Issues**
```powershell
# Check if Redis is running
netstat -an | findstr 6379

# Start Redis manually
redis-server

# Test Redis connection
redis-cli ping
```

#### 2. **Port Already in Use**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change port in .env file
```

#### 3. **Permission Issues**
```powershell
# Run PowerShell as Administrator
# Grant full control to project folder
icacls "C:\Users\Mahek\Downloads\raj\funclicks\GAM-Backend" /grant Everyone:F /T
```

#### 4. **PM2 Issues on Windows**
```powershell
# Reset PM2
pm2 kill
pm2 delete all

# Restart PM2
pm2 start ecosystem.config.js

# Check PM2 status
pm2 status
```

### Windows-Specific Error Solutions

#### **EADDRINUSE Error**
```powershell
# Find and kill process on port
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

#### **Redis Connection Refused**
```powershell
# Start Redis service
redis-server

# Or install as Windows service
sc create Redis binPath= "C:\Program Files\Redis\redis-server.exe"
sc start Redis
```

#### **MongoDB Connection Issues**
```powershell
# Start MongoDB service
net start MongoDB

# Or start manually
mongod --dbpath "C:\data\db"
```

## 🎯 Windows Performance Optimization

### System-Level Optimizations

#### 1. **Windows Defender Exclusions**
Add these paths to Windows Defender exclusions:
- `C:\Users\Mahek\Downloads\raj\funclicks\GAM-Backend`
- `C:\Program Files\nodejs`
- `C:\Program Files\MongoDB`
- `C:\Program Files\Redis`

#### 2. **Power Settings**
```powershell
# Set high performance power plan
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
```

#### 3. **Virtual Memory Settings**
- Increase virtual memory to 2x your RAM
- Set initial and maximum size to the same value

### Application-Level Optimizations

#### 1. **Node.js Memory Settings**
```powershell
# Increase Node.js memory limit
$env:NODE_OPTIONS="--max-old-space-size=4096"

# Start application
npm run start:pm2
```

#### 2. **Windows Event Logs**
```powershell
# Check application logs
Get-EventLog -LogName Application -Source "Node.js" -Newest 10

# Check system performance
Get-Counter "\Processor(_Total)\% Processor Time"
```

## 📱 Windows Development Tools

### Recommended Tools
1. **Windows Terminal** - Better PowerShell experience
2. **Visual Studio Code** - Code editor with Node.js support
3. **MongoDB Compass** - MongoDB GUI
4. **RedisInsight** - Redis GUI
5. **Postman** - API testing

### VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-node-azure-pack",
    "mongodb.mongodb-vscode",
    "ms-vscode.powershell",
    "bradlc.vscode-tailwindcss"
  ]
}
```

## 🔄 Windows Batch Scripts

Create `start-dev.bat`:
```batch
@echo off
echo Starting GAM Backend Development Server...
cd /d "C:\Users\Mahek\Downloads\raj\funclicks\GAM-Backend"
set NODE_ENV=development
npm run dev
pause
```

Create `start-prod.bat`:
```batch
@echo off
echo Starting GAM Backend Production Server...
cd /d "C:\Users\Mahek\Downloads\raj\funclicks\GAM-Backend"
set NODE_ENV=production
npm run start:pm2
pause
```

## 📊 Windows Performance Monitoring

### PowerShell Scripts

Create `monitor-performance.ps1`:
```powershell
# Monitor application performance
while ($true) {
    Clear-Host
    Write-Host "=== GAM Backend Performance Monitor ===" -ForegroundColor Green
    
    # Check Node.js processes
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Node.js Processes: $($nodeProcesses.Count)" -ForegroundColor Yellow
        $nodeProcesses | Select-Object Id, ProcessName, CPU, WorkingSet | Format-Table
    }
    
    # Check Redis
    try {
        $redisStatus = redis-cli ping 2>$null
        Write-Host "Redis Status: $redisStatus" -ForegroundColor Green
    } catch {
        Write-Host "Redis: Not Running" -ForegroundColor Red
    }
    
    # Check MongoDB
    try {
        $mongoStatus = mongo --eval "db.runCommand('ping')" --quiet 2>$null
        Write-Host "MongoDB Status: Connected" -ForegroundColor Green
    } catch {
        Write-Host "MongoDB: Not Connected" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 5
}
```

## 🎉 Quick Start Commands for Windows

```powershell
# 1. Install dependencies
npm install

# 2. Start Redis (in separate terminal)
redis-server

# 3. Start MongoDB (in separate terminal)
mongod

# 4. Configure environment
copy config.example.env .env
notepad .env

# 5. Start development server
npm run dev

# 6. Or start production with PM2
npm run start:pm2

# 7. Test performance
npm run perf:test

# 8. Check health
curl http://localhost:3001/health
```

---

**Windows 11 Optimized Setup Complete!** 🎯

Your GAM Backend is now configured for optimal performance on Windows 11 with all the performance improvements active.
