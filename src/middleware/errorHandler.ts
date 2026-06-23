import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import type { ErrorResponse } from '../types/index.js';

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  logger.error('Request error', { message: error.message, statusCode: error.statusCode });

  if (error instanceof ZodError) {
    const message = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    const response: ErrorResponse = { success: false, error: message };
    reply.status(400).send(response);
    return;
  }

  if (error.validation) {
    const response: ErrorResponse = { success: false, error: error.message };
    reply.status(400).send(response);
    return;
  }

  const statusCode = error.statusCode ?? 500;
  const response: ErrorResponse = {
    success: false,
    error: statusCode >= 500 ? 'Internal server error' : error.message,
  };

  reply.status(statusCode).send(response);
}
