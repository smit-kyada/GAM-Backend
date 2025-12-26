import Redis from 'ioredis';

class CacheService {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        try {
            // Check if Redis is available
            if (process.env.REDIS_HOST === 'disabled') {
                console.log('ℹ️ Redis disabled by configuration');
                this.isConnected = false;
                return;
            }

            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                db: process.env.REDIS_DB || 0,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                connectTimeout: 5000, // Reduced timeout
                commandTimeout: 3000, // Reduced timeout
            });

            this.redis.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
            });

            this.redis.on('error', (err) => {
                console.log('⚠️ Redis not available, using in-memory fallback');
                this.isConnected = false;
                this.fallbackCache = new Map(); // Fallback to in-memory cache
            });

            this.redis.on('close', () => {
                console.log('⚠️ Redis connection closed');
                this.isConnected = false;
            });

        } catch (error) {
            console.log('⚠️ Redis initialization failed, using in-memory fallback:', error.message);
            this.isConnected = false;
            this.fallbackCache = new Map(); // Fallback to in-memory cache
        }
    }

    async get(key) {
        // Try Redis first
        if (this.isConnected && this.redis) {
            try {
                const value = await this.redis.get(key);
                return value ? JSON.parse(value) : null;
            } catch (error) {
                console.error('Redis get error:', error);
                // Fall back to in-memory cache
            }
        }
        
        // Fallback to in-memory cache
        if (this.fallbackCache) {
            return this.fallbackCache.get(key) || null;
        }
        
        return null;
    }

    async set(key, value, ttl = 3600) {
        // Try Redis first
        if (this.isConnected && this.redis) {
            try {
                const serializedValue = JSON.stringify(value);
                await this.redis.setex(key, ttl, serializedValue);
                return true;
            } catch (error) {
                console.error('Redis set error:', error);
                // Fall back to in-memory cache
            }
        }
        
        // Fallback to in-memory cache
        if (this.fallbackCache) {
            this.fallbackCache.set(key, value);
            // Set expiration for in-memory cache
            setTimeout(() => {
                this.fallbackCache?.delete(key);
            }, ttl * 1000);
            return true;
        }
        
        return false;
    }

    async del(key) {
        // Try Redis first
        if (this.isConnected && this.redis) {
            try {
                await this.redis.del(key);
                return true;
            } catch (error) {
                console.error('Redis delete error:', error);
                // Fall back to in-memory cache
            }
        }
        
        // Fallback to in-memory cache
        if (this.fallbackCache) {
            return this.fallbackCache.delete(key);
        }
        
        return false;
    }

    async exists(key) {
        // Try Redis first
        if (this.isConnected && this.redis) {
            try {
                const result = await this.redis.exists(key);
                return result === 1;
            } catch (error) {
                console.error('Redis exists error:', error);
                // Fall back to in-memory cache
            }
        }
        
        // Fallback to in-memory cache
        if (this.fallbackCache) {
            return this.fallbackCache.has(key);
        }
        
        return false;
    }

    // User session caching
    async cacheUser(userId, userData, ttl = 1800) { // 30 minutes
        const key = `user:${userId}`;
        return await this.set(key, userData, ttl);
    }

    async getCachedUser(userId) {
        const key = `user:${userId}`;
        return await this.get(key);
    }

    async invalidateUser(userId) {
        const key = `user:${userId}`;
        return await this.del(key);
    }

    // Site session caching
    async cacheSite(siteId, siteData, ttl = 1800) { // 30 minutes
        const key = `site:${siteId}`;
        return await this.set(key, siteData, ttl);
    }

    async getCachedSite(siteId) {
        const key = `site:${siteId}`;
        return await this.get(key);
    }

    async invalidateSite(siteId) {
        const key = `site:${siteId}`;
        return await this.del(key);
    }

    // JWT token blacklist for logout
    async blacklistToken(token, ttl = 86400) { // 24 hours
        const key = `blacklist:${token}`;
        return await this.set(key, true, ttl);
    }

    async isTokenBlacklisted(token) {
        const key = `blacklist:${token}`;
        return await this.exists(key);
    }

    // API response caching
    async cacheApiResponse(endpoint, params, response, ttl = 300) { // 5 minutes
        const key = `api:${endpoint}:${JSON.stringify(params)}`;
        return await this.set(key, response, ttl);
    }

    async getCachedApiResponse(endpoint, params) {
        const key = `api:${endpoint}:${JSON.stringify(params)}`;
        return await this.get(key);
    }

    // Health check
    async healthCheck() {
        if (this.isConnected && this.redis) {
            try {
                await this.redis.ping();
                return true;
            } catch (error) {
                console.error('Redis health check failed:', error);
                return false;
            }
        }
        
        // Return true if fallback cache is available
        return this.fallbackCache !== undefined;
    }

    // Close connection
    async close() {
        if (this.redis) {
            await this.redis.quit();
            this.isConnected = false;
        }
    }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
