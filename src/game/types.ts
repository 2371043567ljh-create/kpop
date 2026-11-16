export type TrackId = 'boy' | 'girl';

export type AgencyId = 'sm' | 'hybe' | 'jyp' | 'yg';

export type RoleId = 'vocal' | 'dance' | 'rap' | 'stage';

export type RouteMode = 'dual' | 'ace';

export type GameScreenState = 'title' | 'creating' | 'playing' | 'finished';

export type OutcomeTier = 'brilliant' | 'steady' | 'risky' | 'flawed';

export interface PlayerProfile {
  realName: string;
  stageName: string;
  displayName: string;
  track: TrackId;
  agency: AgencyId;
  roleMode: RouteMode;
  primaryRole: RoleId | null;
  secondaryRole: RoleId | null;
  roleLabel: string;
}

export interface PlayerStats {
  vocal: number;
  dance: number;
  rap: number;
  stage: number;
  stamina: number;
  maxStamina: number;
  publicFavor: number;
  controversy: number;
}

export interface StatDeltas {
  vocal?: number;
  dance?: number;
  rap?: number;
  stage?: number;
  stamina?: number;
  publicFavor?: number;
  controversy?: number;
}

export interface Keepsake {
  id: string;
  name: string;
  origin: string;
  description: string;
  imprint: string;
}

export interface TheqooComment {
  id: number;
  author: string;
  content: string;
  likes: number;
  isTop?: boolean;
}

export interface TheqooPost {
  boardName: string;
  postTitle: string;
  timestamp: string;
  views: string;
  postBody: string;
  highlightTag: string;
  comments: TheqooComment[];
  source: 'ai' | 'scripted';
}

export interface ActChoice {
  id: string;
  label: string;
  subHint: string;
  strategyType: 'precision' | 'bold' | 'composed' | 'guarded';
  isHighIntensity: boolean;
  aceWarning?: string;
}

export interface ActResolution {
  actNumber: number;
  actTitle: string;
  actionLabel: string;
  isCustomAction: boolean;
  narrative: string;
  evaluatorNote: string;
  appliedDeltas: StatDeltas;
  unlockedTag: string | null;
  outcomeTier: OutcomeTier;
  keepsakeAwarded?: Keepsake;
  theqooPost?: TheqooPost;
}

export interface ActSceneData {
  actNumber: number;
  title: string;
  subtitle: string;
  timeLocation: string;
  backdropUrl: string;
  paragraphs: string[];
  dilemmaPrompt: string;
  choices: ActChoice[];
  customPlaceholder: string;
}

export interface FutureChaptersSlot {
  unlocked: boolean;
  plannedTotalChapters: number;
  currentChapter: number;
  teamName: string | null;
  fandomName: string | null;
  debutRank: number | null;
  mentorNotes: string[];
}

export interface SaveDataV1 {
  version: '1.0.0-prologue';
  savedAt: string;
  player: PlayerProfile;
  stats: PlayerStats;
  keepsake: Keepsake | null;
  behaviorTags: string[];
  theqooPost: TheqooPost | null;
  prologueProgress: {
    currentAct: number;
    completed: boolean;
    history: ActResolution[];
  };
  futureChapters: FutureChaptersSlot;
}
