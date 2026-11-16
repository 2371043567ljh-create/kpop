import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import healthHandler from '../health.ts';
import evaluateActionHandler from '../ai/evaluate-action.ts';
import theqooPostHandler from '../ai/theqoo-post.ts';
import netlifyHealth, { config as netlifyHealthConfig } from '../../netlify/functions/health.ts';
import netlifyEvaluateAction, {
  config as netlifyEvaluateActionConfig,
} from '../../netlify/functions/evaluate-action.ts';
import netlifyTheqooPost, {
  config as netlifyTheqooPostConfig,
} from '../../netlify/functions/theqoo-post.ts';
import type { Context } from '@netlify/functions';
import type { ServerlessRequest, ServerlessResponse } from './http.ts';

function createMockReqRes(options: {
  method: string;
  body?: unknown;
  rawBody?: string;
}) {
  const req = new EventEmitter() as ServerlessRequest;
  req.method = options.method;
  if (options.body !== undefined) {
    req.body = options.body;
  }

  let statusCode = 200;
  let responseBody = '';
  const headers: Record<string, string> = {};

  const res = {
    setHeader(name: string, value: string) {
      headers[name] = value;
      return this;
    },
    end(chunk?: string) {
      if (chunk) responseBody += chunk;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    set statusCode(code: number) {
      statusCode = code;
    },
  } as unknown as ServerlessResponse;

  if (options.rawBody !== undefined) {
    queueMicrotask(() => {
      req.emit('data', Buffer.from(options.rawBody!, 'utf8'));
      req.emit('end');
    });
  }

  return {
    req,
    res,
    getResult: () => ({
      statusCode,
      headers,
      json: responseBody ? JSON.parse(responseBody) : null,
    }),
  };
}

test('GET /api/health returns 200 and rejects POST with 405', async () => {
  const okCase = createMockReqRes({ method: 'GET' });
  await healthHandler(okCase.req, okCase.res);
  const res1 = okCase.getResult();
  assert.equal(res1.statusCode, 200);
  assert.equal(res1.json.ok, true);
  assert.equal(typeof res1.json.aiConfigured, 'boolean');

  const badMethod = createMockReqRes({ method: 'POST' });
  await healthHandler(badMethod.req, badMethod.res);
  assert.equal(badMethod.getResult().statusCode, 405);
});

test('POST /api/ai/evaluate-action parses raw stream body and validates required fields', async () => {
  const invalidCase = createMockReqRes({
    method: 'POST',
    rawBody: JSON.stringify({ userInput: '' }),
  });
  await evaluateActionHandler(invalidCase.req, invalidCase.res);
  assert.equal(invalidCase.getResult().statusCode, 400);

  const wrongMethod = createMockReqRes({ method: 'GET' });
  await evaluateActionHandler(wrongMethod.req, wrongMethod.res);
  assert.equal(wrongMethod.getResult().statusCode, 405);
});

test('POST /api/ai/theqoo-post validates payload and enforces POST method', async () => {
  const invalidCase = createMockReqRes({
    method: 'POST',
    body: {},
  });
  await theqooPostHandler(invalidCase.req, invalidCase.res);
  assert.equal(invalidCase.getResult().statusCode, 400);

  const wrongMethod = createMockReqRes({ method: 'GET' });
  await theqooPostHandler(wrongMethod.req, wrongMethod.res);
  assert.equal(wrongMethod.getResult().statusCode, 405);
});

const mockNetlifyContext = {} as Context;

test('Netlify Functions v2 expose expected custom /api/* paths and handle Web Requests', async () => {
  assert.equal(netlifyHealthConfig.path, '/api/health');
  assert.equal(netlifyEvaluateActionConfig.path, '/api/ai/evaluate-action');
  assert.equal(netlifyTheqooPostConfig.path, '/api/ai/theqoo-post');

  const healthRes = await netlifyHealth(
    new Request('https://example.netlify.app/api/health', { method: 'GET' }),
    mockNetlifyContext
  );
  assert.equal(healthRes.status, 200);
  const healthJson = (await healthRes.json()) as { ok: boolean; aiConfigured: boolean };
  assert.equal(healthJson.ok, true);
  assert.equal(typeof healthJson.aiConfigured, 'boolean');

  const healthBadMethod = await netlifyHealth(
    new Request('https://example.netlify.app/api/health', { method: 'POST' }),
    mockNetlifyContext
  );
  assert.equal(healthBadMethod.status, 405);
  assert.equal(healthBadMethod.headers.get('Allow'), 'GET');

  const evalInvalid = await netlifyEvaluateAction(
    new Request('https://example.netlify.app/api/ai/evaluate-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput: '   ' }),
    }),
    mockNetlifyContext
  );
  assert.equal(evalInvalid.status, 400);

  const evalBadMethod = await netlifyEvaluateAction(
    new Request('https://example.netlify.app/api/ai/evaluate-action', { method: 'GET' }),
    mockNetlifyContext
  );
  assert.equal(evalBadMethod.status, 405);

  const theqooInvalid = await netlifyTheqooPost(
    new Request('https://example.netlify.app/api/ai/theqoo-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
    mockNetlifyContext
  );
  assert.equal(theqooInvalid.status, 400);

  const theqooBadMethod = await netlifyTheqooPost(
    new Request('https://example.netlify.app/api/ai/theqoo-post', { method: 'GET' }),
    mockNetlifyContext
  );
  assert.equal(theqooBadMethod.status, 405);
});
