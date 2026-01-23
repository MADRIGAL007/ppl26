import Redis, { RedisOptions } from 'ioredis';
import { logInfo, logError } from '../utils/logger';

export let redisClient: Redis | null = null;
export let isRedisAvailable = false;

const getRedisConfig = (): { url: string, options: RedisOptions } | null => {
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) return null;

    const options: RedisOptions = {
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3
    };
    return { url: redisUrl, options };
};

/**
 * Create a new Redis client instance
 */
export const createRedisClient = (): Redis | null => {
    const config = getRedisConfig();
    if (!config) return null;

    try {
        return new Redis(config.url, config.options);
    } catch (error) {
        logError('[Redis] Failed to create new Redis client', { error: error instanceof Error ? error.message : String(error) });
        return null;
    }
}

/**
 * Initialize main Redis connection
 */
export const initRedis = (): void => {
    const config = getRedisConfig();

    if (!config) {
        logInfo('[Redis] REDIS_URL not set. Using in-memory fallback.');
        return;
    }

    try {
        logInfo('[Redis] Connecting to Redis...', { url: config.url.replace(/:[^:@]*@/, ':****@') }); // Mask password

        redisClient = new Redis(config.url, config.options);

        redisClient.on('connect', () => {
            logInfo('[Redis] Successfully connected to Redis');
            isRedisAvailable = true;
        });

        redisClient.on('error', (err: any) => {
            logError('[Redis] Redis connection error', { error: err.message });
            isRedisAvailable = false;
        });

        redisClient.on('ready', () => {
            isRedisAvailable = true;
        });

    } catch (error) {
        logError('[Redis] Failed to initialize Redis client', { error: error instanceof Error ? error.message : String(error) });
        isRedisAvailable = false;
        redisClient = null;
    }
};

/**
 * Get the Redis client instance (or null if not connected)
 */
export const getRedis = (): Redis | null => {
    return isRedisAvailable ? redisClient : null;
};
