import { AGENCY_CONFIGS, ROLE_OPTIONS, SCENE_BACKDROPS, TRACK_CONFIGS } from './constants';
import { applyStatDeltas, calculateEffectiveDeltas, getPrimaryRoleStatValue } from './rules';
import type {
  ActResolution,
  ActSceneData,
  AgencyId,
  Keepsake,
  OutcomeTier,
  PlayerProfile,
  PlayerStats,
  RoleId,
  StatDeltas,
  TheqooPost,
  TrackId,
} from './types';

function getRoleTitles(profile: PlayerProfile): {
  primaryTitle: string;
  secondaryTitle: string;
  primaryStatKey: RoleId;
} {
  if (profile.roleMode === 'ace') {
    return {
      primaryTitle: '全能 ACE',
      secondaryTitle: '无短板全项核',
      primaryStatKey: 'stage',
    };
  }
  const p = ROLE_OPTIONS.find((r) => r.id === profile.primaryRole) ?? ROLE_OPTIONS[0];
  const s = ROLE_OPTIONS.find((r) => r.id === profile.secondaryRole) ?? ROLE_OPTIONS[1];
  return {
    primaryTitle: p.primaryTitle,
    secondaryTitle: s.secondaryTitle,
    primaryStatKey: p.id,
  };
}

function getAct1AgencyOpening(agency: AgencyId, track: TrackId): string[] {
  const peer = track === 'boy' ? '坐在你斜前方长椅上的几名男练习生' : '站在落地镜前热身的几名女练习生';
  switch (agency) {
    case 'sm':
      return [
        '凌晨 03:12，首尔圣水洞旷野总部 7 层。全透明隔音玻璃墙外，走廊尽头的红色“RECORDING”灯箱正把冷光投在抛光石材地面上。空调风口吹着恒定的低温，空气里弥漫着电子设备微热的金属气味。',
        `测评桌后坐着三名戴着监听耳机的声乐总监与艺人开发本部理事。屏幕上正循环播放你过去十二个月的声乐波形图——在这里，“音准”不是以半音为单位，而是以毫秒和音分计算。${peer}低着头反复含着润喉片，没人开口说话，玻璃房里的沉默甚至能听见耳机线摩擦衣领的声响。`,
      ];
    case 'hybe':
      return [
        '凌晨 03:12，首尔龙山区总部地下 B3 暗色调动作捕捉测评厅。四面吸音墙吞掉了所有多余混响，只有头顶冷白聚光灯与地面激光标线切割出冰冷的几何网格。',
        `前方巨大监视器正实时回放高帧率慢动作镜头。表演制作总管手里捏着秒表和英文 Demo 曲谱，${peer}刚结束上一组测评，扶着膝盖大口喘气却不敢发出太响的喘息——因为在这里，呼吸声如果盖过耳返节拍，会被直接划掉半项分数。`,
      ];
    case 'jyp':
      return [
        '凌晨 03:12，首尔江东区城内洞原木总部四楼测评室。没有夸张的霓虹灯光，只有一面直面镜子、两盏暖白吸顶灯，以及摆在正中央的一支零修音直出动圈麦。',
        `两位训练室长就坐在两米外的长木桌前，面前没有复杂的表格，只有一台纯素颜机位的便携摄像机。${peer}悄悄用矿泉水润了润唇，所有人都清楚这间屋子最可怕的地方：任何投机取巧的油滑表情、任何一丝气虚和敷衍，都会在原木地板的清唱回声里被无限放大。`,
      ];
    case 'yg':
      return [
        '凌晨 03:12，首尔麻浦区合井洞黑金地下录音棚。低音炮残留的亚低频还在胸腔里隐隐震动，控制室单向玻璃后亮着几道模糊的橘色暖光，空气里混合着浓缩冰美式与旧音箱木箱体的味道。',
        `制作局 A&R 室长把双脚搭在调音台边缘，指间转着一支金属签字笔。${peer}靠在走廊黑色砖墙边等待叫号——公司已经太久没有派出王牌参加外部大型选秀，所有人都知道，今天这场暗室终审就是一次不留退路的“孤注一掷”。`,
      ];
  }
}

function getAct1RoleChallenge(profile: PlayerProfile): {
  setupParagraph: string;
  crisisParagraph: string;
  dilemmaPrompt: string;
} {
  const { primaryTitle, secondaryTitle } = getRoleTitles(profile);

  if (profile.roleMode === 'ace') {
    return {
      setupParagraph: `轮到你站上中心标记点。当评审翻开你档案封面上那个刺眼的红色标注——“全能 ACE 备选”时，主考官抬眼冷笑了一声：“想要拿全能牌出征？那就别用单项练习生的标准来应付我。”考题瞬间加码：你必须先完成一段高强度爆发舞步，紧接着无缝切入升 Key 清唱副歌，并在最后 16 小节接上即兴踩拍 Rap，同时不能丢掉任何一个主镜头特写。`,
      crisisParagraph:
        '音乐响起第 24 秒，你的呼吸节奏刚被高速切拍拉满，控制台的伴奏音轨却毫无征兆地卡顿断流了整整两拍——同时耳返里突然串进刺耳的高频电流啸叫！场边本来与你竞争同一张入场券的热门练习生立刻微微偏头看过来，等着看这位“全能候选人”当场崩盘。',
      dilemmaPrompt: '【⚠️ ACE 高压判定 · 体力消耗加重】面对突发断音与电流啸叫，你如何在零失误容错率下撑住全能考核？',
    };
  }

  let testDetail = '';
  if (profile.primaryRole === 'dance') {
    testDetail = `考官针对你的【${primaryTitle} + ${secondaryTitle}】定位下了死命令：你必须先用 40 秒高密度地板控制与顿点爆破拉满动作张力，随后在心跳飙到 160 的瞬间站定收拍，零缓冲清唱副歌稳住气息与音准。`;
  } else if (profile.primaryRole === 'vocal') {
    testDetail = `考官针对你的【${primaryTitle} + ${secondaryTitle}】定位临时改了考题：取消原本站桩演唱的安排，要求你在连续走位与肢体律动中完成高难度转音与强混高音，证明你不是“站着才能唱”的温室主唱。`;
  } else if (profile.primaryRole === 'rap') {
    testDetail = `考官针对你的【${primaryTitle} + ${secondaryTitle}】定位切出了冷门节奏：要求你先用极快双倍速 Flow 压住鼓点，再在 Beat 骤减的留白段落里展现舞台张力与稳健声线衔接，不准靠喊麦糊弄。`;
  } else {
    testDetail = `考官针对你的【${primaryTitle} + ${secondaryTitle}】定位把三台追踪机位同时对准了你：要求你在极短的前奏留白里立刻建立压倒性的中心位镜头统治力，并在副歌段落兼顾精准动作与稳定人声输出。`;
  }

  return {
    setupParagraph: `轮到你走上测评区中央。考官低头核对你的定位栏——“${primaryTitle} + ${secondaryTitle}”。${testDetail}`,
    crisisParagraph:
      '测试进行到最吃紧的后半段，耳返却突然出现半拍延迟，现场伴奏的低频贝斯几乎把你的节奏感拖偏；与此同时，紧挨着侧边备考区的热门练习生故意在转身瞬间加重了脚步声干扰节拍。考官的笔尖悬在评分表上方，正死死盯着你的反应。',
    dilemmaPrompt: '伴奏延迟与旁侧干扰同时发生，考官的视线正锁定你。你决定如何化解这次临场危机？',
  };
}

