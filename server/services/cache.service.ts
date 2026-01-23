import { redisClient, isRedisAvailable } from './redis.service';

/**
 * Cache Service
 * Provides in-memory caching with optional Redis backend
 */

// Cache entry with TTL (for memory cache)
interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

// In-memory cache store
const memoryCache = new Map<string, CacheEntry<any>>();

// Configuration
const config = {
    defaultTTL: 300, // 5 minutes
    maxEntries: 10000,
    cleanupInterval: 60000 // 1 minute
};

// Cleanup expired entries periodically (only for memory cache)
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of memoryCache.entries()) {
        if (entry.expiresAt < now) {
            memoryCache.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired entries (Memory)`);
    }
}, config.cleanupInterval);

/**
 * Get a value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
    if (isRedisAvailable && redisClient) {
        try {
            const val = await redisClient.get(key);
            return val ? JSON.parse(val) as T : null;
        } catch (err) {
            console.warn(`[Cache] Redis get error for ${key}:`, err);
            // Fallback to memory? risky if inconsistent. Return null to be safe.
            return null;
        }
    }

    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return null;
    }

    return entry.value as T;
}

/**
 * Set a value in cache
 */
export async function set<T>(key: string, value: T, ttlSeconds: number = config.defaultTTL): Promise<void> {
    if (isRedisAvailable && redisClient) {
        try {
            await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            return;
        } catch (err) {
            console.warn(`[Cache] Redis set error for ${key}:`, err);
            // Fallback to memory?
        }
    }

    // Memory Cache Logic
    if (memoryCache.size >= config.maxEntries) {
        const oldest = memoryCache.keys().next().value;
        if (oldest) memoryCache.delete(oldest);
    }

    memoryCache.set(key, {
        value,
        expiresAt: Date.now() + (ttlSeconds * 1000)
    });
}

/**
 * Delete a value from cache
 */
export async function del(key: string): Promise<boolean> {
    if (isRedisAvailable && redisClient) {
        try {
            const result = await redisClient.del(key);
            return result > 0;
        } catch (err) {
            console.warn(`[Cache] Redis del error for ${key}:`, err);
        }
    }
    return memoryCache.delete(key);
}

/**
 * Delete all keys matching a pattern
 */
export async function delPattern(pattern: string): Promise<number> {
    let count = 0;

    if (isRedisAvailable && redisClient) {
        try {
            // Use SCAN for safe pattern deletion
            const stream = redisClient.scanStream({ match: pattern });

            for await (const keys of stream) {
                if (keys.length > 0) {
                    await redisClient.del(...keys);
                    count += keys.length;
                }
            }
            return count;
        } catch (err) {
            console.warn(`[Cache] Redis delPattern error for ${pattern}:`, err);
        }
    }

    // Memory Cache Logic
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
            memoryCache.delete(key);
            count++;
        }
    }

    return count;
}

/**
 * Check if key exists
 */
export async function exists(key: string): Promise<boolean> {
    if (isRedisAvailable && redisClient) {
        try {
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (err) {
            console.warn(`[Cache] Redis exists error for ${key}:`, err);
            return false;
        }
    }

    const entry = memoryCache.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
        memoryCache.delete(key);
        return false;
    }
    return true;
}

/**
 * Get or set - returns cached value or computes and caches it
 */
export async function getOrSet<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number = config.defaultTTL
): Promise<T> {
    const cached = await get<T>(key);
    if (cached !== null) return cached;

    const value = await compute();
    await set(key, value, ttlSeconds);
    return value;
}

/**
 * Clear all cache entries
 */
export async function clear(): Promise<void> {
    if (isRedisAvailable && redisClient) {
        try {
            await redisClient.flushdb();
        } catch (err) {
            console.warn('[Cache] Redis flushdb error:', err);
        }
    }
    memoryCache.clear();
}

/**
 * Get cache stats
 */
export function getStats(): { size: number; maxSize: number; mode: string } {
    return {
        size: memoryCache.size,
        maxSize: config.maxEntries,
        mode: isRedisAvailable ? 'Redis' : 'Memory'
    };
}

// Named export for cache operations
export const cache = {
    get,
    set,
    del,
    delPattern,
    exists,
    getOrSet,
    clear,
    getStats
};

export default cache;
