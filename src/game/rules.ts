import {
  ACE_STAMINA_TAX_MULTIPLIER,
  ACE_STAT_BONUS,
  AGENCY_CONFIGS,
  BASE_STATS,
  DUAL_PRIMARY_BONUS,
  DUAL_SECONDARY_BONUS,
  ROLE_OPTIONS,
  SAVE_STORAGE_KEY,
} from './constants';
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
} from './types';

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
