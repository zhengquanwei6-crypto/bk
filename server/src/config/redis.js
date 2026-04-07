const Redis = require('ioredis');

/**
 * Redis 客户端配置
 * 用于缓存热门文章、用户会话等高频访问数据
 */
let redis = null;

const connectRedis = () => {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // 超过 3 次停止重试
        return Math.min(times * 500, 2000);
      },
      lazyConnect: true,
    });

    let errorLogged = false;
    redis.on('connect', () => {
      errorLogged = false;
      console.log('[缓存] Redis 已连接');
    });

    redis.on('error', (err) => {
      if (!errorLogged) {
        console.warn(`[缓存] Redis 不可用: ${err.message}，系统在无缓存模式下运行`);
        errorLogged = true;
      }
    });

    redis.connect().catch(() => {});
  } catch {
    console.warn('[缓存] Redis 初始化失败，跳过缓存');
  }

  return redis;
};

/**
 * 获取 Redis 客户端实例
 */
const getRedis = () => redis;

/**
 * 缓存工具函数
 */
const cache = {
  async get(key) {
    if (!redis || redis.status !== 'ready') return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async set(key, value, ttl = 300) {
    if (!redis || redis.status !== 'ready') return;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch {
      /* 静默失败 */
    }
  },

  async del(key) {
    if (!redis || redis.status !== 'ready') return;
    try {
      await redis.del(key);
    } catch {
      /* 静默失败 */
    }
  },

  async delPattern(pattern) {
    if (!redis || redis.status !== 'ready') return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      /* 静默失败 */
    }
  },
};

module.exports = { connectRedis, getRedis, cache };
