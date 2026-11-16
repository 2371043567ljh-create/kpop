import type { AgencyId, RoleId, StatDeltas, TrackId } from './types';

export const SAVE_STORAGE_KEY = 'star_planet_prologue_save_v1';

export const SCENE_BACKDROPS = {
  title: '/src/assets/images/title_stage_bg_1794801154831.jpg',
  audition: '/src/assets/images/act_audition_bg_1794801155215.jpg',
  rooftop: '/src/assets/images/act_rooftop_bg_1794801155851.jpg',
  arrival: '/src/assets/images/act_arrival_bg_1794801157173.jpg',
} as const;

export interface TrackConfig {
  id: TrackId;
  title: string;
  englishBadge: string;
  subtitle: string;
  traineeTerm: string;
  peerTitle: string;
  mentorHonorific: string;
  fansiteTone: string;
}

export const TRACK_CONFIGS: Record<TrackId, TrackConfig> = {
  boy: {
    id: 'boy',
    title: '男团选秀赛道',
    englishBadge: 'BOY PLANET',
    subtitle: '高强度刀群舞、力量感音域与全球男团生存战',
    traineeTerm: '男练习生',
    peerTitle: '兄弟 / 前辈',
    mentorHonorific: '前辈',
    fansiteTone: '硬朗轮廓与冷峻压迫感',
  },
  girl: {
    id: 'girl',
    title: '女团选秀赛道',
    englishBadge: 'GIRL PLANET',
    subtitle: '极致表现力、清亮音色掌控与全球女团生存战',
    traineeTerm: '女练习生',
    peerTitle: '姐妹 / 前辈',
    mentorHonorific: '欧尼 / 前辈',
    fansiteTone: '凌厉气场与精致氛围感',
  },
};

export interface AgencyConfig {
  id: AgencyId;
  name: string;
  koreanName: string;
  tagline: string;
  location: string;
  directorTitle: string;
  directorLine: string;
  bonusSummary: string;
  costSummary: string;
  initialDeltas: StatDeltas;
  staminaDrainModifier: number;
  accentColor: string;
  emblemCode: string;
}

export const AGENCY_CONFIGS: Record<AgencyId, AgencyConfig> = {
  sm: {
    id: 'sm',
    name: 'SM Entertainment',
    koreanName: '圣水洞 · 旷野声乐殿堂',
    tagline: '极致音准与“SM 血统”的窒息标尺',
    location: '首尔圣水洞旷野总部 · 全透明玻璃声乐测评室',
    directorTitle: 'SM 艺人开发本部理事',
    directorLine: '圣水洞不需要“差不多”，哪怕半个音分的抖动，在镜头前都会被视为家族血统的失格。',
    bonusSummary: '初始 Vocal +18、Stage +10，自带高关注度与顶尖声乐滤镜',
    costSummary: '外界标准最苛刻、内部竞争窒息，稍有瑕疵便会被群嘲“名不副实”（初始争议 +5）',
    initialDeltas: { vocal: 18, stage: 10, controversy: 5 },
    staminaDrainModifier: 1.0,
    accentColor: '#EC4899',
    emblemCode: 'KWANGYA · VOCAL ARCHIVE',
  },
  hybe: {
    id: 'hybe',
    name: 'HYBE',
    koreanName: '龙山区 · 全球叙事与群舞引擎',
    tagline: '精密动线、海外传播与极限体能压榨',
    location: '首尔龙山总部 · 暗色调无窗高密度动作捕捉测评厅',
    directorTitle: 'HYBE 表演制作总管室长',
    directorLine: '全球镜头只看 0.1 秒的齐舞切面与情绪叙事，至于肺部是不是像着火——那是你自己的事。',
    bonusSummary: '初始 Dance +18、Stage +10，海外视角与舞台动线掌控力突出',
    costSummary: '训练强度极大导致体力上限与恢复承压（体力上限 -10），本土易被挑刺“重编舞轻生唱”',
    initialDeltas: { dance: 18, stage: 10, stamina: -10 },
    staminaDrainModifier: 1.12,
    accentColor: '#A855F7',
    emblemCode: 'YONGSAN · CHOREO ENGINE',
  },
  jyp: {
    id: 'jyp',
    name: 'JYP Entertainment',
    koreanName: '江东区 · 真诚能量与人品哲学',
    tagline: '全开麦底气、有机能量与零容错的道德放大镜',
    location: '首尔城内洞原木总部 · 零修音直面镜面试室',
    directorTitle: 'JYP 本部首席训练室长',
    directorLine: '镜头最能照出一个人眼里有没有光，也最残酷——一旦被发现任何虚伪或态度松懈，反噬会比别人凶十倍。',
    bonusSummary: '初始 路人缘 +20、四维属性均衡扎实（全属性 +7），极易通过真诚度吸粉',
    costSummary: '选曲造型偶有保守争议，一旦出现态度或表情管理失误将触发剧烈舆论反噬',
    initialDeltas: { vocal: 7, dance: 7, rap: 7, stage: 7, publicFavor: 20 },
    staminaDrainModifier: 1.0,
    accentColor: '#38BDF8',
    emblemCode: 'ORGANIC · SINCERITY LAB',
  },
  yg: {
    id: 'yg',
    name: 'YG Entertainment',
    koreanName: '麻浦区 · 街头 Swag 与孤注一掷',
    tagline: '炸场气场、个人节奏主权与漫长雪藏后的最后赌注',
    location: '首尔合井洞黑金地下录音棚 · 低音炮震颤的暗室',
    directorTitle: 'YG 制作局资深 A&R 室长',
    directorLine: '公司等不起下一个平庸的练习生了。站上去就把场子烧掉——烧不掉，就彻底被淘汰。',
    bonusSummary: '初始 Rap +18、Stage +12，稀缺个人台风与镜头压迫感极强',
    costSummary: '背负漫长等待的最后赌注压力，传统刀群舞配合度较低，若实力不够稳会被嘲“装酷”（初始争议 +5）',
    initialDeltas: { rap: 18, stage: 12, controversy: 5 },
    staminaDrainModifier: 1.05,
    accentColor: '#F59E0B',
    emblemCode: 'HAPJEONG · BLACK GOLD',
  },
};

