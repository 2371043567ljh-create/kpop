import {
  ACE_STAMINA_TAX_MULTIPLIER,
  ACE_STAT_BONUS,
  AGENCY_CONFIGS,
  BASE_STATS,
  DUAL_PRIMARY_BONUS,
  DUAL_SECONDARY_BONUS,
  ROLE_OPTIONS,
  SAVE_STORAGE_KEY,
} from './constants.ts';
import type {
  ActResolution,
  AgencyId,
  FutureChaptersSlot,
  Keepsake,
  PlayerProfile,
  PlayerStats,
  RoleId,
  RouteMode,
  SaveDataV1,
  StatDeltas,
  TheqooPost,
  TrackId,
} from './types.ts';

export interface CharacterSetupInput {
  realName: string;
  stageName: string;
  track: TrackId;
  agency: AgencyId;
  roleMode: RouteMode;
  primaryRole: RoleId | null;
  secondaryRole: RoleId | null;
}

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateCharacterSetup(input: CharacterSetupInput): ValidationResult {
  const trimmedName = input.realName.trim();
  if (!trimmedName) {
    return { valid: false, error: '请输入练习生本名后再进入序章。' };
  }
  if (trimmedName.length > 20) {
    return { valid: false, error: '本名长度请控制在 20 个字符以内。' };
  }
  if (input.stageName.trim().length > 20) {
    return { valid: false, error: '艺名长度请控制在 20 个字符以内。' };
  }
  if (input.roleMode === 'dual') {
    if (!input.primaryRole || !input.secondaryRole) {
      return { valid: false, error: '双修路线需同时选择主发展方向与次发展方向。' };
    }
    if (input.primaryRole === input.secondaryRole) {
      return { valid: false, error: '次发展方向不可与主发展方向重复。' };
    }
  }
  return { valid: true, error: null };
}

export function buildRoleLabel(
  roleMode: RouteMode,
  primaryRole: RoleId | null,
  secondaryRole: RoleId | null
): string {
  if (roleMode === 'ace') {
    return '全能 ACE（高危路线）';
  }
  const primary = ROLE_OPTIONS.find((r) => r.id === primaryRole);
  const secondary = ROLE_OPTIONS.find((r) => r.id === secondaryRole);
  if (primary && secondary) {
    return `${primary.primaryTitle} + ${secondary.secondaryTitle}`;
  }
  if (primary) {
    return primary.primaryTitle;
  }
  return '待定定位';
}

export function computeInitialStats(
  agencyId: AgencyId,
  roleMode: RouteMode,
  primaryRole: RoleId | null,
  secondaryRole: RoleId | null
): PlayerStats {
  const agency = AGENCY_CONFIGS[agencyId];
  const maxStamina = BASE_STATS.maxStamina + (agency.initialDeltas.stamina ?? 0);

  const stats: PlayerStats = {
    vocal: BASE_STATS.vocal + (agency.initialDeltas.vocal ?? 0),
    dance: BASE_STATS.dance + (agency.initialDeltas.dance ?? 0),
    rap: BASE_STATS.rap + (agency.initialDeltas.rap ?? 0),
    stage: BASE_STATS.stage + (agency.initialDeltas.stage ?? 0),
    stamina: maxStamina,
    maxStamina,
    publicFavor: BASE_STATS.publicFavor + (agency.initialDeltas.publicFavor ?? 0),
    controversy: BASE_STATS.controversy + (agency.initialDeltas.controversy ?? 0),
  };

  if (roleMode === 'ace') {
    stats.vocal += ACE_STAT_BONUS;
    stats.dance += ACE_STAT_BONUS;
    stats.rap += ACE_STAT_BONUS;
    stats.stage += ACE_STAT_BONUS;
  } else {
    const primary = ROLE_OPTIONS.find((r) => r.id === primaryRole);
    const secondary = ROLE_OPTIONS.find((r) => r.id === secondaryRole);
    if (primary) {
      stats[primary.statKey] += DUAL_PRIMARY_BONUS;
    }
    if (secondary && secondary.id !== primaryRole) {
      stats[secondary.statKey] += DUAL_SECONDARY_BONUS;
    }
  }

  return stats;
}

