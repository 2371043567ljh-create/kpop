import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ServerlessRequest extends IncomingMessage {
  body?: unknown;
}

export interface ServerlessResponse extends ServerResponse {
  status?: (statusCode: number) => ServerlessResponse;
  json?: (body: unknown) => void;
}

const MAX_BODY_BYTES = 1024 * 1024; // 1MB

export function sendJson(
  res: ServerlessResponse,
  statusCode: number,
  payload: unknown
): void {
  const statusFn = res.status;
  const jsonFn = res.json;
  if (typeof statusFn === 'function' && typeof jsonFn === 'function') {
    statusFn.call(res, statusCode);
    jsonFn.call(res, payload);
    return;
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export async function readJsonBody<T = Record<string, unknown>>(
  req: ServerlessRequest
): Promise<T | null> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body) as T;
      } catch {
        return null;
      }
    }
    if (typeof req.body === 'object') {
      return req.body as T;
    }
  }

  return new Promise<T | null>((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    req.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > MAX_BODY_BYTES) {
        settled = true;
        resolve(null);
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw) as T);
      } catch {
        resolve(null);
      }
    });

    req.on('error', () => {
      if (settled) return;
      settled = true;
      resolve(null);
    });
  });
}

export function enforceMethod(
  req: ServerlessRequest,
  res: ServerlessResponse,
  allowedMethod: 'GET' | 'POST'
): boolean {
  if (req.method !== allowedMethod) {
    res.setHeader('Allow', allowedMethod);
    sendJson(res, 405, { error: `Method ${req.method ?? 'UNKNOWN'} Not Allowed` });
    return false;
  }
  return true;
}