function getAct2DirectorScene(profile: PlayerProfile): ActSceneData {
  const agency = AGENCY_CONFIGS[profile.agency];
  const { primaryTitle, secondaryTitle } = getRoleTitles(profile);
  const trackText = TRACK_CONFIGS[profile.track].title;

  let roomIntro = '';
  let pressureText = '';

  switch (profile.agency) {
    case 'sm':
      roomIntro =
        '上午十点，圣水洞大楼高层理事室。落地窗外的汉江泛着冷冽银光，桌上那张印有《STAR PLANET》烫金徽记的黑色入场券被推到你面前——金属箔片在日光下折出一道锋利的紫光。';
      pressureText =
        profile.roleMode === 'ace'
          ? `SM 艺人开发本部理事双手交叉放在文件上，目光平静却带着审讯般的冷意：“你报了全能 ACE？记住，外面节目组最喜欢拿‘SM 家自称全能的练习生’祭天。声乐但凡有一句没立住，网上第一批嘲讽‘名不副实’的就是针对我们公司。会社不会替伪 ACE 兜底。”`
          : `SM 艺人开发本部理事指尖点在你的定位栏上：“公司把名额押在你身上，是因为你的【${primaryTitle}】足够锋利，【${secondaryTitle}】也能在小组战里托底。进节目后别乱跨界出洋相，把‘SM 血统’四个字死死钉在实力榜前列。”`;
      break;
    case 'hybe':
      roomIntro =
        '上午十点，龙山总部顶层会议室。百叶窗半掩，投影幕布上还停着各国流媒体热歌趋势曲线。那张《STAR PLANET》烫金黑色入场券正静静躺在黑色皮革托盘中央。';
      pressureText =
        profile.roleMode === 'ace'
          ? `表演制作总管合上平板电脑，语气干脆得近乎冷酷：“你要走全能 ACE 路线，这意味着你的体能消耗和镜头试错率是别人的两倍。龙山的规则很现实——我们只剪辑能走向全球的高光镜头，如果你因为贪全能而累垮在半路，公关团队不会帮你洗白。”`
          : `表演制作总管将黑色黑卡推向你：“我们看重你的【${primaryTitle}】能撑起群舞与国际视线，必要时靠【${secondaryTitle}】补足团队缺口。节目开播后国内论坛一定会挑刺‘重编舞轻生唱’，你要用零失误的舞台动线堵住他们的嘴。”`;
      break;
    case 'jyp':
      roomIntro =
        '上午十点，城内洞本部社长会客室旁的小谈话间。阳光透过百叶窗落在原木茶几上，那张质感沉重的《STAR PLANET》烫金黑色入场券就压在一杯热茶旁。';
      pressureText =
        profile.roleMode === 'ace'
          ? `首席训练室长凝视着你的眼睛，语速不紧不慢，分量却重得惊人：“全能 ACE 是一把双刃剑。观众喜欢真诚努力的人，可一旦你在某一科露出短板却还硬撑人设，路人缘会在一夜之间反噬。如果你没有比别人多熬两倍夜的觉悟，现在改定位还来得及。”`
          : `首席训练室长微笑着把黑卡推过来，眼神却无比认真：“你的【${primaryTitle}】有足够强的记忆点，【${secondaryTitle}】也很扎实。去《STAR PLANET》记住一件事——永远不要在镜头前丢掉真诚，哪怕一秒钟的傲慢或松懈，都会毁掉会社为你攒下的口碑。”`;
      break;
    case 'yg':
      roomIntro =
        '上午十点，合井洞大楼八层秘密谈话室。黑色磨砂门反锁着，烟灰缸里只剩冰美式杯壁凝结的水珠。那张边缘锋利的《STAR PLANET》烫金黑色入场券被随意丢在黑色大理石桌面上。';
      pressureText =
        profile.roleMode === 'ace'
          ? `A&R 室长靠在真皮椅背里，冷冷打量着你：“全能 ACE？哼，自称全能的人通常最先死在全能上。YG 从来不缺有个性的疯子，缺的是站上去能一个人吞掉整个舞台的怪物。如果只是样样沾边、样样不致命，那还不如待在地下室别出去丢人。”`
          : `A&R 室长用下巴指了指那张黑卡：“公司押了多少年才放出这批人去参加 ${trackText}。你的【${primaryTitle}】就是你的杀招，至于【${secondaryTitle}】，关键时刻够用就行。别被外面那些流水线刀群舞规训傻了——要么炸场，要么滚回来。”`;
      break;
  }

  return {
    actNumber: 2,
    title: '第二幕 · 烫金黑卡与室长密谈',
    subtitle: `${agency.name} 高层闭门谈话`,
    timeLocation: `${agency.location.split('·')[0].trim()} · 上午 10:00`,
    backdropUrl: SCENE_BACKDROPS.audition,
    paragraphs: [
      roomIntro,
      pressureText,
      '室长说完后没有立刻起身，而是静静看着桌上的黑卡，等待你的回应。你知道，这既是对你的最后心理敲打，也是临行前唯一一次向公司高层摸底或争取倾斜筹码的机会。',
    ],
    dilemmaPrompt: '面对室长的审视与暗中施压，你决定如何回应并收下这张烫金入场券？',
    choices: [
      {
        id: 'act2_comply',
        label: '沉稳接卡并立下军令状：“不会让会社蒙羞，一切用初舞台说话。”',
        subHint: '稳健表态 · 降低初期内部摩擦，稳固心态与形象',
        strategyType: 'composed',
        isHighIntensity: false,
      },
      {
        id: 'act2_negotiate',
        label:
          profile.roleMode === 'ace'
            ? '直视室长提出诉求：申请保留个人改编权，初舞台同时编排高难度唱跳与自写段。'
            : `针对【${primaryTitle}】主动争取资源：请求会社音乐组协助微调初舞台编曲以放大个人杀招。`,
        subHint: '主动谈条件 · 强化核心舞台实力，但会触发更高内部预期与体力投入',
        strategyType: 'bold',
        isHighIntensity: true,
        aceWarning: 'ACE 路线追加高强度自编自改负荷，体力消耗提升且风险加倍',
      },
      {
        id: 'act2_probe',
        label: '不动声色试探底牌：“这次同公司一同出发的，还有哪几位王牌练习生？”',
        subHint: '敏锐博弈 · 摸清同门竞争格局，提升舞台心眼与警觉度，可能引发室长微妙忌惮',
        strategyType: 'precision',
        isHighIntensity: false,
      },
      {
        id: 'act2_defiant',
        label: '压低眉眼单手抽走黑卡：“规则是节目组的，但镜头只会记住赢家。”',
        subHint: '锋芒毕露 · 显著提升 Stage 气场，但会增加争议度与高层严苛度',
        strategyType: 'guarded',
        isHighIntensity: false,
      },
    ],
    customPlaceholder: '输入你对室长说的话或临场动作（例如：询问初舞台选曲权限、表露野心或试探公司底线）...',
  };
}

