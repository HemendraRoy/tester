import { z } from 'zod';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const executeRequestSchema = z.object({
  method: z
    .string()
    .transform((val) => val.toUpperCase())
    .pipe(z.enum(ALLOWED_METHODS, { message: 'Method must be one of: GET, POST, PUT, PATCH, DELETE' })),
  url: z.string().min(1, 'URL is required').url('Invalid URL format'),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().nullable().optional(),
});

export type ExecuteRequestInput = z.infer<typeof executeRequestSchema>;
