import type { FastifyInstance } from 'fastify';
import { executeRequestSchema } from '../validators/executeSchema.js';
import { executeProxyRequest } from '../services/proxyService.js';
import { logger } from '../utils/logger.js';
import type { SuccessResponse, ErrorResponse } from '../types/index.js';

export async function executeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/execute', async (request, reply) => {
    try {
      const parsed = executeRequestSchema.parse(request.body);
      logger.info('Execute request received', { method: parsed.method, url: parsed.url });

      const data = await executeProxyRequest(parsed);

      const response: SuccessResponse = { success: true, data };
      return reply.status(200).send(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.warn('Execute request failed', { error: message });

      const response: ErrorResponse = { success: false, error: message };
      return reply.status(400).send(response);
    }
  });
}