function getAct3CompanionAndKeepsake(profile: PlayerProfile): {
  companionName: string;
  companionRole: string;
  memoryDetail: string;
  keepsake: Keepsake;
  paragraphs: string[];
} {
  const isBoy = profile.track === 'boy';
  const { primaryTitle } = getRoleTitles(profile);

  const companionName = isBoy ? '朴志勋（练习生前辈）' : '金书妍（同期练习生）';
  const companionRole = isBoy
    ? '在会社熬了五年、最终在昨晚终评落选名单里看到自己名字的大哥'
    : '曾和你一起共用同一间练习室、却因为合约到期决定退出选秀的同期挚友';

  let memoryDetail = '';
  let keepsake: Keepsake;

  if (profile.roleMode === 'ace') {
    memoryDetail =
      '“还记得吗？”对方靠在冰凉的铁丝网边，呼出一口白气，“每次别的练习生练完一科就回去睡觉，只有你一个人把声乐、编舞和写词笔记本全摊在地下室地板上，练到凌晨四点连矿泉水瓶盖都拧不开。”';
    keepsake = {
      id: 'keepsake_ace_strap',
      name: '写满红笔批注的黑色护腕',
      origin: `${companionName}临别赠礼`,
      description: '内侧用防水油性笔写着拍号、换气点与“别被全能两个字压垮”的字迹，边缘已被汗水磨白。',
      imprint: '逆境抗压 · 提醒自己在全能高压中守住呼吸节奏',
    };
  } else if (profile.primaryRole === 'vocal') {
    memoryDetail =
      '“我耳机里到现在还存着去年冬天我们一起录的清唱小样，”对方苦笑了一下，从大衣口袋里摸出一个微凉的小铁盒，“每次你为了冲高音在声乐室练到嗓子冒烟，都是我帮你去便利店买温水。”';
    keepsake = {
      id: 'keepsake_vocal_tin',
      name: '半盒薄荷润喉糖铁盒',
      origin: `${companionName}临别赠礼`,
      description: '银色铁盒盖子内侧贴着一张便签：“真声顶上去之前，先稳住丹田。”',
      imprint: '声带护盾 · 关键开麦时刻稳定气息与高音心理阈值',
    };
  } else if (profile.primaryRole === 'dance') {
    memoryDetail =
      '“地下室 B 区的镜子左下角那道裂痕，还是咱们俩扣齐舞动作时不小心踢到的吧？”对方低头看着你行李箱侧袋，声音被夜风吹得有些发哑，“你的【主舞】底子比我狠，去了节目里别再像以前那样一个人死磕到膝盖积水。”';
    keepsake = {
      id: 'keepsake_dance_tape',
      name: '半卷黑色肌效贴与旧护膝扣',
      origin: `${companionName}临别赠礼`,
      description: '缠绕整齐的黑色运动胶带，附着一枚磨损掉漆的银色金属扣。',
      imprint: '肢体记忆 · 高强度群舞与连续录制下的韧性支撑',
    };
  } else if (profile.primaryRole === 'rap') {
    memoryDetail =
      '“当初咱俩蹲在练习室走廊啃冷三角紫菜包饭、用手机自带备忘录互相写八小节 Diss 玩的时候，谁能想到你今天真拿着四大社黑卡去《STAR PLANET》了？”对方甩了甩手里的几页纸，眼神复杂却滚烫。';
    keepsake = {
      id: 'keepsake_rap_lyrics',
      name: '折痕泛黄的手写 Rhyme 歌词纸',
      origin: `${companionName}临别赠礼`,
      description: '密密麻麻标注着双押重音与气口停顿的歌词纸，背面留有一段未发表的 Beat 记号。',
      imprint: '锋利词锋 · 即兴创作与节奏反击时的灵感锚点',
    };
  } else {
    memoryDetail =
      '“以前每次模拟测评录像回放，不管站边角还是站中间，大家的视线总会先被你抓过去。”对方仰头看着夜空里的飞机航迹灯，缓缓开口，“我大概没机会再站上那么大的打歌台了，但你必须站到追光正中央。”';
    keepsake = {
      id: 'keepsake_stage_pick',
      name: '磨损的银色耳返装饰拨片',
      origin: `${companionName}临别赠礼`,
      description: '一枚挂在黑色编织绳上的定制金属片，表面刻着微小的星芒划痕，灯光下会折射出冷冽银光。',
      imprint: '镜头直觉 · 提醒自己永远不要移开对主镜头的统治欲',
    };
  }

  return {
    companionName,
    companionRole,
    memoryDetail,
    keepsake,
    paragraphs: [
      `深夜 00:40，距离保姆车统一发车只剩最后三小时。你拉好拉杆箱拉链，独自推开公司大楼顶层天台的铁门想吹吹冷风。自动贩卖机惨白略带紫调的灯箱下，站着一个熟悉又孤单的身影——是${companionName}，${companionRole}。`,
      `${memoryDetail}对方视线停在你露出外套口袋一角的《STAR PLANET》烫金黑色入场券上，沉默了两秒，随后上前一步，将一件略带体温的小物件放进你掌心——【${keepsake.name}】。`,
      `“带着吧，别嫌旧。”夜风把对方的头发吹乱，那双眼睛在首尔零点后的霓虹余晖里死死看着你，像是在看自己再也去不了的未来，“进了那个吞人的摄影棚，你打算怎么对待我们曾经一起流过的汗？”`,
    ],
  };
}

