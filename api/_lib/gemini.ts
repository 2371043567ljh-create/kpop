import { AGENCY_CONFIGS, TRACK_CONFIGS } from '../../src/game/constants.ts';
import { calculateEffectiveDeltas, clamp } from '../../src/game/rules.ts';
import type { PlayerProfile, PlayerStats, StatDeltas } from '../../src/game/types.ts';
import {
  enforceMethod,
  readJsonBody,
  sendJson,
  type ServerlessRequest,
  type ServerlessResponse,
} from './http.ts';

const DEFAULT_AI_BASE_URL = 'https://api.siliconflow.cn/v1';
const DEFAULT_AI_MODEL = 'deepseek-ai/DeepSeek-V4.1-Flash';
const AI_REQUEST_TIMEOUT_MS = 9000;

interface EvaluateActionPayload {
  profile?: PlayerProfile;
  stats?: PlayerStats;
  actNumber?: number;
  sceneTitle?: string;
  dilemmaPrompt?: string;
  userInput?: string;
}

interface TheqooPostPayload {
  profile?: PlayerProfile;
  actionLabel?: string;
}

interface CoreHandlerResult {
  status: number;
  data: unknown;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

export interface AiRuntimeConfig {
  apiKey: string | null;
  baseUrl: string;
  model: string;
}

export function getAiConfig(): AiRuntimeConfig {
  const rawKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const isPlaceholder =
    !rawKey || rawKey === 'MY_GEMINI_API_KEY' || rawKey === 'MY_AI_API_KEY';

  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
  const model = (process.env.AI_MODEL || DEFAULT_AI_MODEL).trim();

  return {
    apiKey: isPlaceholder ? null : rawKey,
    baseUrl: baseUrl || DEFAULT_AI_BASE_URL,
    model: model || DEFAULT_AI_MODEL,
  };
}

export function parseModelJson<T>(rawText: string): T {
  let cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  // Strip ```json ... ``` or ``` ... ``` markdown code fences
  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    cleaned = fencedMatch[1].trim();
  } else {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        const noTrailingCommas = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(noTrailingCommas) as T;
      }
    }
    throw new Error('UNPARSEABLE_AI_JSON_RESPONSE');
  }
}