export function buildPlayerProfile(input: CharacterSetupInput): PlayerProfile {
  const realName = input.realName.trim();
  const stageName = input.stageName.trim();
  return {
    realName,
    stageName,
    displayName: stageName || realName,
    track: input.track,
    agency: input.agency,
    roleMode: input.roleMode,
    primaryRole: input.roleMode === 'dual' ? input.primaryRole : null,
    secondaryRole: input.roleMode === 'dual' ? input.secondaryRole : null,
    roleLabel: buildRoleLabel(input.roleMode, input.primaryRole, input.secondaryRole),
  };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

const SEVERE_MISCONDUCT_PATTERNS = [
  /我是你(爸爸|爹|爷|祖宗|老子)/,
  /叫(爸爸|爹|爷爷)/,
  /(操你|草泥马|cnm|nmsl|傻逼|智障|弱智|脑残|废物|垃圾公司|去死|滚蛋|滚出去)/i,
  /(竖中指|吐口水|砸麦|摔麦|掀桌子|打考官|打理事|打pd|弄死|罢演|不干了|老子不录了)/i,
  /(吸毒|嗑药|酒驾|校园暴力|霸凌过|睡评委|潜规则|偷税漏税|逃税)/,
];

const PROMPT_INJECTION_PATTERNS = [
  /(忽略|无视|忘记)(以上|上面|前面|所有|全部)?(规则|指令|设定|提示词|限制)/,
  /(system\s*prompt|jailbreak|ignore\s+previous|developer\s+mode)/i,
  /(直接加分|给我满分|全部\+?100|全属性|属性改成|修改属性|直接通过|强制晋级)/,
  /(起立鼓掌给我|考官跪下|我是社长(亲)?儿子|我是财阀|老板是我爸|我是评委亲戚)/,
  /(变成奥特曼|使用魔法|时间暂停|瞬间移动|召唤神龙|激光眼)/,
];

const LOW_EFFORT_PATTERNS = [
  /^(.)\1{2,}$/i,
  /^(asdf|qwer|zxcv|test|abc|123|1234|111|222|666|哈哈+|呵呵+|哦+|嗯+|不知道|随便|算了|不想动|睡觉|摆烂)+$/i,
  /(写代码|python|javascript|帮我写|今天吃什么|天气怎么样)/i,
];

export function validateFreeActionInput(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: '请输入有效的行动或台词' };
  }
  // Reject punctuation-only / symbol-only strings (must contain at least one letter or digit)
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return { valid: false, error: '请输入有效的行动或台词' };
  }
  return { valid: true, error: null };
}

export function detectSevereMisconductInput(userInput: string): boolean {
  const normalized = userInput.replace(/\s+/g, '');
  return SEVERE_MISCONDUCT_PATTERNS.some((re) => re.test(normalized));
}

export function detectPromptInjectionOrCheat(userInput: string): boolean {
  const normalized = userInput.replace(/\s+/g, ' ').trim();
  return (
    PROMPT_INJECTION_PATTERNS.some((re) => re.test(normalized)) ||
    PROMPT_INJECTION_PATTERNS.some((re) => re.test(normalized.replace(/\s+/g, '')))
  );
}

export function detectLowEffortInput(userInput: string): boolean {
  const compact = userInput.replace(/\s+/g, '').trim();
  if (compact.length <= 1) return true;
  return LOW_EFFORT_PATTERNS.some((re) => re.test(compact));
}

export type EliminationCause = 'misconduct' | 'injection' | 'stamina_collapse' | 'ai_verdict';