export interface RoleOptionConfig {
  id: RoleId;
  primaryTitle: string;
  secondaryTitle: string;
  statKey: 'vocal' | 'dance' | 'rap' | 'stage';
  statLabel: string;
  primaryDesc: string;
  secondaryDesc: string;
}

export const ROLE_OPTIONS: RoleOptionConfig[] = [
  {
    id: 'vocal',
    primaryTitle: '主唱',
    secondaryTitle: '领唱',
    statKey: 'vocal',
    statLabel: 'Vocal',
    primaryDesc: 'Main Vocal · 音域壁垒与高潮段落绝对统治力（Vocal +22）',
    secondaryDesc: 'Lead Vocal · 稳定声线与副歌托底能力（Vocal +12）',
  },
  {
    id: 'dance',
    primaryTitle: '主舞',
    secondaryTitle: '领舞',
    statKey: 'dance',
    statLabel: 'Dance',
    primaryDesc: 'Main Dancer · 肢体精度、质感爆发与编舞核心（Dance +22）',
    secondaryDesc: 'Lead Dancer · 队形卡点与动态协调度（Dance +12）',
  },
  {
    id: 'rap',
    primaryTitle: '主 Rap',
    secondaryTitle: '副 Rap',
    statKey: 'rap',
    statLabel: 'Rap',
    primaryDesc: 'Main Rapper · Flow 切割、咬字气势与词作掌控（Rap +22）',
    secondaryDesc: 'Sub Rapper · 节奏衔接与风格转换缓冲（Rap +12）',
  },
  {
    id: 'stage',
    primaryTitle: '舞台核心/中心位',
    secondaryTitle: '舞台副中心/氛围担当',
    statKey: 'stage',
    statLabel: 'Stage',
    primaryDesc: 'Main Performer / Center · 镜头捕捉力与全曲定调中心气场（Stage +22）',
    secondaryDesc: 'Sub-Center · 表情管理与舞台氛围放大器（Stage +12）',
  },
];

export const BASE_STATS = {
  vocal: 40,
  dance: 40,
  rap: 40,
  stage: 40,
  stamina: 100,
  maxStamina: 100,
  publicFavor: 20,
  controversy: 5,
} as const;

export const ACE_STAT_BONUS = 10;
export const ACE_STAMINA_TAX_MULTIPLIER = 1.28;
export const DUAL_PRIMARY_BONUS = 22;
export const DUAL_SECONDARY_BONUS = 12;
