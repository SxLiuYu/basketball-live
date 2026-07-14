import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('✅ Redis connected'));

  await redisClient.connect();
  return redisClient;
}

export async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
}