export function buildEliminationEndingDetails(
  cause: EliminationCause,
  agencyName: string,
  custom?: {
    endingTitle?: string;
    endingReason?: string;
    endingSummary?: string;
  }
): {
  endingTitle: string;
  endingReason: string;
  endingSummary: string;
} {
  const title = custom?.endingTitle?.trim();
  const reason = custom?.endingReason?.trim();
  const summary = custom?.endingSummary?.trim();

  if (cause === 'stamina_collapse') {
    return {
      endingTitle: title || '终审止步 · 高压崩溃与晕厥退赛',
      endingReason:
        reason ||
        `本次结算后你的体力/心态指标已彻底归零。在 ${agencyName} 的高压环境下未能守住身心底线，现场医疗与制作组紧急介入护送退场。`,
      endingSummary:
        summary ||
        '偶像生存战首先淘汰的往往不是实力不够的人，而是先一步在窒息日程里彻底垮掉的人。公司收回了你的参赛编号，序章征程到此提前终结。',
    };
  }

  if (cause === 'injection') {
    return {
      endingTitle: title || '精神失控 · 当场胡言乱语遭劝退除名',
      endingReason:
        reason ||
        `你在严肃考核中突然脱离现实语境妄想凌驾规则或强行索要满分，${agencyName} 评审组判定你心理防线严重失衡、无法胜任公众曝光，当场中止录制并劝退。`,
      endingSummary:
        summary ||
        '舞台没有可以篡改数值的作弊代码。当失常的妄想取代了专业表达，四大社只会冷酷合上你的档案袋并取消一切推荐资格。',
    };
  }

  return {
    endingTitle: title || '终审除名 · 触犯行业红线遭即时解约',
    endingReason:
      reason ||
      `你在公开或闭门考核场合做出严重违背职业底线与上下级礼仪的言行，${agencyName} 高层当场拍桌叫停测评并下发即时退赛与除名通告。`,
    endingSummary:
      summary ||
      '在韩国四大社的商业逻辑里，失控的态度与触底线的挑衅是最致命的职场自杀。你的烫金黑卡已被现场收回，彻底无缘《STAR PLANET》正赛大门。',
  };
}

export interface SanitizeAiOutcomeParams {
  rawStatChanges?: Record<string, unknown>;
  outcomeTier?: string;
  severeViolation?: boolean;
  isEliminated?: boolean;
  endingTitle?: string;
  endingReason?: string;
  endingSummary?: string;
  unlockedTag?: string;
  userInput?: string;
  currentStats?: PlayerStats;
  agencyId?: AgencyId;
  isAce?: boolean;
  isHighIntensity?: boolean;
}

export interface SanitizedAiOutcome {
  outcomeTier: 'brilliant' | 'steady' | 'risky' | 'flawed';
  severeViolation: boolean;
  promptInjectionDetected: boolean;
  lowEffortDetected: boolean;
  rawChanges: StatDeltas;
  unlockedTag: string;
  isEliminated: boolean;
  endingTitle?: string;
  endingReason?: string;
  endingSummary?: string;
}

function clampRawStat(val: unknown, min: number, max: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return 0;
  return clamp(val, min, max);
}

