import { validateUrlForSSRF } from '../utils/ssrf.js';
import { logger } from '../utils/logger.js';
import type { ExecuteRequest, ExecuteResponseData } from '../types/index.js';

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RESPONSE_SIZE_BYTES = 10 * 1024 * 1024;

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

function headersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();

  if (!text) return '';

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  const trimmed = text.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  return text;
}

export async function executeProxyRequest(input: ExecuteRequest): Promise<ExecuteResponseData> {
  const ssrfCheck = validateUrlForSSRF(input.url);
  if (!ssrfCheck.valid) {
    throw new Error(ssrfCheck.error);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const startTime = performance.now();

  try {
    const fetchOptions: RequestInit = {
      method: input.method,
      headers: input.headers ?? {},
      signal: controller.signal,
      redirect: 'follow',
    };

    if (!METHODS_WITHOUT_BODY.has(input.method) && input.body != null && input.body !== '') {
      fetchOptions.body = input.body;
    }

    logger.debug('Executing proxy request', { method: input.method, url: input.url });

    const response = await fetch(input.url, fetchOptions);
    const duration = Math.round(performance.now() - startTime);

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE_BYTES) {
      throw new Error('Response exceeds maximum allowed size of 10 MB');
    }

    const cloned = response.clone();
    const buffer = await cloned.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_SIZE_BYTES) {
      throw new Error('Response exceeds maximum allowed size of 10 MB');
    }

    const body = await parseResponseBody(response);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: headersToRecord(response.headers),
      body,
      duration,
    };
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
      }
      logger.error('Proxy request failed', { error: error.message, duration });
      throw error;
    }

    throw new Error('An unexpected error occurred during request execution');
  } finally {
    clearTimeout(timeoutId);
  }
}
