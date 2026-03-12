import Redis from 'ioredis'
import { logger } from '../utils/logger.js'

function requireEnv(key) {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env: ${key}`)
  return val
}

const REDIS_URL = requireEnv('REDIS_URL')

// Main Redis client — for caching and general use
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck:     true,
  lazyConnect:          false,
})

redis.on('error',   (err) => logger.error('Redis error',   { error: err.message }))
redis.on('connect', ()    => logger.info('Redis connected'))

// Separate client for BullMQ (BullMQ needs its own connection)
export function createBullMQConnection() {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,  // required by BullMQ
    enableReadyCheck:     false, // required by BullMQ
  })
}

export const redisConfig = { url: REDIS_URL }