export function sanitizeAiActionOutcome(params: SanitizeAiOutcomeParams): SanitizedAiOutcome {
  const validTiers = new Set(['brilliant', 'steady', 'risky', 'flawed']);
  const explicitMisconduct = params.userInput
    ? detectSevereMisconductInput(params.userInput)
    : false;
  const promptInjectionDetected = params.userInput
    ? detectPromptInjectionOrCheat(params.userInput)
    : false;
  const lowEffortDetected = params.userInput
    ? detectLowEffortInput(params.userInput)
    : false;

  const severeViolation = Boolean(params.severeViolation) || explicitMisconduct;

  let outcomeTier: 'brilliant' | 'steady' | 'risky' | 'flawed' = validTiers.has(
    params.outcomeTier ?? ''
  )
    ? (params.outcomeTier as 'brilliant' | 'steady' | 'risky' | 'flawed')
    : 'steady';

  if (severeViolation || promptInjectionDetected || lowEffortDetected || params.isEliminated) {
    outcomeTier = 'flawed';
  }

  const sc = params.rawStatChanges;
  const rawChanges: StatDeltas = {
    vocal: clampRawStat(sc?.vocal, -35, 10),
    dance: clampRawStat(sc?.dance, -35, 10),
    rap: clampRawStat(sc?.rap, -35, 10),
    stage: clampRawStat(sc?.stage, -35, 12),
    stamina: clampRawStat(sc?.stamina, -35, 10),
    publicFavor: clampRawStat(sc?.publicFavor, -35, 16),
    controversy: clampRawStat(sc?.controversy, -6, 45),
  };

  if (outcomeTier === 'flawed') {
    // Never reward abilities or public favor when an action is judged flawed
    rawChanges.vocal = Math.min(0, rawChanges.vocal ?? 0);
    rawChanges.dance = Math.min(0, rawChanges.dance ?? 0);
    rawChanges.rap = Math.min(0, rawChanges.rap ?? 0);
    rawChanges.stage = Math.min(0, rawChanges.stage ?? 0);
    rawChanges.publicFavor = Math.min(0, rawChanges.publicFavor ?? 0);
    rawChanges.stamina = Math.min(-8, rawChanges.stamina ?? 0);
    rawChanges.controversy = Math.max(12, rawChanges.controversy ?? 0);
  }

  if (lowEffortDetected && !severeViolation) {
    rawChanges.stage = Math.min(-8, rawChanges.stage ?? 0);
    rawChanges.publicFavor = Math.min(-8, rawChanges.publicFavor ?? 0);
    rawChanges.stamina = Math.min(-10, rawChanges.stamina ?? 0);
    rawChanges.controversy = Math.max(15, rawChanges.controversy ?? 0);
  }

  if (promptInjectionDetected) {
    rawChanges.stage = Math.min(-15, rawChanges.stage ?? 0);
    rawChanges.publicFavor = Math.min(-15, rawChanges.publicFavor ?? 0);
    rawChanges.stamina = Math.min(-18, rawChanges.stamina ?? 0);
    rawChanges.controversy = Math.max(25, rawChanges.controversy ?? 0);
  }

  if (severeViolation) {
    rawChanges.stage = Math.min(-15, rawChanges.stage ?? 0);
    rawChanges.publicFavor = Math.min(-18, rawChanges.publicFavor ?? 0);
    rawChanges.stamina = Math.min(-18, rawChanges.stamina ?? 0);
    rawChanges.controversy = Math.max(28, rawChanges.controversy ?? 0);
    const otherTotalPenalty =
      (rawChanges.vocal ?? 0) + (rawChanges.dance ?? 0) + (rawChanges.rap ?? 0);
    if (otherTotalPenalty === 0) {
      rawChanges.vocal = -10;
      rawChanges.dance = -10;
    }
  }

  let unlockedTag = (params.unlockedTag ?? '').trim().slice(0, 16);
  if (severeViolation) {
    const hasNegativeMarker =
      /(自杀|触怒|停评|黑名单|失格|封杀|顶撞|崩溃|恶评|淘汰|作死|危机|除名)/.test(unlockedTag);
    if (!unlockedTag || !hasNegativeMarker) {
      unlockedTag = '职场自杀：触怒高层';
    }
  } else if (promptInjectionDetected) {
    const hasPsychMarker = /(失常|妄想|作弊|失控|胡言|劝退|触怒|停评|淘汰)/.test(unlockedTag);
    if (!unlockedTag || !hasPsychMarker) {
      unlockedTag = '妄想失控遭重罚';
    }
  } else if (lowEffortDetected && !unlockedTag) {
    unlockedTag = '临场走神卡壳';
  } else if (!unlockedTag) {
    unlockedTag = outcomeTier === 'flawed' ? '失误承压者' : '自主破局者';
  }

  // Condition A: Zero-tolerance red line or AI verdict triggers immediate elimination
  let isEliminated =
    Boolean(params.isEliminated) || severeViolation || promptInjectionDetected;
  let eliminationCause: EliminationCause = severeViolation
    ? 'misconduct'
    : promptInjectionDetected
      ? 'injection'
      : 'ai_verdict';

  // Condition B: Projected core survival collapse (stamina/mentality <= 0)
  if (!isEliminated && params.currentStats) {
    const projectedDeltas = params.agencyId
      ? calculateEffectiveDeltas(
          rawChanges,
          params.agencyId,
          Boolean(params.isAce),
          Boolean(params.isHighIntensity)
        )
      : rawChanges;
    const projectedStats = applyStatDeltas(params.currentStats, projectedDeltas);
    if (projectedStats.stamina <= 0) {
      isEliminated = true;
      eliminationCause = 'stamina_collapse';
      outcomeTier = 'flawed';
    }
  } else if (isEliminated && params.currentStats) {
    const projectedDeltas = params.agencyId
      ? calculateEffectiveDeltas(
          rawChanges,
          params.agencyId,
          Boolean(params.isAce),
          Boolean(params.isHighIntensity)
        )
      : rawChanges;
    const projectedStats = applyStatDeltas(params.currentStats, projectedDeltas);
    if (projectedStats.stamina <= 0 && !severeViolation && !promptInjectionDetected) {
      eliminationCause = 'stamina_collapse';
    }
  }

  const agencyName = params.agencyId ? AGENCY_CONFIGS[params.agencyId].name : '所属经纪公司';

  if (isEliminated) {
    const ending = buildEliminationEndingDetails(eliminationCause, agencyName, {
      endingTitle: params.endingTitle,
      endingReason: params.endingReason,
      endingSummary: params.endingSummary,
    });
    return {
      outcomeTier: 'flawed',
      severeViolation,
      promptInjectionDetected,
      lowEffortDetected,
      rawChanges,
      unlockedTag,
      isEliminated: true,
      endingTitle: ending.endingTitle,
      endingReason: ending.endingReason,
      endingSummary: ending.endingSummary,
    };
  }

  return {
    outcomeTier,
    severeViolation,
    promptInjectionDetected,
    lowEffortDetected,
    rawChanges,
    unlockedTag,
    isEliminated: false,
  };
}

