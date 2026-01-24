/**
 * In-Memory Cache Service
 * Provides caching functionality using in-memory Map storage
 * Redis has been removed - using lightweight in-memory cache instead
 */

class CacheService {
    constructor() {
        this.cache = new Map();
        this.timers = new Map(); // Store timers for TTL
        console.log('✅ In-memory cache service initialized');
    }

    async get(key) {
        return this.cache.get(key) || null;
    }

    async set(key, value, ttl = 3600) {
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        // Set the value
        this.cache.set(key, value);
        
        // Set expiration timer
        if (ttl > 0) {
            const timer = setTimeout(() => {
                this.cache.delete(key);
                this.timers.delete(key);
            }, ttl * 1000);
            this.timers.set(key, timer);
        }
        
        return true;
    }

    async del(key) {
        // Clear timer if exists
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        
        return this.cache.delete(key);
    }

    async exists(key) {
        return this.cache.has(key);
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
        return true; // In-memory cache is always available
    }

    // Clear all cache
    async clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.cache.clear();
        return true;
    }

    // Get cache statistics
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    // Close/cleanup
    async close() {
        await this.clear();
    }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
