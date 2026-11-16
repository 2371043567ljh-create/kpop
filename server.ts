import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { AGENCY_CONFIGS, TRACK_CONFIGS } from './src/game/constants';
import { calculateEffectiveDeltas, clamp } from './src/game/rules';
import type { PlayerProfile, PlayerStats, StatDeltas } from './src/game/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function clampStatDelta(val: unknown, min: number, max: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return clamp(val, min, max);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: Boolean(getGeminiClient()) });
  });

  app.post('/api/ai/evaluate-action', async (req, res) => {
    const {
      profile,
      stats,
      actNumber,
      sceneTitle,
      dilemmaPrompt,
      userInput,
    } = req.body as {
      profile: PlayerProfile;
      stats: PlayerStats;
      actNumber: number;
      sceneTitle: string;
      dilemmaPrompt: string;
      userInput: string;
    };

    if (!profile || !stats || !userInput || !userInput.trim()) {
      res.status(400).json({ error: '缺少必要角色信息或自定义行动内容。' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY_UNCONFIGURED',
        message: '未检测到可用的 Gemini API 密钥，已为您切换本地剧本推演兜底。',
      });
      return;
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

    const prompt = `当前幕次：第 ${actNumber} 幕《${sceneTitle}》
练习生：${profile.displayName}（本名：${profile.realName}）
当前数值：Vocal ${stats.vocal} / Dance ${stats.dance} / Rap ${stats.rap} / Stage ${stats.stage} / 体力 ${stats.stamina}/${stats.maxStamina} / 路人缘 ${stats.publicFavor} / 争议度 ${stats.controversy}
当前困境：${dilemmaPrompt}
玩家自由行动/台词：「${userInput.trim().slice(0, 300)}」

请返回结构化 JSON 结果。`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              narrative: { type: Type.STRING, description: '160-260字第二人称中文剧情反馈' },
              evaluatorNote: { type: Type.STRING, description: '一句现场考官/室长/同伴或媒体的犀利评语' },
              outcomeTier: {
                type: Type.STRING,
                description: '必须是 brilliant, steady, risky, flawed 之一',
              },
              unlockedTag: {
                type: Type.STRING,
                description: '4到9个中文字的行为标签，如：无伴奏镇场王牌',
              },
              statChanges: {
                type: Type.OBJECT,
                properties: {
                  vocal: { type: Type.INTEGER },
                  dance: { type: Type.INTEGER },
                  rap: { type: Type.INTEGER },
                  stage: { type: Type.INTEGER },
                  stamina: { type: Type.INTEGER },
                  publicFavor: { type: Type.INTEGER },
                  controversy: { type: Type.INTEGER },
                },
                required: ['vocal', 'dance', 'rap', 'stage', 'stamina', 'publicFavor', 'controversy'],
              },
            },
            required: ['narrative', 'evaluatorNote', 'outcomeTier', 'unlockedTag', 'statChanges'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as {
        narrative?: string;
        evaluatorNote?: string;
        outcomeTier?: string;
        unlockedTag?: string;
        statChanges?: Record<string, unknown>;
      };

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

      res.json({
        narrative: parsed.narrative || '你在窒息的灯光下完成了自己的选择，现场一片短促的沉默后迅速恢复了秩序。',
        evaluatorNote: parsed.evaluatorNote || '“记住你今天的反应，镜头不会遗忘任何一秒。”',
        outcomeTier,
        unlockedTag: parsed.unlockedTag?.slice(0, 14) || '自主破局者',
        appliedDeltas,
      });
    } catch (error) {
      console.error('[Gemini evaluate-action error]', error);
      res.status(500).json({
        error: 'AI_GENERATION_FAILED',
        message: '实时推演服务响应异常，已启用本地剧本推演保护流程。',
      });
    }
  });

  app.post('/api/ai/theqoo-post', async (req, res) => {
    const { profile, actionLabel } = req.body as {
      profile: PlayerProfile;
      actionLabel: string;
    };

    if (!profile || !actionLabel) {
      res.status(400).json({ error: '缺少生成热帖所需参数。' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY_UNCONFIGURED' });
      return;
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

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `请为练习生 ${nameStr} 生成一篇凌晨坡州上班路被站姐和娱乐记者抓拍后冲上 theqoo HOT 的热帖，包含帖子标题、正文（120字以内）以及 5 条真实多样的韩国网友评论（既有吹气场/礼貌/会社血统的，也有挑刺质疑或提醒看初舞台实力的）。`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              postTitle: { type: Type.STRING },
              postBody: { type: Type.STRING },
              highlightTag: { type: Type.STRING },
              comments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    author: { type: Type.STRING },
                    content: { type: Type.STRING },
                    likes: { type: Type.INTEGER },
                  },
                  required: ['author', 'content', 'likes'],
                },
              },
            },
            required: ['postTitle', 'postBody', 'highlightTag', 'comments'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        postTitle?: string;
        postBody?: string;
        highlightTag?: string;
        comments?: Array<{ author?: string; content?: string; likes?: number }>;
      };

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

      res.json({
        boardName: 'theqoo · HOT 热门贴',
        postTitle: parsed.postTitle,
        timestamp: '04:28 KST',
        views: '53,410',
        postBody: parsed.postBody,
        highlightTag: parsed.highlightTag || `${agency.name} · ${profile.roleLabel}`,
        comments,
        source: 'ai',
      });
    } catch (error) {
      console.error('[Gemini theqoo-post error]', error);
      res.status(500).json({ error: 'THEQOO_AI_FAILED' });
    }
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`STAR PLANET server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
