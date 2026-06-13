import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { isPublicHttpUrl } from '@/lib/osint/search/dedupe';
import type { OsintFetchedDocument } from '@/lib/osint/types';

export interface FetchPublicHtmlOptions {
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  timeoutMs?: number;
  lookupHostname?: (hostname: string) => Promise<string[]>;
}

const DEFAULT_MAX_BYTES = 500_000;
const DEFAULT_TIMEOUT_MS = 8_000;
const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);
const BLOCKED_CLOUD_METADATA_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.google.internal.',
]);

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function ipv4InCidr(ip: string, base: string, mask: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  const maskInt = mask === 0 ? 0 : (0xffffffff << (32 - mask)) >>> 0;
  return (ipInt & maskInt) === (baseInt & maskInt);
}

function isBlockedIpv4(ip: string): boolean {
  return ip === '0.0.0.0'
    || ipv4InCidr(ip, '10.0.0.0', 8)
    || ipv4InCidr(ip, '127.0.0.0', 8)
    || ipv4InCidr(ip, '169.254.0.0', 16)
    || ipv4InCidr(ip, '172.16.0.0', 12)
    || ipv4InCidr(ip, '192.168.0.0', 16);
}

function normalizeIpv6(ip: string): string {
  return ip.toLowerCase().replace(/^\[(.*)]$/, '$1');
}

function isBlockedIpAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIpv4(ip);
  if (kind === 6) {
    const normalized = normalizeIpv6(ip);
    return normalized === '::1'
      || normalized === '::'
      || normalized.startsWith('fe80:')
      || normalized.startsWith('fc')
      || normalized.startsWith('fd');
  }
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  return BLOCKED_HOSTNAMES.has(normalized)
    || BLOCKED_CLOUD_METADATA_HOSTS.has(normalized)
    || normalized === '169.254.169.254';
}

async function defaultLookupHostname(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

export async function assertPublicHttpUrl(value: string, lookupHostname: FetchPublicHtmlOptions['lookupHostname'] = defaultLookupHostname): Promise<URL> {
  if (!isPublicHttpUrl(value)) {
    throw new Error('Apenas URLs públicas HTTP/HTTPS são permitidas.');
  }

  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  const hostForIpCheck = normalizeIpv6(hostname);

  if (isBlockedHostname(hostname) || isBlockedIpAddress(hostForIpCheck)) {
    throw new Error('URL bloqueada por apontar para host interno, local ou reservado.');
  }

  if (!isIP(hostForIpCheck)) {
    const addresses = await lookupHostname(hostname);
    if (addresses.some(isBlockedIpAddress)) {
      throw new Error('URL bloqueada por resolver para IP interno, local ou reservado.');
    }
  }

  return url;
}

async function readLimitedHtml(response: Response, maxBytes: number): Promise<string> {
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`HTML excede o limite máximo permitido de ${maxBytes} bytes.`);
  }

  if (!response.body) {
    const text = await response.text();
    if (text.length > maxBytes) throw new Error(`HTML excede o limite máximo permitido de ${maxBytes} bytes.`);
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`HTML excede o limite máximo permitido de ${maxBytes} bytes.`);
      }
      chunks.push(value);
    }
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function fetchPublicHtml(url: string, options: FetchPublicHtmlOptions = {}): Promise<OsintFetchedDocument> {
  await assertPublicHttpUrl(url, options.lookupHostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'ARGUS-EYE-OSINT-MVP/0.1 (+public-source-ledger)',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      throw new Error(`Fonte respondeu com HTTP ${response.status}`);
    }

    if (!contentType.toLowerCase().includes('text/html')) {
      throw new Error(`Conteúdo ignorado por não ser HTML público (${contentType || 'sem content-type'}).`);
    }

    const html = await readLimitedHtml(response, options.maxBytes ?? DEFAULT_MAX_BYTES);

    return {
      url,
      finalUrl: response.url || url,
      status: response.status,
      contentType,
      html,
      fetchedAt: new Date(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timeout ao buscar fonte pública após ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