export function getActScene(actNumber: number, profile: PlayerProfile): ActSceneData {
  const agency = AGENCY_CONFIGS[profile.agency];
  const { primaryTitle, secondaryTitle } = getRoleTitles(profile);

  if (actNumber === 1) {
    const openings = getAct1AgencyOpening(profile.agency, profile.track);
    const challenge = getAct1RoleChallenge(profile);
    return {
      actNumber: 1,
      title: '第一幕 · 凌晨三点的最终月评',
      subtitle: `${agency.name} · 内部末轮资格终审`,
      timeLocation: `${agency.location} · 03:12 AM`,
      backdropUrl: SCENE_BACKDROPS.audition,
      paragraphs: [...openings, challenge.setupParagraph, challenge.crisisParagraph],
      dilemmaPrompt: challenge.dilemmaPrompt,
      choices: [
        {
          id: 'act1_acapella',
          label:
            profile.roleMode === 'ace'
              ? '摘掉一侧啸叫耳返，干脆全开麦清唱接人声打拍，强行压死全场动作与节奏！'
              : '立刻摘下故障耳返，凭借肌肉记忆清唱/纯人声踩拍顶完最后半段。',
          subHint: '硬核实力破局 · 高强度消耗体力，但成功过关将赢得极高内部评价',
          strategyType: 'bold',
          isHighIntensity: true,
          aceWarning: 'ACE 全能清唱+高强舞蹈双压，额外消耗体力且判定极其严苛',
        },
        {
          id: 'act1_adjust',
          label: '微调动作幅度和呼吸频率，贴近音响低频震动强行咬住原始节拍。',
          subHint: '精准技术兜底 · 稳住【' + primaryTitle + '】基本盘，消耗中等体力',
          strategyType: 'precision',
          isHighIntensity: true,
        },
        {
          id: 'act1_eye_contact',
          label: '不理会周围干扰，锁死正前方主测评镜头用表情与定点动作填满断音空白。',
          subHint: '舞台掌控路线 · 重点拉高 Stage 表现力，若基本功不足易被挑刺',
          strategyType: 'composed',
          isHighIntensity: false,
        },
        {
          id: 'act1_stop',
          label: '举手示意设备故障请求重录一次，确保交出零瑕疵的测评版本。',
          subHint: '保守求稳 · 节省体力，但在四大社高压考官眼中可能被贴上抗压不足标签',
          strategyType: 'guarded',
          isHighIntensity: false,
          aceWarning: 'ACE 路线主动叫停考核将被严厉质疑“心理素质不配全能牌”',
        },
      ],
      customPlaceholder: '输入你的临场自救动作或对考官说的话（例如：用鞋跟踏拍接上 Rap、顺势改编这段空白等）...',
    };
  }

  if (actNumber === 2) {
    return getAct2DirectorScene(profile);
  }

  if (actNumber === 3) {
    const act3 = getAct3CompanionAndKeepsake(profile);
    return {
      actNumber: 3,
      title: '第三幕 · 天台风口：未曾同行的人',
      subtitle: '出发前夜的告别与信物托付',
      timeLocation: '公司顶层天台自动贩卖机前 · 00:40 AM',
      backdropUrl: SCENE_BACKDROPS.rooftop,
      paragraphs: act3.paragraphs,
      dilemmaPrompt: `接过【${act3.keepsake.name}】的瞬间，你决定如何回应这位即将分道扬镳的同行者？`,
      choices: [
        {
          id: 'act3_promise',
          label: '握紧信物郑重许诺：“等我站到最终出道位那天，一定在感言里提到我们一起熬过的地下室。”',
          subHint: '重情重义 · 显著提升路人缘与心态稳定度，形成温柔内核印记',
          strategyType: 'composed',
          isHighIntensity: false,
        },
        {
          id: 'act3_declare',
          label: '把信物贴身收进内袋，眼神锐利：“替你看一眼最高处的舞台是什么颜色——我不会输给任何人。”',
          subHint: '野心宣言 · 强化 Stage 气场与争胜欲，小幅提升争议与关注度',
          strategyType: 'bold',
          isHighIntensity: false,
        },
        {
          id: 'act3_boundary',
          label: '礼貌道谢后淡淡拉开半步距离：“各自的命运从今晚起分叉了，祝你离开后一切顺利。”',
          subHint: '冷静克制 · 不背负过多情感包袱，保持绝对理性的职业边界',
          strategyType: 'guarded',
          isHighIntensity: false,
        },
      ],
      customPlaceholder: '输入你对落选同伴说的告别台词或细微动作...',
    };
  }

  if (actNumber === 4) {
    const trackInfo = TRACK_CONFIGS[profile.track];
    const roleHint =
      profile.roleMode === 'ace'
        ? '车内工作人员临开门前压低声音提醒你：“刚收到风声，论坛已经有小道消息传四大社这次送了一个‘全能 ACE 怪物’，待会儿站姐镜头全是对着你脸拍的——一秒都不能垮！”'
        : `车内工作人员临开门前最后确认了一遍你的通行证：“媒体只知道这辆车里坐着 ${agency.name} 重点押宝的【${primaryTitle} + ${secondaryTitle}】，但还没曝光名字——这 15 秒就是你第一张全网名片。”`;

    return {
      actNumber: 4,
      title: '第四幕 · 破晓上班路：秘密王牌的第一波路透',
      subtitle: '首尔郊区封闭录制基地 · 首次媒体与站姐正面交锋',
      timeLocation: '京畿道坡州《STAR PLANET》摄影棚外 · 04:05 AM',
      backdropUrl: SCENE_BACKDROPS.arrival,
      paragraphs: [
        `凌晨 04:05，载着你的纯黑保姆车缓缓停在首尔郊区坡州封闭录制基地红毯外围。车窗外明明还是伸手不见五指的寒风破晓，警戒线两侧却早已挤满了蹲守整夜的娱乐记者与长焦炮姐——羽绒服、暖宝宝、三脚架排成密不透风的黑色人墙。`,
        `当车门“咔哒”一声向后滑开，几十台专业相机的快门连拍声瞬间炸成密集的暴雨，刺目的白色闪光灯把冷雾照得恍如白昼！人群里立刻爆出一阵压抑的惊呼：“是 ${agency.name} 的车牌！”“${trackInfo.englishBadge} 的秘密练习生终于露面了！”`,
        roleHint,
      ],
      dilemmaPrompt: '从踏下保姆车台阶到走进录制大厅大门，你有整整 15 秒暴露在全网路透镜头下。你的选择是？',
      choices: [
        {
          id: 'act4_eyelock',
          label: '不急着低头躲闪，刻意放慢半拍步伐，抬眸精准锁死正前方媒体主炮镜头两秒。',
          subHint: '极致明星相 · 极高概率诞生“神图出圈”热帖，但也会引来“野心太重/太会营业”的争议',
          strategyType: 'bold',
          isHighIntensity: false,
          aceWarning: 'ACE 路线直视主镜头会被论坛拿着放大镜逐帧审视全能实力底气',
        },
        {
          id: 'act4_cool',
          label: '帽檐略微压低半寸，下颌线条冷峻利落，仅在转身入场前留下一记若隐若现的侧颜轮廓。',
          subHint: '清冷神秘感 · 完美契合大社秘密武器气场，吸引“氛围感/神秘王牌”讨论热潮',
          strategyType: 'precision',
          isHighIntensity: false,
        },
        {
          id: 'act4_bow',
          label: '停下脚步向寒风里熬夜守候的站姐与记者深深鞠躬 90 度，再微笑挥手致意后小跑进场。',
          subHint: '礼貌圈粉流 · 大幅提升韩国本土路人缘与好感度，降低恶意挑刺风险',
          strategyType: 'composed',
          isHighIntensity: false,
        },
      ],
      customPlaceholder: '自由设计这 15 秒的上班路名场面动作、微表情或穿戴细节...',
    };
  }

  // Act 5
  return {
    actNumber: 5,
    title: '第五幕 · 金色大门之前',
    subtitle: '序章终幕定格 · 正式踏入百人修罗场',
    timeLocation: '《STAR PLANET》演播大厅主通道 · 05:30 AM',
    backdropUrl: SCENE_BACKDROPS.title,
    paragraphs: [
      '穿过长达百米的幽暗后台长廊，耳麦线冰凉地贴上你的后颈，工作人员俯身为你别上银光闪闪的参赛编号铭牌，并在胸口贴上所属社的烫金识别徽记。',
      `一扇高达六米的沉重金色演播厅大门横亘在你眼前。厚重的隔音门板也完全挡不住门后传来的暗涌声浪——已有数十名来自各家娱乐公司与海外赛区的 ${TRACK_CONFIGS[profile.track].traineeTerm} 先一步落座，阶梯王座最顶端的 1 号席位正空悬在聚光灯核心。`,
      `你深吸一口带着干冰和舞台金属味的空气，缓缓抬起手，指尖搭上冰凉沉重的黄铜门把手。只需再推开一寸，整座亚洲最残酷的聚光灯就会迎面倾泻而来——`,
    ],
    dilemmaPrompt: '在推开金色大门、画面彻底定格进入《STAR PLANET》正赛的最后一秒，你心里最后的念头与姿态是？',
    choices: [
      {
        id: 'act5_dominate',
        label: '“那个最顶端的王座，从我站在门外这一刻起就已经写上我的名字了。”（昂首推门）',
        subHint: '霸气开局 · Stage +5，为即将开启的正篇定下绝不退让的王者基调',
        strategyType: 'bold',
        isHighIntensity: false,
      },
      {
        id: 'act5_focus',
        label: '“忘掉所有热帖与公司名号，今天我只用呼吸和舞台证明自己。”（平静深呼吸后推门）',
        subHint: '强心脏稳态 · 恢复少量体力/心态值，路人缘 +5',
        strategyType: 'composed',
        isHighIntensity: false,
      },
      {
        id: 'act5_ace_vow',
        label: '“既然选择了最难走的路，那就让质疑声成为舞台最响的伴奏。”（嘴角微扬推门迎光）',
        subHint: '破风者姿态 · Stage +4、全核心微增，但伴随高关注高争议体质',
        strategyType: 'precision',
        isHighIntensity: false,
      },
    ],
    customPlaceholder: '写下你在推开金色大门前最后一秒的心境独白或动作...',
  };
}

