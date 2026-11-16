import React, { useEffect } from 'react';
import { AlertTriangle, Ban, RotateCcw } from 'lucide-react';
import { AGENCY_CONFIGS, TRACK_CONFIGS } from '../game/constants';
import type { ActResolution, PlayerProfile, PlayerStats } from '../game/types';

interface PrologueEliminatedProps {
  profile: PlayerProfile;
  stats: PlayerStats;
  behaviorTags: string[];
  eliminationResolution: ActResolution | null;
  onRestart: () => void;
}

export const PrologueEliminated: React.FC<PrologueEliminatedProps> = ({
  profile,
  stats,
  behaviorTags,
  eliminationResolution,
  onRestart,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const agency = AGENCY_CONFIGS[profile.agency];
  const track = TRACK_CONFIGS[profile.track];

  const endingTitle =
    eliminationResolution?.endingTitle || '终审除名 · 序章资格即时终止';
  const endingReason =
    eliminationResolution?.endingReason ||
    '你在考核中严重触发淘汰红线或核心身心防线归零，所属社与节目组当场中止录制并收回参赛资格。';
  const endingSummary =
    eliminationResolution?.endingSummary ||
    '在残酷的 K-POP 生存法则里，没有第二次重来的机会。你的档案已在《STAR PLANET》大门前被永久封存。';

  return (
    <div className="min-h-screen bg-[#09090F] text-slate-100 pt-8 pb-24 sm:pt-12 sm:pb-24 lg:pb-14 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <article className="rounded-2xl overflow-hidden border border-rose-500/55 bg-[#121018] shadow-2xl">
          {/* Stark Bad Ending Header */}
          <div className="px-6 sm:px-8 py-7 bg-gradient-to-b from-rose-950/55 via-[#181018] to-[#121018] border-b border-rose-500/30 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tabular tracking-widest text-rose-300 uppercase">
              <Ban className="w-4 h-4 text-rose-400" />
              <span>PROLOGUE TERMINATED · 淘汰 / 解约终审裁决书</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
              {endingTitle}
            </h1>

            <div className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-white">{profile.displayName}</span>
              <span className="text-slate-600">·</span>
              <span>{track.englishBadge}</span>
              <span className="text-slate-600">·</span>
              <span>{agency.name}</span>
              <span className="text-slate-600">·</span>
              <span>{profile.roleLabel}</span>
            </div>
            {eliminationResolution && (
              <p className="text-xs sm:text-sm text-rose-300 font-medium">
                止步节点：{eliminationResolution.actTitle}
              </p>
            )}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Direct Cause & Bad Ending Summary */}
            <div className="bg-rose-950/25 border border-rose-500/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>裁决原因：{endingReason}</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{endingSummary}</p>
              {eliminationResolution?.evaluatorNote && (
                <div className="pt-2 border-t border-rose-500/20 text-xs sm:text-sm text-rose-200/90 leading-relaxed">
                  现场最后记录：{eliminationResolution.evaluatorNote}
                </div>
              )}
            </div>

            {/* Final Frozen Stats */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-300">退场时最终面板</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                {[
                  { label: 'Vocal', value: stats.vocal, color: 'text-slate-200' },
                  { label: 'Dance', value: stats.dance, color: 'text-slate-200' },
                  { label: 'Rap', value: stats.rap, color: 'text-slate-200' },
                  { label: 'Stage', value: stats.stage, color: 'text-rose-300' },
                  {
                    label: '体力/心态',
                    value: `${stats.stamina}/${stats.maxStamina}`,
                    color: stats.stamina <= 0 ? 'text-rose-400' : 'text-sky-300',
                  },
                  { label: '路人缘', value: stats.publicFavor, color: 'text-rose-300' },
                  { label: '争议度', value: stats.controversy, color: 'text-amber-300' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-[#0B0A10] border border-slate-800 rounded-lg p-3"
                  >
                    <div className="text-[11px] text-slate-400">{item.label}</div>
                    <div className={`text-lg font-mono-tabular font-bold mt-0.5 ${item.color}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Behavior Tags Record */}
            <div className="bg-[#0B0A10] border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="text-xs text-slate-400">档案封存行为印记</div>
              <div className="text-sm text-rose-200 leading-relaxed">
                {behaviorTags.length > 0 ? behaviorTags.join(' · ') : '严重违纪除名'}
              </div>
            </div>

            {/* Only Restart Action Allowed */}
            <div className="pt-4 border-t border-slate-800/80 flex justify-center sm:justify-end">
              <button
                type="button"
                onClick={onRestart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[48px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm sm:text-base font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新建卡开启</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
