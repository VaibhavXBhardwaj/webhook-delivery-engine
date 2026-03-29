import dotenv from 'dotenv';
dotenv.config();

const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-this',
    apiKeyPrefix: process.env.API_KEY_PREFIX || 'whe',
  },
  webhook: {
    maxRetries: 5,
    retryDelays: [1000, 2000, 4000, 8000, 16000],
    deliveryTimeout: 30000,
    circuitBreakerThreshold: 10,
  },
} as const;

const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;