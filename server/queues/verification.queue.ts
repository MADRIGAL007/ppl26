import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

// Redis connection for BullMQ
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

export const verificationQueue = new Queue('verification-queue', { connection: redisConnection });
export const verificationEvents = new QueueEvents('verification-queue', { connection: redisConnection });

export const addVerificationJob = async (sessionId: string, flowId: string, data: any = {}) => {
    return verificationQueue.add('verify-session', {
        sessionId,
        flowId,
        ...data
    }, {
        removeOnComplete: true,
        removeOnFail: 100
    });
};