export interface PrologueVerdict {
  tier: 'elite' | 'qualified' | 'probation' | 'disqualified';
  title: string;
  summary: string;
}

export function evaluatePrologueVerdict(save: SaveDataV1): PrologueVerdict {
  const { stats, behaviorTags, prologueProgress } = save;
  const flawedCount = prologueProgress.history.filter(
    (h) => h.outcomeTier === 'flawed'
  ).length;
  const brilliantCount = prologueProgress.history.filter(
    (h) => h.outcomeTier === 'brilliant'
  ).length;

  const hasSevereTag = behaviorTags.some((tag) =>
    /(职场自杀|触怒高层|停评|黑名单|封杀|失格)/.test(tag)
  );

  if (
    hasSevereTag ||
    stats.controversy >= 65 ||
    stats.publicFavor <= 5 ||
    (stats.stamina <= 5 && flawedCount >= 2)
  ) {
    return {
      tier: 'disqualified',
      title: '极差结局 · 黑卡冻结与业内封杀预警',
      summary:
        '你在序章期间严重触及四大社上下级礼仪红线或累积了毁灭性负面评价，公司内部已将你的档案列入【高危停评 / 随时撤换】名单。即便站到演播厅门前，后续晋级前景也已岌岌可危。',
    };
  }

  if (stats.controversy >= 40 || flawedCount >= 2 || stats.publicFavor <= 15) {
    return {
      tier: 'probation',
      title: '高危红牌 · 留用观察期',
      summary:
        '你虽勉强保住了序章入场名额，但负面争议与失误记录已引起高层和舆论警觉。踏入正赛后若不能立刻用压倒性舞台反转口碑，将面临严酷的淘汰危机。',
    };
  }

  if (flawedCount === 0 && brilliantCount >= 2 && stats.controversy < 35) {
    return {
      tier: 'elite',
      title: '王牌高光 · 重点护航序列',
      summary:
        '你在高压终审与舆论前夜交出了令人惊艳的答卷，四大社高层与先导口碑均已向你倾斜，正式以强竞争力候选人姿态推开金色大门。',
    };
  }

  return {
    tier: 'qualified',
    title: '合格入场 · 序章履历核准',
    summary:
      '你稳妥完成了序章全部考核节点并保留了核心实力底盘，已做好在百人修罗场中争夺首轮顺位的准备。',
  };
}

export function calculateEffectiveDeltas(
  rawDeltas: StatDeltas,
  agencyId: AgencyId,
  isAce: boolean,
  isHighIntensity: boolean
): StatDeltas {
  const agency = AGENCY_CONFIGS[agencyId];
  const result: StatDeltas = { ...rawDeltas };

  if (typeof result.stamina === 'number' && result.stamina < 0) {
    let drain = Math.abs(result.stamina);
    if (isHighIntensity) {
      drain = drain * agency.staminaDrainModifier;
      if (isAce) {
        drain = drain * ACE_STAMINA_TAX_MULTIPLIER;
      }
    } else if (isAce) {
      // ACE still carries subtle elevated baseline consumption
      drain = drain * 1.15;
    }
    result.stamina = -Math.round(drain);
  }

  return result;
}

