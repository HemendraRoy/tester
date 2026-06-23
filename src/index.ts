import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { executeRoutes } from './routes/execute.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10);
const RATE_LIMIT_TIME_WINDOW = parseInt(process.env.RATE_LIMIT_TIME_WINDOW ?? '60000', 10);

async function buildApp() {
  const fastify = Fastify({
    logger: false,
    bodyLimit: 1024 * 1024,
  });

  await fastify.register(cors, {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await fastify.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_TIME_WINDOW,
  });

  fastify.setErrorHandler(errorHandler);

  fastify.get('/health', async () => ({ status: 'ok' }));

  await fastify.register(executeRoutes);

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: HOST });
    logger.info(`Tester backend running at http://${HOST}:${PORT}`);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