export function resolvePresetChoice(
  actNumber: number,
  choiceId: string,
  profile: PlayerProfile,
  stats: PlayerStats
): ActResolution {
  const isAce = profile.roleMode === 'ace';
  const agency = AGENCY_CONFIGS[profile.agency];
  const { primaryTitle, secondaryTitle } = getRoleTitles(profile);
  const primaryStat = getPrimaryRoleStatValue(profile, stats);
  const actScene = getActScene(actNumber, profile);
  const choice = actScene.choices.find((c) => c.id === choiceId) ?? actScene.choices[0];

  // ACT 1 RESOLUTION
  if (actNumber === 1) {
    let rawDeltas: StatDeltas = {};
    let outcomeTier: OutcomeTier = 'steady';
    let narrative = '';
    let evaluatorNote = '';
    let unlockedTag: string | null = null;

    if (choiceId === 'act1_acapella') {
      if (isAce && stats.stamina < 85) {
        outcomeTier = 'risky';
        rawDeltas = { vocal: 4, stage: 5, stamina: -24, publicFavor: -4, controversy: 12 };
        narrative =
          '你果断扯下一侧啸叫的耳返，在断音瞬间强行用纯人声接上高难度切拍。前半段舞步的爆发力几乎耗光了你的肺活量，升 Key 副歌最后两个高音略显紧绷，紧接的 Rap 咬字也微微抢拍半拍。虽然靠强硬的舞台意志撑完了全程，但主考官冷着脸合上了记录本。';
        evaluatorNote = `“全能 ACE 不是让你拼命透支把三件事都做成八十分的。”${agency.directorTitle}在评分栏划下一道深痕，“高音尾巴抖了，这就是拿全能牌必须吞下的质疑。”`;
        unlockedTag = '透支硬撑的野心家';
      } else if (isAce) {
        outcomeTier = 'brilliant';
        rawDeltas = { vocal: 8, dance: 6, rap: 6, stage: 8, stamina: -22, publicFavor: 8, controversy: 6 };
        narrative =
          '你反手扯掉发烫的单侧耳返，几乎在伴奏断流的同一毫秒用清亮稳健的清唱打底，足尖精准踏进无声拍点！最后 16 小节即兴 Rap 的气口如刀锋般利落，眼神甚至没有飘向旁侧干扰你的竞争者。玻璃房内外一片死寂，直到理事率先缓缓放下了笔。';
        evaluatorNote = `“……有点意思。”${agency.directorTitle}罕见地挑了挑眉，“至少在公司内部，你勉强撑住了‘全能 ACE’这几个字的重量。”`;
        unlockedTag = '无伴奏镇场王牌';
      } else {
        outcomeTier = 'brilliant';
        rawDeltas = {
          [profile.primaryRole === 'dance' ? 'dance' : profile.primaryRole === 'rap' ? 'rap' : 'vocal']: 8,
          stage: 6,
          stamina: -18,
          publicFavor: 6,
        };
        narrative = `你利落摘掉耳返，彻底依靠半年来在地下室磨出的肌肉记忆与声线控制力顶住断音真空。你的【${primaryTitle}】杀招没有一丝动摇，收拍瞬间气息甚至比刚才更稳。旁边原本等着看笑话的练习生脸色肉眼可见地僵住。`;
        evaluatorNote = `“危机处理合格。把基本功刻进骨头里的人，镜头才抢不走。”${agency.directorTitle}在通过栏盖下了印章。`;
        unlockedTag = '大心脏清唱破局者';
      }
    } else if (choiceId === 'act1_adjust') {
      if (isAce) {
        outcomeTier = 'risky';
        rawDeltas = { dance: 4, vocal: 2, stamina: -18, publicFavor: -3, controversy: 9 };
        narrative =
          '你试图收窄动作幅度以稳住音响低频节拍，保住了动作精度和音准底线，但整段表演却失去了 ACE 最致命的惊艳爆破力。测评室里的气氛平淡得像一杯凉水。';
        evaluatorNote = '“稳是稳了，可如果你只做到稳，为什么要占着全能 ACE 的高危标签？样样通、样样松，出去第一轮就会被吞掉。”';
        unlockedTag = '保守妥协的全能者';
      } else {
        outcomeTier = 'steady';
        rawDeltas = {
          [profile.primaryRole === 'vocal' ? 'vocal' : 'dance']: 7,
          stage: 4,
          stamina: -14,
          publicFavor: 4,
        };
        narrative = `你迅速收缩呼吸幅度，贴近低音炮震动把节拍锁回正轨，让【${primaryTitle}】与【${secondaryTitle}】衔接得严丝合缝。虽然少了几分惊险的戏剧性，却交出了极高的技术完成度。`;
        evaluatorNote = `“很聪明，知道在失控边缘先把长板保住。”考官点了点头，“去收拾行李吧，你拿到名额了。”`;
        unlockedTag = '精密节拍控制者';
      }
    } else if (choiceId === 'act1_eye_contact') {
      if (primaryStat >= 62 && !isAce) {
        outcomeTier = 'brilliant';
        rawDeltas = { stage: 9, vocal: 3, stamina: -10, publicFavor: 7, controversy: 3 };
        narrative =
          '耳返延迟的那两秒里，你没有慌乱找拍，而是微微偏头对准正前方主镜头，用一记极具压迫感的凝视与定点定格将“事故”硬生生演成了舞台留白设计。监视器后的导演瞬间坐直了身体。';
        evaluatorNote = '“天生吃镜头这碗饭的直觉。哪怕没有声音，你的眼睛也在替你演出。”';
        unlockedTag = '镜头绝对猎手';
      } else {
        outcomeTier = isAce ? 'flawed' : 'risky';
        rawDeltas = isAce
          ? { stage: 4, stamina: -12, publicFavor: -8, controversy: 14 }
          : { stage: 5, stamina: -10, controversy: 7 };
        narrative =
          '你死死锁住镜头试图用气场蒙混过关，但下一秒切回开麦段落时，气息与拍点依然慢了四分之一拍。镜头确实拍到了好看的定格，却也把那半拍的虚浮拍得清清楚楚。';
        evaluatorNote = isAce
          ? '“别拿表情管理当遮羞布！全能 ACE 唱跳节奏飘了就是飘了，网上只会骂你是只顾着摆 Pose 的花瓶。”'
          : '“镜头感不错，但实力再不提半个档次，去了节目组会被剪成‘光靠脸撑场的练习生’。”';
        unlockedTag = isAce ? '备受争议的伪全能疑云' : '镜头优先派';
      }
    } else {
      // act1_stop
      outcomeTier = 'flawed';
      rawDeltas = isAce
        ? { stamina: -6, publicFavor: -10, controversy: 15 }
        : { stamina: -4, publicFavor: -5, controversy: 8 };
      narrative =
        '你抬手示意叫停测评要求重来。虽然设备重调试后你拿出了工整无错的第二遍表演，但整个测评室在第一次喊停的那一刻，气压就已经彻底冷了下来。';
      evaluatorNote = isAce
        ? '“真可惜。直播舞台可不会因为你举手就重来——连这点突发事故都扛不住，还谈什么全能 ACE？”'
        : '“第二遍确实零失误，但你记住，《STAR PLANET》的直播麦不会给你第二次机会。”';
      unlockedTag = '完美主义保守派';
    }

    const appliedDeltas = calculateEffectiveDeltas(rawDeltas, profile.agency, isAce, choice.isHighIntensity);
    return {
      actNumber: 1,
      actTitle: actScene.title,
      actionLabel: choice.label,
      isCustomAction: false,
      narrative,
      evaluatorNote,
      appliedDeltas,
      unlockedTag,
      outcomeTier,
    };
  }

  // ACT 2 RESOLUTION
  if (actNumber === 2) {
    let rawDeltas: StatDeltas = {};
    let outcomeTier: OutcomeTier = 'steady';
    let narrative = '';
    let evaluatorNote = '';
    let unlockedTag: string | null = null;

    if (choiceId === 'act2_comply') {
      outcomeTier = 'steady';
      rawDeltas = { publicFavor: 5, stamina: 6 };
      narrative =
        '你双手接过那张边缘冰凉的烫金黑卡，腰背挺直地立下承诺。没有多余的试探，也没有傲慢的反驳，室长紧绷的肩膀肉眼可见地松弛了几分。';
      evaluatorNote = `“记住你今天的话。大社的招牌是护身符，也是随时会反咬一口的枷锁。”`;
      unlockedTag = '严守纪律的社派王牌';
    } else if (choiceId === 'act2_negotiate') {
      if (isAce) {
        outcomeTier = 'risky';
        rawDeltas = { stage: 7, vocal: 4, dance: 4, rap: 4, stamina: -18, controversy: 9, publicFavor: 4 };
        narrative =
          '你直视室长，要求公司允许你在初舞台保留全能改编权，将唱跳段落与自写 Rap 段落无缝拼接。室长沉默五秒后冷冷点头，却也在备忘录上重重记了一笔——这意味着出发前最后十几个小时，你必须独自吞下双倍工作量。';
        evaluatorNote = '“行，我让制作组把轨道权限发给你。别到时候在全场导师面前把自己的改编演砸了。”';
        unlockedTag = '自我加压的孤勇改编者';
      } else {
        outcomeTier = 'brilliant';
        rawDeltas = {
          [profile.primaryRole === 'vocal'
            ? 'vocal'
            : profile.primaryRole === 'dance'
              ? 'dance'
              : profile.primaryRole === 'rap'
                ? 'rap'
                : 'stage']: 6,
          stage: 4,
          stamina: -10,
          publicFavor: 5,
        };
        narrative = `你条理清晰地指出初舞台编曲中一处压制了你【${primaryTitle}】优势的转调点。室长眼里闪过一丝赞许，当场拨通内线电话让音乐组为你微调了 16 小节编曲留白。`;
        evaluatorNote = '“懂得为自己的长板争取武器，比只会低头说‘是’的练习生更适合生存战。”';
        unlockedTag = '懂得争取资源的谋略派';
      }
    } else if (choiceId === 'act2_probe') {
      outcomeTier = 'steady';
      rawDeltas = { stage: 5, controversy: 4, stamina: -4 };
      narrative =
        '你没有急着表态，而是用平静的语气套问公司这次派出的同行阵容与内部排序。室长眉峰微微一挑，虽没有说出具体名字，却不经意间漏出一句“今年海外线与本土黑马都不会少”，让你提前嗅到了同室操戈的暗流。';
      evaluatorNote = '“先把你自己管好吧——不过，保持这份警觉倒也不是坏事。”';
      unlockedTag = '嗅觉敏锐的局中人';
    } else {
      outcomeTier = isAce ? 'risky' : 'bold' as OutcomeTier;
      rawDeltas = { stage: 8, controversy: isAce ? 11 : 7, publicFavor: -3 };
      narrative =
        '你单手利落地抽出那张黑卡，指尖压住烫金纹路，话音落得毫不客气。室长看着你转身离去的背影，脸上神色阴晴不定——这种带着刺的锋芒要么让你成为收视率神兽，要么让你成为第一个被恶意剪辑的靶子。';
      evaluatorNote = '“真狂啊……希望你在 99 个怪物面前还能笑得出来。”';
      unlockedTag = '锋芒带刺的叛逆王牌';
    }

    const appliedDeltas = calculateEffectiveDeltas(rawDeltas, profile.agency, isAce, choice.isHighIntensity);
    return {
      actNumber: 2,
      actTitle: actScene.title,
      actionLabel: choice.label,
      isCustomAction: false,
      narrative,
      evaluatorNote,
      appliedDeltas,
      unlockedTag,
      outcomeTier: outcomeTier === ('bold' as OutcomeTier) ? 'risky' : outcomeTier,
    };
  }

  // ACT 3 RESOLUTION
  if (actNumber === 3) {
    const act3 = getAct3CompanionAndKeepsake(profile);
    let rawDeltas: StatDeltas = {};
    let narrative = '';
    let evaluatorNote = '';
    let unlockedTag = '';
    let outcomeTier: OutcomeTier = 'steady';

    if (choiceId === 'act3_promise') {
      outcomeTier = 'brilliant';
      rawDeltas = { publicFavor: 8, stamina: 10, stage: 3 };
      narrative = `你郑重把【${act3.keepsake.name}】攥在掌心，许下一起扛过黑暗的约定。${act3.companionName}红了眼眶，却用力拍了拍你的肩膀，把最后的祝福留在了零点风口。天台的风依然很冷，你的心率却奇异地沉了下来。`;
      evaluatorNote = `${act3.companionName}：“一言为定。我会在电视机前把你的名字喊到沙哑。”`;
      unlockedTag = '不负初心的守约者';
    } else if (choiceId === 'act3_declare') {
      outcomeTier = 'steady';
      rawDeltas = { stage: 7, controversy: 4, stamina: 5 };
      narrative = `你将【${act3.keepsake.name}】贴身收入外套内袋，迎着风立下绝不输给任何人的宣言。${act3.companionName}怔了一秒，随即露出了久违的灿烂笑容——“果然，我认识的那个你从来不会客气。”`;
      evaluatorNote = `${act3.companionName}：“那就去把最上面那个位置抢下来给我看。”`;
      unlockedTag = '背负双份梦想的决胜者';
    } else {
      outcomeTier = 'steady';
      rawDeltas = { stage: 4, vocal: 2, dance: 2, publicFavor: -3, stamina: 4 };
      narrative = `你收下【${act3.keepsake.name}】，却刻意保持了清醒且克制的半步距离。在这个随时会翻脸和淘汰的行业里，过分沉重的羁绊只会成为软肋。${act3.companionName}很快读懂了你的沉默，苦笑着点了点头，独自转身走下楼梯。`;
      evaluatorNote = `${act3.companionName}：“也是……往上走的人，本来就不能回头看。”`;
      unlockedTag = '绝对理性的独行者';
    }

    const appliedDeltas = calculateEffectiveDeltas(rawDeltas, profile.agency, isAce, false);
    return {
      actNumber: 3,
      actTitle: actScene.title,
      actionLabel: choice.label,
      isCustomAction: false,
      narrative,
      evaluatorNote,
      appliedDeltas,
      unlockedTag,
      outcomeTier,
      keepsakeAwarded: act3.keepsake,
    };
  }

  // ACT 4 RESOLUTION (with scripted fallback Theqoo post, can be upgraded by AI post)
  if (actNumber === 4) {
    let rawDeltas: StatDeltas = {};
    let outcomeTier: OutcomeTier = 'steady';
    let narrative = '';
    let evaluatorNote = '';
    let unlockedTag = '';

    if (choiceId === 'act4_eyelock') {
      outcomeTier = isAce ? 'risky' : 'brilliant';
      rawDeltas = isAce
        ? { stage: 9, publicFavor: 12, controversy: 14 }
        : { stage: 8, publicFavor: 14, controversy: 8 };
      narrative =
        '踏下保姆车台阶的瞬间，你没有缩进领口躲避冷风，而是刻意停稳节奏，迎着最刺眼的连拍闪光灯精准对焦正前方主炮镜头两秒！快门声刹那间暴涨了一倍，紧接着周围此起彼伏响起站姐压不住的吸气声——生图甚至还没来得及修，原片就已经在三分钟内被搬上了韩国各大论坛首页。';
      evaluatorNote = isAce
        ? '现场娱乐记者边狂按快门边嘀咕：“气场是真绝，但听说这位走全能 ACE……等初舞台开麦要是撑不住，今天这张神图明天就能成黑历史。”'
        : '“大发……这眼神简直像是早就把舞台当自己家一样！”外围站姐已经开始疯传你的直拍切图。';
      unlockedTag = '破晓神图制造机';
    } else if (choiceId === 'act4_cool') {
      outcomeTier = 'brilliant';
      rawDeltas = { stage: 7, publicFavor: 10, controversy: 5 };
      narrative =
        '你微压帽檐挡住大半眉眼，只露出利落紧致的下颌线与微冷的唇角。步伐干脆利落，在踏入摄影棚大门前的最后半秒微微侧首，冷冽的侧颜刚好撞进最边角站姐的长焦取景框里——极致克制的神秘感反而把好奇心吊到了顶点。';
      evaluatorNote = '“神秘感拉满了！连正脸都没完全拍全，评论区已经盖起千层楼在扒名字了。”';
      unlockedTag = '神秘冷感秘密王牌';
    } else {
      outcomeTier = 'brilliant';
      rawDeltas = { publicFavor: 18, stage: 4, controversy: -3 };
      narrative =
        '尽管凌晨四点的坡州冷风刺骨，你依然在车门前站定，面向蹲守整夜的粉丝与记者标准地鞠躬九十度，随后温柔笑着挥手示意大家注意保暖。现场快门声温和而密集地响起，甚至有记者小声回了一句“加油”。';
      evaluatorNote = '“大社出来的孩子竟然这么有礼貌？这波好感度直接先赢一半了。”';
      unlockedTag = '零差评礼貌圈粉王';
    }

    const appliedDeltas = calculateEffectiveDeltas(rawDeltas, profile.agency, isAce, false);
    const theqooPost = buildFallbackTheqooPost(profile, choiceId);
    return {
      actNumber: 4,
      actTitle: actScene.title,
      actionLabel: choice.label,
      isCustomAction: false,
      narrative,
      evaluatorNote,
      appliedDeltas,
      unlockedTag,
      outcomeTier,
      theqooPost,
    };
  }

  // ACT 5 RESOLUTION
  let rawDeltas: StatDeltas = {};
  let narrative = '';
  let evaluatorNote = '';
  let unlockedTag = '';

  if (choiceId === 'act5_dominate') {
    rawDeltas = { stage: 6, controversy: 3 };
    narrative =
      '你的手指稳稳压下冰凉的黄铜门把，手臂发力推开那道沉重的金色大门。门缝撕开的一刹那，演播厅里炫目的激光紫与电光银追光洪流般扑面而来，数十道惊愕与打量的视线在瞬间齐刷刷射向你的身影——你没有退半步，正面对上了整个《STAR PLANET》的风暴中心。';
    evaluatorNote = '【序章定格】聚光灯吞没你的肩线，全场的喧哗在你跨过门槛的那一秒骤然安静。';
    unlockedTag = '王座直指者';
  } else if (choiceId === 'act5_focus') {
    rawDeltas = { stamina: 8, publicFavor: 5, stage: 3 };
    narrative =
      '你在心里默数完三个拍子，把外界所有的期待、公司条条框框与论坛热帖统统关在长廊之外。门缝开启，滚烫的舞台强光洒满你的眉眼，你的心跳平稳得像在深夜独自练习的千百次一样。';
    evaluatorNote = '【序章定格】追光落定，真正属于你的百人选秀正赛即将拉开帷幕。';
    unlockedTag = '绝对心流践行者';
  } else {
    rawDeltas = { stage: 5, vocal: 2, dance: 2, rap: 2, controversy: 4 };
    narrative =
      '你嘴角微扬，单肩推开金色大门。刺眼舞台光束刺破黑暗的瞬间，属于四大社秘密武器的棱角正式暴露在所有竞争对手与高清主摄像机面前。';
    evaluatorNote = '【序章定格】风暴前夜至此落幕，属于你的名字即将第一次登上全球实时投票榜。';
    unlockedTag = '迎风破局者';
  }

  const appliedDeltas = calculateEffectiveDeltas(rawDeltas, profile.agency, isAce, false);
  return {
    actNumber: 5,
    actTitle: actScene.title,
    actionLabel: choice.label,
    isCustomAction: false,
    narrative,
    evaluatorNote,
    appliedDeltas,
    unlockedTag,
    outcomeTier: 'brilliant',
  };
}

