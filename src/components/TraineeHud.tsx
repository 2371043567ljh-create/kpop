import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Archive, ChevronUp, Home, Sparkles, X } from 'lucide-react';
import { AGENCY_CONFIGS, TRACK_CONFIGS } from '../game/constants';
import type { Keepsake, PlayerProfile, PlayerStats } from '../game/types';
import { AnimatedRollingNumber } from './AnimatedRollingNumber';

interface TraineeHudProps {
  profile: PlayerProfile;
  stats: PlayerStats;
  keepsake: Keepsake | null;
  behaviorTags: string[];
  currentAct: number;
  onOpenExport: () => void;
  onReturnTitle: () => void;
}

export const TraineeHud: React.FC<TraineeHudProps> = ({
  profile,
  stats,
  keepsake,
  behaviorTags,
  currentAct,
  onOpenExport,
  onReturnTitle,
}) => {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [recentChangedStat, setRecentChangedStat] = useState<string | null>(null);
  const prevStatsRef = useRef<PlayerStats>(stats);
  const agency = AGENCY_CONFIGS[profile.agency];
  const track = TRACK_CONFIGS[profile.track];
  const isAce = profile.roleMode === 'ace';

  const staminaPct = Math.round((stats.stamina / stats.maxStamina) * 100);

  useEffect(() => {
    const prev = prevStatsRef.current;
    if (
      prev.publicFavor !== stats.publicFavor ||
      prev.controversy !== stats.controversy ||
      prev.stamina !== stats.stamina
    ) {
      setRecentChangedStat(
        prev.publicFavor !== stats.publicFavor && prev.controversy !== stats.controversy
          ? 'both'
          : prev.publicFavor !== stats.publicFavor
            ? 'publicFavor'
            : prev.controversy !== stats.controversy
              ? 'controversy'
              : 'stamina'
      );
      prevStatsRef.current = stats;
      const timer = setTimeout(() => setRecentChangedStat(null), 1200);
      return () => clearTimeout(timer);
    }
    prevStatsRef.current = stats;
  }, [stats]);

  const renderDossierContent = () => (
    <div className="space-y-5">
      {/* Trainee Identity Header */}
      <div className="space-y-1.5 pb-4 border-b border-slate-800/90">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
          <span>{track.englishBadge}</span>
          <span className="font-mono-tabular">序章 {currentAct} / 5 幕</span>
        </div>
        <div className="text-xl font-bold text-white leading-tight">
          {profile.displayName}
          {profile.stageName && (
            <span className="block text-xs font-normal text-slate-400 mt-0.5">
              本名：{profile.realName}
            </span>
          )}
        </div>
        <div className="text-xs font-medium text-purple-300 pt-0.5">{agency.name}</div>
        <div
          className={`text-xs font-semibold pt-1 flex items-center gap-1.5 ${
            isAce ? 'text-amber-300' : 'text-slate-200'
          }`}
        >
          {isAce && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          <span>定位：{profile.roleLabel}</span>
        </div>
      </div>

      {/* Stamina / Mentality Meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">体力 / 心态</span>
          <span
            className={`inline-flex items-center gap-1 font-mono-tabular font-semibold ${
              staminaPct <= 35 ? 'text-rose-400' : 'text-slate-100'
            }`}
          >
            <AnimatedRollingNumber value={stats.stamina} />
            <span className="text-slate-500">/</span>
            <span>{stats.maxStamina}</span>
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#09090F] overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              staminaPct <= 35 ? 'bg-rose-500' : 'bg-sky-400'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, staminaPct))}%` }}
          />
        </div>
        {isAce && (
          <p className="text-[11px] text-amber-300/80">
            全能负荷生效中：高强度挑战体力多消耗 28%
          </p>
        )}
      </div>

      {/* 4D Core Attributes */}
      <div className="space-y-2.5 pt-1">
        <div className="text-xs font-medium text-slate-400">四维舞台能力</div>
        {[
          { key: 'vocal', label: 'Vocal', value: stats.vocal },
          { key: 'dance', label: 'Dance', value: stats.dance },
          { key: 'rap', label: 'Rap', value: stats.rap },
          { key: 'stage', label: 'Stage', value: stats.stage },
        ].map((item) => (
          <div key={item.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">{item.label}</span>
              <AnimatedRollingNumber
                value={item.value}
                className="font-semibold text-white"
              />
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#09090F] overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ width: `${Math.min(100, (item.value / 110) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Public Favor & Controversy */}
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
        <div
          className={`bg-[#09090F] border rounded-lg p-2.5 transition-colors duration-500 ${
            recentChangedStat === 'publicFavor' || recentChangedStat === 'both'
              ? 'border-emerald-500/60'
              : 'border-slate-800/80'
          }`}
        >
          <div className="text-[11px] text-slate-400">路人缘</div>
          <div className="text-base font-bold text-emerald-300 mt-0.5">
            <AnimatedRollingNumber value={stats.publicFavor} />
          </div>
        </div>
        <div
          className={`bg-[#09090F] border rounded-lg p-2.5 transition-colors duration-500 ${
            recentChangedStat === 'controversy' || recentChangedStat === 'both'
              ? 'border-amber-500/60'
              : 'border-slate-800/80'
          }`}
        >
          <div className="text-[11px] text-slate-400">争议度</div>
          <div className="text-base font-bold text-amber-300 mt-0.5">
            <AnimatedRollingNumber value={stats.controversy} invertPolarity />
          </div>
        </div>
      </div>

      {/* Keepsake Slot */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="text-xs font-medium text-slate-400">随身信物</div>
        {keepsake ? (
          <div className="bg-[#0C0D16] border border-purple-500/35 rounded-lg p-3 space-y-1">
            <div className="text-xs font-semibold text-purple-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{keepsake.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">{keepsake.imprint}</div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 py-1">暂未获得（第三幕解锁）</div>
        )}
      </div>

      {/* Unlocked Behavior Tags (unboxed inline typography, zero pills) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <div className="text-xs font-medium text-slate-400">抉择行为印记</div>
        {behaviorTags.length > 0 ? (
          <div className="text-xs text-slate-200 leading-relaxed">
            {behaviorTags.join(' · ')}
          </div>
        ) : (
          <div className="text-xs text-slate-500">等待你在行动中塑造</div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setMobileSheetOpen(false);
            onOpenExport();
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 min-h-[40px] rounded-lg bg-[#1A1C2A] hover:bg-[#232638] border border-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
        >
          <Archive className="w-3.5 h-3.5" />
          <span>导出 / 复制存档 JSON</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileSheetOpen(false);
            onReturnTitle();
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[40px] rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 text-xs font-medium transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>返回标题画面</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Left Sidebar Rail */}
      <aside
        aria-label="练习生实时状态面板"
        className="hidden lg:block w-80 shrink-0 bg-[#12131C] border border-slate-800/90 rounded-xl p-5 sticky top-6"
      >
        {renderDossierContent()}
      </aside>

      {/* Mobile Compact Sticky Header (< 8% viewport height) */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#09090F]/95 border-b border-slate-800 backdrop-blur-md">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-white truncate">{profile.displayName}</span>
              <span className="text-slate-500">·</span>
              <span className="text-purple-300 truncate">{agency.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono-tabular truncate flex items-center gap-1">
              <span>{profile.roleLabel} · 体力</span>
              <AnimatedRollingNumber value={stats.stamina} showDelta={false} />
              <span>/{stats.maxStamina} · 路人缘</span>
              <AnimatedRollingNumber value={stats.publicFavor} showDelta={false} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            aria-expanded={mobileSheetOpen}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-[#181A27] border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <span>档案面板</span>
            <ChevronUp className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </header>

      {/* Mobile Dossier Bottom Drawer */}
      {mobileSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label="练习生状态详情"
        >
          <div className="w-full max-h-[85vh] overflow-y-auto bg-[#12131C] border-t border-slate-700 rounded-t-2xl px-5 pt-5 pb-24 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-semibold text-white">练习生档案与实时数值</span>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="关闭档案面板"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderDossierContent()}
          </div>
        </div>
      )}
    </>
  );
};
