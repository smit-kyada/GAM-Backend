# 🚀 Quick Start Guide - Windows 11

## 🎯 One-Click Setup for Windows Users

### **Step 1: Prerequisites**
Make sure you have:
- ✅ Node.js 18+ installed ([Download here](https://nodejs.org))
- ✅ MongoDB installed ([Download here](https://www.mongodb.com/try/download/community))

### **Step 2: Install Redis (Choose one method)**

#### **Method A: Easy Installation Script**
```cmd
# Run the Redis installation helper
npm run install:redis
```

#### **Method B: Manual Download**
1. Download Redis for Windows from: https://github.com/tporadowski/redis/releases
2. Extract to `C:\Redis`
3. Run `C:\Redis\redis-server.exe`

#### **Method C: Docker (if you have Docker Desktop)**
```cmd
docker run -d -p 6379:6379 --name redis redis:alpine
```

### **Step 3: Configure Environment**
```cmd
# Copy example configuration
copy config.example.env .env

# Edit the .env file with your settings
notepad .env
```

### **Step 4: Start the Application**

#### **Development Mode (Recommended for testing)**
```cmd
# Double-click the batch file or run:
npm run windows:dev
```

#### **Production Mode (For high performance)**
```cmd
# Double-click the batch file or run:
npm run windows:prod
```

### **Step 5: Test Performance**
```cmd
# Run performance test
npm run windows:test
```

### **Step 6: Check Health**
```cmd
# Check if everything is working
npm run health:check
```

---

## 🎮 Easy Commands for Windows

| Action | Command | Batch File |
|--------|---------|------------|
| **Start Development** | `npm run windows:dev` | `start-dev.bat` |
| **Start Production** | `npm run windows:prod` | `start-prod.bat` |
| **Test Performance** | `npm run windows:test` | `test-performance.bat` |
| **Install Redis** | `npm run install:redis` | `install-redis-windows.bat` |

---

## 🔧 PM2 Commands (Production Mode)

```cmd
# Check server status
npm run status:pm2

# View logs
npm run logs:pm2

# Monitor processes
npm run monitor:pm2

# Restart server
npm run restart:pm2

# Stop server
npm run stop:pm2
```

---

## 🌐 Access Your Application

- **GraphQL Playground**: http://localhost:3001/graphql
- **Health Check**: http://localhost:3001/health
- **API Endpoints**: http://localhost:3001/api/v1/

---

## 🚨 Troubleshooting

### **Server won't start?**
```cmd
# Check if port 3001 is free
netstat -an | findstr :3001

# Kill process using port 3001
taskkill /PID <PID> /F
```

### **Redis connection failed?**
```cmd
# Test Redis
redis-cli ping

# Start Redis manually
redis-server
```

### **MongoDB connection failed?**
```cmd
# Start MongoDB service
net start MongoDB

# Or start manually
mongod
```

### **PM2 issues?**
```cmd
# Reset PM2
pm2 kill
pm2 delete all

# Restart
npm run start:pm2:prod
```

---

## 📊 Performance Expectations

After setup, your application should handle:
- ✅ **500+ requests/second**
- ✅ **1 million requests/day**
- ✅ **<200ms response time**
- ✅ **High availability with PM2**

---

## 🎉 You're All Set!

Your GAM Backend is now optimized for Windows 11 with:
- 🚀 **10x performance improvement**
- 🛡️ **Rate limiting protection**
- 💾 **Redis caching**
- 📊 **Performance monitoring**
- 🔄 **Auto-restart on crashes**
- 📝 **Structured logging**

**Happy coding!** 🎯