export function buildFallbackTheqooPost(profile: PlayerProfile, actionKey: string): TheqooPost {
  const agency = AGENCY_CONFIGS[profile.agency];
  const isAce = profile.roleMode === 'ace';
  const trackLabel = TRACK_CONFIGS[profile.track].englishBadge;
  const nameTag = profile.stageName
    ? `${profile.stageName}（本名 ${profile.realName}）`
    : profile.realName;

  const styleDesc =
    actionKey === 'act4_eyelock'
      ? '刚下保姆车就直接抬眼锁死主镜头两秒的生图，压迫感强到像已经在打歌舞台拿过一位的前辈'
      : actionKey === 'act4_cool'
        ? '压低帽檐一路快步进场只露出一记神级冷感侧颜的抓拍生图，神秘氛围感直接拉满'
        : actionKey === 'act4_bow'
          ? '凌晨四点寒风里停下来向粉丝和记者鞠躬九十度再挥手入场的暖心生图，礼貌得完全不像大社秘密武器'
          : '刚从四大社保姆车踏下来就被媒体抓拍到的15秒出圈上班路生图';

  const aceLine = isAce
    ? '小道消息说这位的报名定位竟然是【全能 ACE】，连四大社都很少敢直接这么报吧？期待值拉满但也太容易翻车了…'
    : `据说在公司内部定位是【${profile.roleLabel}】，光看这个气场已经能预感到初舞台要血洗舞台了`;

  return {
    boardName: 'theqoo · HOT 热门贴',
    postTitle: `[HOT] 凌晨四点《${trackLabel}》上班路刚被拍到的 ${agency.name} 秘密练习生 ${nameTag} 生图震撼.jpg`,
    timestamp: '04:28 KST',
    views: '48,920',
    postBody: `刚从坡州录制现场流出的新闻图 + 站姐预览！\n这辆贴着 ${agency.name} 通行证的黑色保姆车一停下所有人都在猜里面是谁，结果车门一开就是【${nameTag}】——${styleDesc}。\n${aceLine}。你们觉得这次能稳进上位圈吗？`,
    highlightTag: isAce ? `${agency.name} · 全能 ACE 争议焦点` : `${agency.name} · ${profile.roleLabel}`,
    source: 'scripted',
    comments: [
      {
        id: 1,
        author: '匿名网友 114',
        content: `哇……${agency.name} 这次真是藏了王牌才肯放人出来吧？光看这15秒生图气场就已经和其他练习生不在一个次元了`,
        likes: 412,
        isTop: true,
      },
      {
        id: 2,
        author: '匿名网友 287',
        content: isAce
          ? '全能 ACE？？拜托不要又是那种唱跳各凑60分就敢自称全能的营销咖，初舞台全开麦拉胯的话我第一个开嘲'
          : `听说 ${profile.roleLabel} 实力在内部测评断层第一，如果是真的那这季中心位有悬念了`,
        likes: 295,
        isTop: true,
      },
      {
        id: 3,
        author: '匿名网友 503',
        content:
          actionKey === 'act4_bow'
            ? '凌晨四点冷死人的天气还专门停下来鞠躬问好，人品和教养看起来太加分了，先投一票好感票！'
            : '凌晨四点无修图新闻镜头还能抗成这样，这镜头掌控力天生就该站在舞台正中央啊',
        likes: 218,
      },
      {
        id: 4,
        author: '匿名网友 741',
        content: `${agency.name} 粉丝先别吹太早，选秀里光靠公司名号开局高开低走的人还少吗，还是看第一期初舞台吧`,
        likes: 164,
      },
      {
        id: 5,
        author: '匿名网友 892',
        content: '不管怎样已经被这波上班路彻底勾起好奇心了……求节目组赶紧公布个人简介和初舞台直拍！！',
        likes: 139,
      },
    ],
  };
}

export function applyResolutionToState(
  stats: PlayerStats,
  behaviorTags: string[],
  resolution: ActResolution
): {
  nextStats: PlayerStats;
  nextTags: string[];
} {
  const nextStats = applyStatDeltas(stats, resolution.appliedDeltas);
  const nextTags =
    resolution.unlockedTag && !behaviorTags.includes(resolution.unlockedTag)
      ? [...behaviorTags, resolution.unlockedTag]
      : [...behaviorTags];
  return { nextStats, nextTags };
}