function extractAssistantText(payload: ChatCompletionResponse): string {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

async function callOpenAICompatibleChat(options: {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemInstruction: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<string> {
  const endpoint = `${options.baseUrl}/chat/completions`;
  const messages = [
    { role: 'system', content: options.systemInstruction },
    { role: 'user', content: options.userPrompt },
  ];

  const sendRequest = async (bodyPayload: Record<string, unknown>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      return await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const primaryBody: Record<string, unknown> = {
    model: options.model,
    messages,
    temperature: 0.7,
    max_tokens: options.maxTokens ?? 900,
    enable_thinking: false,
    response_format: { type: 'json_object' },
  };

  let response = await sendRequest(primaryBody);

  // Compatibility fallback if a third-party OpenAI-compatible endpoint rejects enable_thinking or response_format
  if (!response.ok && (response.status === 400 || response.status === 422)) {
    const errText = await response.text().catch(() => '');
    const fallbackBody: Record<string, unknown> = {
      model: options.model,
      messages,
      temperature: 0.7,
      max_tokens: options.maxTokens ?? 900,
    };
    if (!/enable_thinking/i.test(errText)) {
      fallbackBody.enable_thinking = false;
    }
    response = await sendRequest(fallbackBody);
  }

  if (!response.ok) {
    const errorDetail = await response.text().catch(() => '');
    throw new Error(`AI upstream HTTP ${response.status}: ${errorDetail.slice(0, 240)}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const text = extractAssistantText(data).trim();
  if (!text) {
    throw new Error('AI upstream returned empty content');
  }
  return text;
}

function clampStatDelta(val: unknown, min: number, max: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return clamp(val, min, max);
}

export function evaluateHealthCore(): CoreHandlerResult {
  const { apiKey } = getAiConfig();
  return {
    status: 200,
    data: { ok: true, aiConfigured: Boolean(apiKey) },
  };
}

export async function evaluateActionCore(
  body: EvaluateActionPayload | null | undefined
): Promise<CoreHandlerResult> {
  const profile = body?.profile;
  const stats = body?.stats;
  const actNumber = body?.actNumber;
  const sceneTitle = body?.sceneTitle ?? '';
  const dilemmaPrompt = body?.dilemmaPrompt ?? '';
  const userInput = body?.userInput;

  if (!profile || !stats || !userInput || !userInput.trim()) {
    return {
      status: 400,
      data: { error: '缺少必要角色信息或自定义行动内容。' },
    };
  }

  const { apiKey, baseUrl, model } = getAiConfig();
  if (!apiKey) {
    return {
      status: 503,
      data: {
        error: 'AI_API_KEY_UNCONFIGURED',
        message: '未检测到可用的 AI API 密钥，已为您切换本地剧本推演兜底。',
      },
    };
  }

  const agency = AGENCY_CONFIGS[profile.agency];
  const track = TRACK_CONFIGS[profile.track];
  const isAce = profile.roleMode === 'ace';

  const systemInstruction = `你是 K-POP 偶像选秀文字养成游戏《STAR PLANET：序章·风暴前夜》的沉浸式导演与数值裁判。
【核心规则】
1. 绝对不要擅自描写或预设玩家的外貌长相、身高体重、体型或固定性格标签，完全围绕玩家此刻的实际行动和台词展开心理与现场反馈。
2. 紧扣所属社氛围：${agency.name}（${agency.koreanName} - ${agency.tagline}），参赛赛道：${track.title}（${track.englishBadge}）。
3. 紧扣定位：${profile.roleLabel}。
${
  isAce
    ? '4. 【⚠️ 全能 ACE 高危判定】当前玩家选择了高风险全能 ACE 路线！考官、室长与外界会用最高零短板标准审视玩家：如果玩家输入敷衍、荒诞、逃避核心考核或自大空洞，必须判定为 flawed 或 risky，大幅增加 controversy (+8~+16)、扣减 publicFavor (-4~-10)，并锐评“样样通样样松 / 伪全能”；只有专业且抗压极强的应对才给高赞与高加成。体力消耗通常在 -8 到 -22 之间。'
    : '4. 当前玩家走双修路线，请结合其主次定位表现给出公允且富有 K-POP 行业真实感的反应。'
}
5. 用第二人称“你”撰写 160~260 字细腻有临场感的中文剧情反馈（narrative），以及一句犀利的考官/对手/现场评语（evaluatorNote）。
6. 严格遵守后续仅到序章为止的边界，不要剧透第一章及之后的正式公演剧情。`;

  const prompt = `当前幕次：第 ${actNumber ?? 1} 幕《${sceneTitle}》
练习生：${profile.displayName}（本名：${profile.realName}）
当前数值：Vocal ${stats.vocal} / Dance ${stats.dance} / Rap ${stats.rap} / Stage ${stats.stage} / 体力 ${stats.stamina}/${stats.maxStamina} / 路人缘 ${stats.publicFavor} / 争议度 ${stats.controversy}
当前困境：${dilemmaPrompt}
玩家自由行动/台词：「${userInput.trim().slice(0, 300)}」

请严格按以下 JSON 结构返回结果（所有字段必须存在，statChanges 中每项均为整数）：
{
  "narrative": "160~260字第二人称中文剧情反馈",
  "evaluatorNote": "一句现场考官/室长/同伴或媒体的犀利评语",
  "outcomeTier": "必须是 brilliant、steady、risky、flawed 之一",
  "unlockedTag": "4到9个中文字的行为标签，如：无伴奏镇场王牌",
  "statChanges": {
    "vocal": 0,
    "dance": 0,
    "rap": 0,
    "stage": 0,
    "stamina": -10,
    "publicFavor": 4,
    "controversy": 0
  }
}

重要：请只返回纯 JSON 对象，不要输出任何 Markdown 解释文字、思考过程或前后缀，也不要使用 \`\`\`json 代码块包裹。`;

  try {
    const rawText = await callOpenAICompatibleChat({
      apiKey,
      baseUrl,
      model,
      systemInstruction,
      userPrompt: prompt,
      maxTokens: 900,
    });

    const parsed = parseModelJson<{
      narrative?: string;
      evaluatorNote?: string;
      outcomeTier?: string;
      unlockedTag?: string;
      statChanges?: Record<string, unknown>;
    }>(rawText);

    const rawChanges: StatDeltas = {
      vocal: clampStatDelta(parsed.statChanges?.vocal, -8, 10),
      dance: clampStatDelta(parsed.statChanges?.dance, -8, 10),
      rap: clampStatDelta(parsed.statChanges?.rap, -8, 10),
      stage: clampStatDelta(parsed.statChanges?.stage, -8, 12),
      stamina: clampStatDelta(parsed.statChanges?.stamina, -24, 10),
      publicFavor: clampStatDelta(parsed.statChanges?.publicFavor, -12, 16),
      controversy: clampStatDelta(parsed.statChanges?.controversy, -6, 18),
    };

    const appliedDeltas = calculateEffectiveDeltas(
      rawChanges,
      profile.agency,
      isAce,
      actNumber === 1 || actNumber === 2
    );

    const validTiers = new Set(['brilliant', 'steady', 'risky', 'flawed']);
    const outcomeTier = validTiers.has(parsed.outcomeTier ?? '')
      ? (parsed.outcomeTier as 'brilliant' | 'steady' | 'risky' | 'flawed')
      : 'steady';

    return {
      status: 200,
      data: {
        narrative: parsed.narrative || '你在窒息的灯光下完成了自己的选择，现场一片短促的沉默后迅速恢复了秩序。',
        evaluatorNote: parsed.evaluatorNote || '“记住你今天的反应，镜头不会遗忘任何一秒。”',
        outcomeTier,
        unlockedTag: parsed.unlockedTag?.slice(0, 14) || '自主破局者',
        appliedDeltas,
      },
    };
  } catch (error) {
    console.error('[AI evaluate-action error]', error);
    return {
      status: 500,
      data: {
        error: 'AI_GENERATION_FAILED',
        message: '实时推演服务响应异常，已启用本地剧本推演保护流程。',
      },
    };
  }
}

export async function evaluateTheqooPostCore(
  body: TheqooPostPayload | null | undefined
): Promise<CoreHandlerResult> {
  const profile = body?.profile;
  const actionLabel = body?.actionLabel;

  if (!profile || !actionLabel) {
    return {
      status: 400,
      data: { error: '缺少生成热帖所需参数。' },
    };
  }

  const { apiKey, baseUrl, model } = getAiConfig();
  if (!apiKey) {
    return {
      status: 503,
      data: { error: 'AI_API_KEY_UNCONFIGURED' },
    };
  }

  const agency = AGENCY_CONFIGS[profile.agency];
  const track = TRACK_CONFIGS[profile.track];
  const isAce = profile.roleMode === 'ace';
  const nameStr = profile.stageName
    ? `${profile.stageName}（本名${profile.realName}）`
    : profile.realName;

  const systemInstruction = `你是韩国论坛 theqoo 热门贴模拟生成器（全部用自然流畅的中文汉化韩网论坛口吻输出）。
【严禁违背】绝对不要在帖子或评论里捏造玩家具体的五官长相、身高、体重或发色细节，重点聚焦在【15秒上班路姿态动作、所属社滤镜、气质气场、定位实力期待与争议】！
玩家所属社：${agency.name}（${agency.tagline}）
参赛赛道：${track.englishBadge}（${track.title}）
定位：${profile.roleLabel}${isAce ? '（全能 ACE 路线：自带极高话题度与严苛质疑风波）' : ''}
上班路 15 秒真实动作：「${actionLabel}」`;

  const userPrompt = `请为练习生 ${nameStr} 生成一篇凌晨坡州上班路被站姐和娱乐记者抓拍后冲上 theqoo HOT 的热帖，包含帖子标题、正文（120字以内）以及 5 条真实多样的韩国网友评论（既有吹气场/礼貌/会社血统的，也有挑刺质疑或提醒看初舞台实力的）。

请严格按以下 JSON 结构返回结果：
{
  "postTitle": "帖子标题",
  "postBody": "帖子正文（120字以内）",
  "highlightTag": "4~12字高光标签",
  "comments": [
    { "author": "匿名网友 102", "content": "评论内容", "likes": 342 }
  ]
}

重要：请只返回纯 JSON 对象，不要输出任何 Markdown 解释文字、思考过程或前后缀，不要使用 \`\`\`json 代码块包裹。`;

  try {
    const rawText = await callOpenAICompatibleChat({
      apiKey,
      baseUrl,
      model,
      systemInstruction,
      userPrompt,
      maxTokens: 900,
    });

    const parsed = parseModelJson<{
      postTitle?: string;
      postBody?: string;
      highlightTag?: string;
      comments?: Array<{ author?: string; content?: string; likes?: number }>;
    }>(rawText);

    const comments = (parsed.comments ?? []).slice(0, 6).map((c, idx) => ({
      id: idx + 1,
      author: c.author || `匿名网友 ${100 + idx * 73}`,
      content: c.content || '先观望一下初舞台再说。',
      likes: typeof c.likes === 'number' ? clamp(c.likes, 12, 999) : 120 - idx * 15,
      isTop: idx < 2,
    }));

    if (!parsed.postTitle || comments.length === 0) {
      throw new Error('Incomplete AI theqoo post');
    }

    return {
      status: 200,
      data: {
        boardName: 'theqoo · HOT 热门贴',
        postTitle: parsed.postTitle,
        timestamp: '04:28 KST',
        views: '53,410',
        postBody: parsed.postBody,
        highlightTag: parsed.highlightTag || `${agency.name} · ${profile.roleLabel}`,
        comments,
        source: 'ai',
      },
    };
  } catch (error) {
    console.error('[AI theqoo-post error]', error);
    return {
      status: 500,
      data: { error: 'THEQOO_AI_FAILED' },
    };
  }
}

// --- Express / Node IncomingMessage handlers (used by local server.ts & /api/* Vercel endpoints) ---

export async function handleHealth(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (!enforceMethod(req, res, 'GET')) return;
  const result = evaluateHealthCore();
  sendJson(res, result.status, result.data);
}

export async function handleEvaluateAction(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (!enforceMethod(req, res, 'POST')) return;
  const body = await readJsonBody<EvaluateActionPayload>(req);
  const result = await evaluateActionCore(body);
  sendJson(res, result.status, result.data);
}

export async function handleTheqooPost(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (!enforceMethod(req, res, 'POST')) return;
  const body = await readJsonBody<TheqooPostPayload>(req);
  const result = await evaluateTheqooPostCore(body);
  sendJson(res, result.status, result.data);
}

// --- Web Request / Response adapters (used by Netlify Functions v2) ---

function jsonResponse(status: number, data: unknown, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

async function readWebJsonBody<T>(request: Request): Promise<T | null> {
  try {
    const raw = await request.text();
    if (!raw.trim()) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export async function handleHealthWeb(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse(
      405,
      { error: `Method ${request.method || 'UNKNOWN'} Not Allowed` },
      { Allow: 'GET' }
    );
  }
  const result = evaluateHealthCore();
  return jsonResponse(result.status, result.data);
}

export async function handleEvaluateActionWeb(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      405,
      { error: `Method ${request.method || 'UNKNOWN'} Not Allowed` },
      { Allow: 'POST' }
    );
  }
  const body = await readWebJsonBody<EvaluateActionPayload>(request);
  const result = await evaluateActionCore(body);
  return jsonResponse(result.status, result.data);
}

export async function handleTheqooPostWeb(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      405,
      { error: `Method ${request.method || 'UNKNOWN'} Not Allowed` },
      { Allow: 'POST' }
    );
  }
  const body = await readWebJsonBody<TheqooPostPayload>(request);
  const result = await evaluateTheqooPostCore(body);
  return jsonResponse(result.status, result.data);
}
