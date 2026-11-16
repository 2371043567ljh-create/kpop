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
import {
  evaluateActionCore,
  evaluateHealthCore,
  evaluateTheqooPostCore,
  getAiConfig,
  parseModelJson,
} from './gemini.ts';
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

test('AI config & health check support AI_API_KEY and GEMINI_API_KEY with SiliconFlow defaults', () => {
  const prevAiKey = process.env.AI_API_KEY;
  const prevGeminiKey = process.env.GEMINI_API_KEY;
  const prevBaseUrl = process.env.AI_BASE_URL;
  const prevModel = process.env.AI_MODEL;

  try {
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;

    const unconfigured = getAiConfig();
    assert.equal(unconfigured.apiKey, null);
    assert.equal(unconfigured.baseUrl, 'https://api.siliconflow.cn/v1');
    assert.equal(unconfigured.model, 'deepseek-ai/DeepSeek-V4.1-Flash');
    assert.deepEqual(evaluateHealthCore().data, { ok: true, aiConfigured: false });

    process.env.GEMINI_API_KEY = 'legacy-gemini-key';
    assert.deepEqual(evaluateHealthCore().data, { ok: true, aiConfigured: true });

    process.env.AI_API_KEY = 'sf-test-key';
    process.env.AI_BASE_URL = 'https://custom.example.com/v1///';
    process.env.AI_MODEL = 'Pro/deepseek-ai/DeepSeek-V3.2';
    const configured = getAiConfig();
    assert.equal(configured.apiKey, 'sf-test-key');
    assert.equal(configured.baseUrl, 'https://custom.example.com/v1');
    assert.equal(configured.model, 'Pro/deepseek-ai/DeepSeek-V3.2');
    assert.deepEqual(evaluateHealthCore().data, { ok: true, aiConfigured: true });
  } finally {
    if (prevAiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = prevAiKey;
    if (prevGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevGeminiKey;
    if (prevBaseUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = prevBaseUrl;
    if (prevModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = prevModel;
  }
});

test('parseModelJson strips markdown code fences, think blocks, and trailing commas', () => {
  const fenced = `
<think>hidden chain of thought</think>
Here is the JSON result:
\`\`\`json
{
  "narrative": "你在灯光下稳住了呼吸。",
  "outcomeTier": "brilliant",
}
\`\`\`
`;
  const parsed = parseModelJson<{ narrative: string; outcomeTier: string }>(fenced);
  assert.equal(parsed.narrative, '你在灯光下稳住了呼吸。');
  assert.equal(parsed.outcomeTier, 'brilliant');
});

test('evaluateActionCore and evaluateTheqooPostCore call SiliconFlow chat/completions with enable_thinking: false', async () => {
  const prevFetch = globalThis.fetch;
  const prevAiKey = process.env.AI_API_KEY;
  const prevBaseUrl = process.env.AI_BASE_URL;
  const prevModel = process.env.AI_MODEL;

  const capturedCalls: Array<{ url: string; auth: string | null; body: Record<string, unknown> }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    capturedCalls.push({ url, auth: headers.Authorization ?? null, body });

    if (capturedCalls.length === 1) {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: `\`\`\`json
{
  "narrative": "你稳住节奏完成清唱。",
  "evaluatorNote": "“很稳。”",
  "outcomeTier": "brilliant",
  "unlockedTag": "清唱镇场",
  "statChanges": { "vocal": 6, "dance": 0, "rap": 0, "stage": 4, "stamina": -10, "publicFavor": 5, "controversy": -2 }
}
\`\`\``,
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                postTitle: '凌晨四点半上班路神图出圈',
                postBody: '气场全开的一眼万年瞬间。',
                highlightTag: '上班路热议',
                comments: [{ author: '网友1', content: '太绝了', likes: 210 }],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    process.env.AI_API_KEY = 'sf-unit-test-key';
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;

    const sampleProfile = {
      realName: '林星野',
      stageName: '',
      displayName: '林星野',
      track: 'boy' as const,
      agency: 'sm' as const,
      roleMode: 'dual' as const,
      primaryRole: 'vocal' as const,
      secondaryRole: 'stage' as const,
      roleLabel: '主唱 + 舞台副中心',
    };
    const sampleStats = {
      vocal: 70,
      dance: 45,
      rap: 40,
      stage: 62,
      stamina: 100,
      maxStamina: 100,
      publicFavor: 20,
      controversy: 10,
    };

    const actionRes = await evaluateActionCore({
      profile: sampleProfile,
      stats: sampleStats,
      actNumber: 1,
      sceneTitle: '暗室终审',
      dilemmaPrompt: '伴奏中断',
      userInput: '直接清唱完副歌',
    });
    assert.equal(actionRes.status, 200);
    assert.equal(capturedCalls[0].url, 'https://api.siliconflow.cn/v1/chat/completions');
    assert.equal(capturedCalls[0].auth, 'Bearer sf-unit-test-key');
    assert.equal(capturedCalls[0].body.model, 'deepseek-ai/DeepSeek-V4.1-Flash');
    assert.equal(capturedCalls[0].body.enable_thinking, false);

    const theqooRes = await evaluateTheqooPostCore({
      profile: sampleProfile,
      actionLabel: '微笑点头致意',
    });
    assert.equal(theqooRes.status, 200);
    assert.equal(capturedCalls[1].url, 'https://api.siliconflow.cn/v1/chat/completions');
    assert.equal(capturedCalls[1].body.enable_thinking, false);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevAiKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = prevAiKey;
    if (prevBaseUrl === undefined) delete process.env.AI_BASE_URL;
    else process.env.AI_BASE_URL = prevBaseUrl;
    if (prevModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = prevModel;
  }
});
