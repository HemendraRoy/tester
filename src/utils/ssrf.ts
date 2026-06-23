import { URL } from 'node:url';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '127.0.0.1',
  '::1',
  '::',
  '[::1]',
]);

function isPrivateIPv4(octets: number[]): boolean {
  const [a, b] = octets;

  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;
  if (a === 0) return true;

  return false;
}

function parseIPv4(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return null;
    octets.push(num);
  }
  return octets;
}

function isPrivateIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  ) {
    return true;
  }

  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4Mapped) {
    const octets = parseIPv4(v4Mapped[1]);
    return octets !== null && isPrivateIPv4(octets);
  }

  return false;
}

export function validateUrlForSSRF(urlString: string): { valid: true; url: URL } | { valid: false; error: string } {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: 'Access to localhost and loopback addresses is blocked' };
  }

  const ipv4 = parseIPv4(hostname);
  if (ipv4 !== null) {
    if (isPrivateIPv4(ipv4)) {
      return { valid: false, error: 'Access to private IP addresses is blocked' };
    }
    return { valid: true, url: parsed };
  }

  if (hostname.includes(':') || hostname.startsWith('[')) {
    if (isPrivateIPv6(hostname)) {
      return { valid: false, error: 'Access to private IP addresses is blocked' };
    }
  }

  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, error: 'Access to internal hostnames is blocked' };
  }

  return { valid: true, url: parsed };
}
