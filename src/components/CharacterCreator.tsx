import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  AGENCY_CONFIGS,
  ROLE_OPTIONS,
  TRACK_CONFIGS,
} from '../game/constants';
import {
  buildPlayerProfile,
  buildRoleLabel,
  computeInitialStats,
  validateCharacterSetup,
} from '../game/rules';
import type {
  AgencyId,
  PlayerProfile,
  PlayerStats,
  RoleId,
  RouteMode,
  TrackId,
} from '../game/types';

interface CharacterCreatorProps {
  onBackToTitle: () => void;
  onCompleteSetup: (profile: PlayerProfile, initialStats: PlayerStats) => void;
}

const AGENCY_ORDER: AgencyId[] = ['sm', 'hybe', 'jyp', 'yg'];
const TRACK_ORDER: TrackId[] = ['boy', 'girl'];

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  onBackToTitle,
  onCompleteSetup,
}) => {
  const [realName, setRealName] = useState('');
  const [stageName, setStageName] = useState('');
  const [track, setTrack] = useState<TrackId>('boy');
  const [agency, setAgency] = useState<AgencyId>('sm');
  const [roleMode, setRoleMode] = useState<RouteMode>('dual');
  const [primaryRole, setPrimaryRole] = useState<RoleId>('dance');
  const [secondaryRole, setSecondaryRole] = useState<RoleId>('vocal');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSelectPrimary = (roleId: RoleId) => {
    setPrimaryRole(roleId);
    if (secondaryRole === roleId) {
      const nextFallback = ROLE_OPTIONS.find((r) => r.id !== roleId)?.id ?? 'vocal';
      setSecondaryRole(nextFallback);
    }
    setFormError(null);
  };

  const liveStats = useMemo(
    () => computeInitialStats(agency, roleMode, primaryRole, secondaryRole),
    [agency, roleMode, primaryRole, secondaryRole]
  );

  const liveRoleLabel = useMemo(
    () => buildRoleLabel(roleMode, primaryRole, secondaryRole),
    [roleMode, primaryRole, secondaryRole]
  );

  const selectedAgency = AGENCY_CONFIGS[agency];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      realName,
      stageName,
      track,
      agency,
      roleMode,
      primaryRole: roleMode === 'dual' ? primaryRole : null,
      secondaryRole: roleMode === 'dual' ? secondaryRole : null,
    };
    const validation = validateCharacterSetup(input);
    if (!validation.valid) {
      setFormError(validation.error);
      return;
    }
    setFormError(null);
    const profile = buildPlayerProfile(input);
    onCompleteSetup(profile, liveStats);
  };

  return (
    <div className="min-h-screen bg-[#09090F] text-slate-100 pb-28 lg:pb-12">
      {/* Compact Header */}
      <header className="sticky top-0 z-30 bg-[#09090F]/95 border-b border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToTitle}
            className="inline-flex items-center gap-2 min-h-[40px] px-2 -ml-2 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回首页</span>
          </button>
          <span className="font-display text-sm sm:text-base font-semibold tracking-wide text-white truncate">
            练习生建档 · 序章资格登录
          </span>
          <span className="text-xs text-slate-400 font-mono-tabular hidden sm:inline">
            PROLOGUE ENTRY
          </span>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left Column: Steps 1-4 */}
        <div className="lg:col-span-8 space-y-8">
          {/* 01. Identity */}
          <section className="bg-[#12131C] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">01. 练习生名牌登记</h2>
              <p className="text-xs text-slate-400">
                外貌轮廓、身材数据与个人性格不作任何预设，全凭你在五幕抉择与自由台词中自主塑造。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="input-realname" className="block text-sm font-medium text-slate-200">
                  练习生本名 <span className="text-purple-400">*</span>
                </label>
                <input
                  id="input-realname"
                  type="text"
                  required
                  maxLength={20}
                  value={realName}
                  onChange={(e) => {
                    setRealName(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="例如：林星野 / 江清昼"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#09090F] border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="input-stagename" className="block text-sm font-medium text-slate-200">
                  艺名（选填）
                </label>
                <input
                  id="input-stagename"
                  type="text"
                  maxLength={20}
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="例如：NOAH / SERA（留空则使用本名）"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#09090F] border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </section>

          {/* 02. Track Selection */}
          <section className="bg-[#12131C] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">02. 选择参赛赛道</h2>
              <p className="text-xs text-slate-400">
                后续所有同门竞争对手、前辈称呼、媒体口吻与信物细节将随所选赛道实时适配。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TRACK_ORDER.map((tId) => {
                const cfg = TRACK_CONFIGS[tId];
                const isSelected = track === tId;
                return (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => setTrack(tId)}
                    aria-pressed={isSelected}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer min-h-[88px] ${
                      isSelected
                        ? 'bg-purple-950/35 border-purple-500 shadow-[0_0_0_1px_rgba(168,85,247,0.4)]'
                        : 'bg-[#0C0D14] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold tracking-wider text-purple-300">
                        {cfg.englishBadge}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="text-base font-semibold text-white mt-1">{cfg.title}</div>
                    <div className="text-xs text-slate-400 mt-1 leading-relaxed">{cfg.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03. Agency Selection */}
          <section className="bg-[#12131C] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">03. 所属经纪公司档案</h2>
              <p className="text-xs text-slate-400">
                四大现实经纪公司各自决定你的初始四维倾向、序章第一幕考核环境及必须背负的行业代价。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AGENCY_ORDER.map((aId) => {
                const cfg = AGENCY_CONFIGS[aId];
                const isSelected = agency === aId;
                return (
                  <button
                    key={aId}
                    type="button"
                    onClick={() => setAgency(aId)}
                    aria-pressed={isSelected}
                    className={`text-left p-4 sm:p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#171525] border-purple-500 shadow-[0_0_0_1px_rgba(168,85,247,0.45)]'
                        : 'bg-[#0C0D14] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-base font-bold text-white">
                            {cfg.name}
                          </div>
                          <div className="text-xs text-purple-300 mt-0.5">{cfg.koreanName}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{cfg.tagline}</p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs leading-relaxed">
                      <div className="text-emerald-300/95">
                        <span className="font-semibold">增益：</span>
                        {cfg.bonusSummary}
                      </div>
                      <div className="text-amber-300/90">
                        <span className="font-semibold">代价：</span>
                        {cfg.costSummary}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 04. Role / ACE Route Selection */}
          <section className="bg-[#12131C] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">04. 发展方向与路线选择</h2>
                <p className="text-xs text-slate-400">
                  在“主次双修”与“高危全能 ACE”之间择一开启你的选秀剧本。
                </p>
              </div>

              {/* Segmented Control */}
              <div
                role="tablist"
                aria-label="发展路线模式"
                className="inline-flex p-1 rounded-lg bg-[#09090F] border border-slate-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={roleMode === 'dual'}
                  onClick={() => {
                    setRoleMode('dual');
                    setFormError(null);
                  }}
                  className={`px-3.5 py-2 min-h-[40px] rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    roleMode === 'dual'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  模式 A · 稳健双修
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={roleMode === 'ace'}
                  onClick={() => {
                    setRoleMode('ace');
                    setFormError(null);
                  }}
                  className={`px-3.5 py-2 min-h-[40px] rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                    roleMode === 'ace'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-300/80 hover:text-amber-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>模式 B · 全能 ACE</span>
                </button>
              </div>
            </div>

            {roleMode === 'dual' ? (
              <div className="space-y-6">
                {/* Primary Role */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">主发展方向（4 选 1 · 对应属性 +22）</span>
                    <span className="text-purple-300 font-medium">已选：{liveRoleLabel}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLE_OPTIONS.map((role) => {
                      const active = primaryRole === role.id;
                      return (
                        <button
                          key={`primary-${role.id}`}
                          type="button"
                          onClick={() => handleSelectPrimary(role.id)}
                          aria-pressed={active}
                          className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer min-h-[72px] ${
                            active
                              ? 'bg-purple-950/40 border-purple-500'
                              : 'bg-[#0C0D14] border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">{role.primaryTitle}</span>
                            <span className="text-xs font-mono-tabular text-purple-300">{role.statLabel} +22</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{role.primaryDesc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary Role */}
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-slate-200">
                    次发展方向（从其余 3 项中任选 1 项 · 对应属性 +12）
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLE_OPTIONS.map((role) => {
                      const isSameAsPrimary = primaryRole === role.id;
                      const active = secondaryRole === role.id && !isSameAsPrimary;
                      return (
                        <button
                          key={`secondary-${role.id}`}
                          type="button"
                          disabled={isSameAsPrimary}
                          onClick={() => {
                            setSecondaryRole(role.id);
                            setFormError(null);
                          }}
                          aria-pressed={active}
                          className={`text-left p-3.5 rounded-lg border transition-all min-h-[72px] ${
                            isSameAsPrimary
                              ? 'bg-[#09090F] border-slate-800/50 opacity-45 cursor-not-allowed'
                              : active
                                ? 'bg-slate-800/70 border-slate-400 cursor-pointer'
                                : 'bg-[#0C0D14] border-slate-800 hover:border-slate-600 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">
                              {role.secondaryTitle}
                              {isSameAsPrimary && (
                                <span className="ml-2 text-xs font-normal text-slate-500">（已选为主方向）</span>
                              )}
                            </span>
                            <span className="text-xs font-mono-tabular text-slate-300">{role.statLabel} +12</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{role.secondaryDesc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#191314] border border-amber-500/45 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-base font-bold text-amber-300">
                      全能 ACE 路线 · 难度提升 · 风险极高
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      放弃传统主次定位保底，以全项发展硬闯《STAR PLANET》。四维初始均获 <span className="font-mono-tabular text-white font-semibold">+10</span> 加成，但缺少单项极高保底。
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs leading-relaxed">
                  <div className="bg-[#110D0E] border border-amber-500/20 rounded-lg p-3 space-y-1">
                    <div className="font-semibold text-amber-200">1. 零短板严苛判定</div>
                    <div className="text-slate-400">
                      考官与网友均采用最高阈值审视。任何微瑕都会被嘲讽为“样样通样样松 / 伪全能”，导致争议飙升。
                    </div>
                  </div>
                  <div className="bg-[#110D0E] border border-amber-500/20 rounded-lg p-3 space-y-1">
                    <div className="font-semibold text-amber-200">2. 高负荷体力税</div>
                    <div className="text-slate-400">
                      序章每次高强度考核与突发危机，体力/心态额外多消耗约 28%，连续高压下极易失误。
                    </div>
                  </div>
                  <div className="bg-[#110D0E] border border-amber-500/20 rounded-lg p-3 space-y-1">
                    <div className="font-semibold text-amber-200">3. 最高高光上限</div>
                    <div className="text-slate-400">
                      唯有凭借极佳策略顶住高压完美破局，方能收获碾压常规定位的惊艳评价与出圈红利。
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Live Profile Preview (Desktop) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="bg-[#12131C] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="border-b border-slate-800 pb-4 space-y-1">
              <div className="text-xs text-purple-300 font-medium">实时练习生入场档案预览</div>
              <div className="text-xl font-bold text-white truncate">
                {stageName.trim() || realName.trim() || '未登记姓名'}
              </div>
              <div className="text-xs text-slate-400">
                {TRACK_CONFIGS[track].englishBadge} · {selectedAgency.name}
              </div>
              <div
                className={`text-sm font-semibold pt-1 ${
                  roleMode === 'ace' ? 'text-amber-300' : 'text-purple-200'
                }`}
              >
                定位：{liveRoleLabel}
              </div>
            </div>

            {/* Computed Initial Stats */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-400">初始属性面板</div>
              {[
                { label: 'Vocal（声乐）', value: liveStats.vocal },
                { label: 'Dance（舞蹈）', value: liveStats.dance },
                { label: 'Rap（说唱）', value: liveStats.rap },
                { label: 'Stage（舞台掌控）', value: liveStats.stage },
              ].map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{stat.label}</span>
                    <span className="font-mono-tabular font-semibold text-white">{stat.value}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#09090F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all duration-200"
                      style={{ width: `${Math.min(100, (stat.value / 100) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
                <div className="bg-[#09090F] rounded-lg p-2.5">
                  <div className="text-[11px] text-slate-400">体力上限</div>
                  <div className="text-base font-mono-tabular font-bold text-white mt-0.5">
                    {liveStats.maxStamina}
                  </div>
                </div>
                <div className="bg-[#09090F] rounded-lg p-2.5">
                  <div className="text-[11px] text-slate-400">初始路人缘</div>
                  <div className="text-base font-mono-tabular font-bold text-emerald-300 mt-0.5">
                    {liveStats.publicFavor}
                  </div>
                </div>
                <div className="bg-[#09090F] rounded-lg p-2.5">
                  <div className="text-[11px] text-slate-400">初始争议度</div>
                  <div className="text-base font-mono-tabular font-bold text-amber-300 mt-0.5">
                    {liveStats.controversy}
                  </div>
                </div>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="text-xs text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-lg px-3.5 py-2.5"
              >
                {formError}
              </div>
            )}

            {/* Desktop Submit CTA */}
            <button
              type="submit"
              className="hidden lg:inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>确认建档 · 进入序章第一幕</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Mobile Sticky Submit Bar (compact, <= 15% viewport height) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#09090F]/95 border-t border-slate-800 backdrop-blur-md px-4 py-3">
          <div className="flex items-center justify-between gap-3 max-w-xl mx-auto">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {selectedAgency.name} · {liveRoleLabel}
              </div>
              <div className="text-[11px] text-slate-400 font-mono-tabular">
                V:{liveStats.vocal} D:{liveStats.dance} R:{liveStats.rap} S:{liveStats.stage}
              </div>
            </div>
            <button
              type="submit"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>进入序章</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