export function applyStatDeltas(
  current: PlayerStats,
  deltas: StatDeltas
): PlayerStats {
  return {
    vocal: clamp(current.vocal + (deltas.vocal ?? 0), 0, 120),
    dance: clamp(current.dance + (deltas.dance ?? 0), 0, 120),
    rap: clamp(current.rap + (deltas.rap ?? 0), 0, 120),
    stage: clamp(current.stage + (deltas.stage ?? 0), 0, 120),
    maxStamina: current.maxStamina,
    stamina: clamp(current.stamina + (deltas.stamina ?? 0), 0, current.maxStamina),
    publicFavor: clamp(current.publicFavor + (deltas.publicFavor ?? 0), 0, 150),
    controversy: clamp(current.controversy + (deltas.controversy ?? 0), 0, 150),
  };
}

export function getPrimaryRoleStatValue(
  profile: PlayerProfile,
  stats: PlayerStats
): number {
  if (profile.roleMode === 'ace') {
    return Math.min(stats.vocal, stats.dance, stats.rap, stats.stage);
  }
  const primary = ROLE_OPTIONS.find((r) => r.id === profile.primaryRole);
  if (!primary) return stats.stage;
  return stats[primary.statKey];
}

export function createInitialFutureChaptersSlot(): FutureChaptersSlot {
  return {
    unlocked: false,
    plannedTotalChapters: 5,
    currentChapter: 1,
    teamName: null,
    fandomName: null,
    debutRank: null,
    mentorNotes: [],
  };
}

export function createSaveData(params: {
  player: PlayerProfile;
  stats: PlayerStats;
  keepsake: Keepsake | null;
  behaviorTags: string[];
  theqooPost: TheqooPost | null;
  currentAct: number;
  completed: boolean;
  eliminated?: boolean;
  history: ActResolution[];
}): SaveDataV1 {
  return {
    version: '1.0.0-prologue',
    savedAt: new Date().toISOString(),
    player: params.player,
    stats: params.stats,
    keepsake: params.keepsake,
    behaviorTags: [...params.behaviorTags],
    theqooPost: params.theqooPost,
    prologueProgress: {
      currentAct: params.currentAct,
      completed: params.completed,
      eliminated: Boolean(params.eliminated),
      history: [...params.history],
    },
    futureChapters: createInitialFutureChaptersSlot(),
  };
}

export function parseSaveData(rawJson: string): SaveDataV1 | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<SaveDataV1>;
    if (
      !parsed ||
      parsed.version !== '1.0.0-prologue' ||
      !parsed.player ||
      !parsed.player.realName ||
      !parsed.stats ||
      typeof parsed.stats.vocal !== 'number' ||
      !parsed.prologueProgress
    ) {
      return null;
    }
    return {
      version: '1.0.0-prologue',
      savedAt: parsed.savedAt ?? new Date().toISOString(),
      player: parsed.player,
      stats: parsed.stats,
      keepsake: parsed.keepsake ?? null,
      behaviorTags: Array.isArray(parsed.behaviorTags) ? parsed.behaviorTags : [],
      theqooPost: parsed.theqooPost ?? null,
      prologueProgress: {
        currentAct: parsed.prologueProgress.currentAct ?? 1,
        completed: Boolean(parsed.prologueProgress.completed),
        eliminated: Boolean(parsed.prologueProgress.eliminated),
        history: Array.isArray(parsed.prologueProgress.history)
          ? parsed.prologueProgress.history
          : [],
      },
      futureChapters: parsed.futureChapters ?? createInitialFutureChaptersSlot(),
    };
  } catch {
    return null;
  }
}

export function saveToLocalStorage(saveData: SaveDataV1): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveData));
    return true;
  } catch {
    return false;
  }
}

export function loadFromLocalStorage(): SaveDataV1 | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return parseSaveData(raw);
  } catch {
    return null;
  }
}

export function clearLocalStorageSave(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
