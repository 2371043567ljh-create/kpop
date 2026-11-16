import React, { useEffect } from 'react';
import { ArrowRight, FolderOpen, RotateCcw, Upload } from 'lucide-react';
import { AGENCY_CONFIGS, SCENE_BACKDROPS, TRACK_CONFIGS } from '../game/constants';
import type { SaveDataV1 } from '../game/types';

interface TitleScreenProps {
  existingSave: SaveDataV1 | null;
  onStartNew: () => void;
  onContinueSave: () => void;
  onOpenImport: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  existingSave,
  onStartNew,
  onContinueSave,
  onOpenImport,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (existingSave) {
          onContinueSave();
        } else {
          onStartNew();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [existingSave, onContinueSave, onStartNew]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#09090F] flex flex-col justify-between">
      {/* Full-bleed generated stage gate backdrop with left negative-space scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={SCENE_BACKDROPS.title}
          alt="STAR PLANET 演播大厅金色大门舞台入口"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center opacity-75"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(95deg, rgba(9,9,15,0.96) 0%, rgba(9,9,15,0.88) 44%, rgba(9,9,15,0.45) 75%, rgba(9,9,15,0.68) 100%), linear-gradient(180deg, rgba(9,9,15,0.5) 0%, transparent 25%, rgba(9,9,15,0.92) 100%)',
          }}
        />
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 flex-1 flex items-center px-6 sm:px-10 lg:px-16 pt-10 pb-24 sm:pt-16 sm:pb-24 lg:py-16 max-w-7xl w-full mx-auto">
        <div className="max-w-xl w-full space-y-8">
          {/* Bespoke inline SVG STAR PLANET Emblem */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <svg
                width="42"
                height="42"
                viewBox="0 0 42 42"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect x="1" y="1" width="40" height="40" rx="8" fill="#12131C" stroke="#A855F7" strokeWidth="1.2" strokeOpacity="0.6" />
                <path
                  d="M21 6L24.6 17.4L36 21L24.6 24.6L21 36L17.4 24.6L6 21L17.4 17.4L21 6Z"
                  fill="#E2E8F0"
                />
                <circle cx="21" cy="21" r="3.2" fill="#9333EA" />
              </svg>
              <span className="font-display text-xs sm:text-sm tracking-[0.26em] text-slate-300 uppercase">
                SURVIVAL AUDITION CHRONICLE
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] text-balance">
              STAR PLANET
              <span className="block mt-2 text-2xl sm:text-3xl lg:text-4xl font-semibold text-purple-300">
                序章 · 风暴前夜
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-lg">
              四大社最后的暗室终审、烫金黑卡背后的冷酷赌注，以及破晓四点站在闪光灯中央的十五秒。在踏入那扇百人修罗场大门之前，你的每一次回答都在写就最初的履历。
            </p>
          </div>

          {/* Existing Save Quick Card if present */}
          {existingSave && (
            <div className="bg-[#12131C]/90 border border-purple-500/35 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-purple-300 font-medium">
                    本地存档记录 ·{' '}
                    {existingSave.prologueProgress.eliminated
                      ? '已终止（淘汰结局）'
                      : existingSave.prologueProgress.completed
                        ? '序章已封存'
                        : `进行至第 ${existingSave.prologueProgress.currentAct} 幕`}
                  </p>
                  <p className="text-base font-semibold text-white mt-0.5">
                    {existingSave.player.displayName}
                    {existingSave.player.stageName && (
                      <span className="text-sm font-normal text-slate-400 ml-2">
                        （{existingSave.player.realName}）
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400 tabular-nums">
                  <div>{AGENCY_CONFIGS[existingSave.player.agency].name}</div>
                  <div>{TRACK_CONFIGS[existingSave.player.track].englishBadge} · {existingSave.player.roleLabel}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={onContinueSave}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>{existingSave.prologueProgress.completed ? '查看已封存档案' : '继续当前序章'}</span>
                </button>
                <button
                  type="button"
                  onClick={onStartNew}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#1A1C2A] hover:bg-[#232638] border border-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重新建卡开启</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-4">
            {!existingSave && (
              <button
                type="button"
                data-start="true"
                onClick={onStartNew}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-base font-semibold transition-all shadow-lg shadow-purple-950/50 cursor-pointer whitespace-nowrap"
              >
                <span>进入练习生建档</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-lg bg-[#141521]/90 hover:bg-[#1C1E2E] border border-slate-700/80 text-slate-200 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>导入存档 JSON</span>
            </button>
          </div>

          {/* Clean keyboard shortcut hint */}
          <p className="text-xs text-slate-400 pt-1">按 Enter 快捷开始</p>
        </div>
      </main>
    </div>
  );
};
