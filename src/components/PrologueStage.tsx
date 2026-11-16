import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  buildFallbackTheqooPost,
  getActScene,
  resolvePresetChoice,
} from '../game/prologueScript';
import type {
  ActResolution,
  PlayerProfile,
  PlayerStats,
  StatDeltas,
  TheqooPost,
} from '../game/types';
import { TheqooPostCard } from './TheqooPostCard';

interface PrologueStageProps {
  currentAct: number;
  profile: PlayerProfile;
  stats: PlayerStats;
  currentResolution: ActResolution | null;
  onResolveAct: (resolution: ActResolution) => void;
  onNextAct: () => void;
}

const STAT_DELTA_LABELS: Array<{ key: keyof StatDeltas; label: string }> = [
  { key: 'vocal', label: 'Vocal' },
  { key: 'dance', label: 'Dance' },
  { key: 'rap', label: 'Rap' },
  { key: 'stage', label: 'Stage' },
  { key: 'stamina', label: '体力/心态' },
  { key: 'publicFavor', label: '路人缘' },
  { key: 'controversy', label: '争议度' },
];

const TIER_META: Record<
  ActResolution['outcomeTier'],
  { label: string; colorClass: string }
> = {
  brilliant: { label: '高光破局', colorClass: 'text-emerald-300' },
  steady: { label: '稳健过关', colorClass: 'text-sky-300' },
  risky: { label: '高危博弈', colorClass: 'text-amber-300' },
  flawed: { label: '争议警示', colorClass: 'text-rose-300' },
};

export const PrologueStage: React.FC<PrologueStageProps> = ({
  currentAct,
  profile,
  stats,
  currentResolution,
  onResolveAct,
  onNextAct,
}) => {
  const scene = getActScene(currentAct, profile);
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const resolutionRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCustomInput('');
    setStatusNotice(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentAct]);

  useEffect(() => {
    if (currentResolution && resolutionRef.current) {
      resolutionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentResolution]);

  const fetchAiTheqooPost = async (actionLabel: string): Promise<TheqooPost> => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch('/api/ai/theqoo-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, actionLabel }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('theqoo_api_unavailable');
      const data = (await res.json()) as TheqooPost;
      if (data && data.postTitle && Array.isArray(data.comments)) {
        return data;
      }
      throw new Error('invalid_theqoo_payload');
    } catch {
      return buildFallbackTheqooPost(profile, actionLabel);
    }
  };

  const handlePresetClick = async (choiceId: string) => {
    if (isLoading || currentResolution) return;
    setStatusNotice(null);

    if (currentAct === 4) {
      setIsLoading(true);
      const baseRes = resolvePresetChoice(4, choiceId, profile, stats);
      const aiPost = await fetchAiTheqooPost(baseRes.actionLabel);
      setIsLoading(false);
      onResolveAct({ ...baseRes, theqooPost: aiPost });
      return;
    }

    const resolution = resolvePresetChoice(currentAct, choiceId, profile, stats);
    onResolveAct(resolution);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed || isLoading || currentResolution) return;

    setIsLoading(true);
    setStatusNotice(null);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch('/api/ai/evaluate-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          stats,
          actNumber: currentAct,
          sceneTitle: scene.title,
          dilemmaPrompt: scene.dilemmaPrompt,
          userInput: trimmed,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error('AI_ROUTE_FALLBACK');
      }

      const data = (await response.json()) as {
        narrative: string;
        evaluatorNote: string;
        outcomeTier: ActResolution['outcomeTier'];
        unlockedTag: string;
        appliedDeltas: ActResolution['appliedDeltas'];
      };

      // Preserve structural Act 3 keepsake & Act 4 Theqoo post guarantees
      const structuralRef = resolvePresetChoice(currentAct, scene.choices[0].id, profile, stats);
      let theqooPost: TheqooPost | undefined;
      if (currentAct === 4) {
        theqooPost = await fetchAiTheqooPost(trimmed);
      }

      onResolveAct({
        actNumber: currentAct,
        actTitle: scene.title,
        actionLabel: `自由行动：「${trimmed}」`,
        isCustomAction: true,
        narrative: data.narrative,
        evaluatorNote: data.evaluatorNote,
        appliedDeltas: data.appliedDeltas,
        unlockedTag: data.unlockedTag,
        outcomeTier: data.outcomeTier,
        keepsakeAwarded: structuralRef.keepsakeAwarded,
        theqooPost,
      });
    } catch {
      // Deterministic graceful fallback so player is never soft-locked
      const fallback = resolvePresetChoice(currentAct, scene.choices[0].id, profile, stats);
      let theqooPost = fallback.theqooPost;
      if (currentAct === 4) {
        theqooPost = buildFallbackTheqooPost(profile, trimmed);
      }
      setStatusNotice('实时推演接口暂未连接，已为你切换本地剧本推演并保留你的自定义行动记录。');
      onResolveAct({
        ...fallback,
        actionLabel: `自由行动：「${trimmed}」`,
        isCustomAction: true,
        narrative: `你选择按照自己的意志行动——「${trimmed}」。${fallback.narrative}`,
        theqooPost,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 space-y-6">
      {/* Act Progress Stepper */}
      <nav aria-label="序章幕次进度" className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((num) => {
          const isCurrent = num === currentAct;
          const isPast = num < currentAct;
          return (
            <div key={num} className="space-y-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-purple-500'
                    : isPast
                      ? 'bg-purple-800/70'
                      : 'bg-slate-800'
                }`}
              />
              <div
                className={`text-[11px] font-mono-tabular truncate ${
                  isCurrent ? 'text-purple-300 font-semibold' : 'text-slate-500'
                }`}
              >
                第 {num} 幕
              </div>
            </div>
          );
        })}
      </nav>

      {/* Main Narrative Card */}
      <article className="bg-[#12131C] border border-slate-800/90 rounded-xl overflow-hidden shadow-xl">
        {/* Scene Visual Banner */}
        <div className="relative h-44 sm:h-52 w-full bg-[#0B0C14] overflow-hidden">
          <img
            src={scene.backdropUrl}
            alt={scene.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-70"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(9,9,15,0.25) 0%, rgba(18,19,28,0.88) 78%, rgba(18,19,28,1) 100%)',
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 space-y-1">
            <div className="text-xs text-purple-300 font-medium">{scene.timeLocation}</div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
              {scene.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">{scene.subtitle}</p>
          </div>
        </div>

        {/* Scene Body Prose (55-70ch measure for crisp legibility) */}
        <div className="p-5 sm:p-8 space-y-6">
          <div className="max-w-[68ch] space-y-4 text-[15px] sm:text-base text-slate-200 leading-[1.8]">
            {scene.paragraphs.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Dilemma Divider & Prompt */}
          <div className="pt-4 border-t border-slate-800/90 space-y-5">
            <p className="text-sm sm:text-base font-semibold text-purple-200 leading-relaxed">
              {scene.dilemmaPrompt}
            </p>

            {statusNotice && (
              <div className="text-xs text-slate-300 bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5">
                {statusNotice}
              </div>
            )}

            {/* Choice Interaction OR Resolution Feedback */}
            {!currentResolution ? (
              <div className="space-y-5">
                {isLoading ? (
                  <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-300">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                    <span className="text-sm">
                      {currentAct === 4
                        ? '站姐生图与媒体快报正在全网疯传，韩网论坛实时生成中...'
                        : '现场考官与镜头正在捕获你的应对瞬间...'}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Preset Choices */}
                    <div className="space-y-3" role="group" aria-label="行动抉择选项">
                      {scene.choices.map((choice, idx) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handlePresetClick(choice.id)}
                          className="w-full text-left p-4 rounded-xl bg-[#0C0D15] hover:bg-[#171928] border border-slate-800 hover:border-purple-500/70 transition-all cursor-pointer group min-h-[56px]"
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-mono-tabular text-xs font-semibold text-purple-400 pt-0.5 shrink-0">
                              0{idx + 1}
                            </span>
                            <div className="space-y-1.5 flex-1">
                              <div className="text-sm sm:text-[15px] font-medium text-white group-hover:text-purple-100 leading-relaxed">
                                {choice.label}
                              </div>
                              <div className="text-xs text-slate-400">{choice.subHint}</div>
                              {profile.roleMode === 'ace' && choice.aceWarning && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-300/95 pt-0.5">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>{choice.aceWarning}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Free Action / Custom Input (Gemini Powered) */}
                    <form
                      onSubmit={handleCustomSubmit}
                      className="pt-4 border-t border-slate-800/80 space-y-3"
                    >
                      <label
                        htmlFor="custom-action-input"
                        className="block text-xs font-semibold text-slate-300"
                      >
                        自由行动 / 自定义台词（由 Gemini 结合公司与定位实时生成反馈）
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <textarea
                          id="custom-action-input"
                          rows={2}
                          maxLength={280}
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder={scene.customPlaceholder}
                          className="flex-1 rounded-lg bg-[#09090F] border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500 resize-none"
                        />
                        <button
                          type="submit"
                          disabled={!customInput.trim() || isLoading}
                          className="sm:w-36 shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          <span>自由提交</span>
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            ) : (
              /* Resolution Feedback Section */
              <div ref={resolutionRef} className="space-y-5">
                <div className="bg-[#0B0C14] border border-slate-700/80 rounded-xl p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400 truncate max-w-md">
                      你的抉择：{currentResolution.actionLabel}
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        TIER_META[currentResolution.outcomeTier].colorClass
                      }`}
                    >
                      {TIER_META[currentResolution.outcomeTier].label}
                    </span>
                  </div>

                  <p className="text-[15px] sm:text-base text-slate-100 leading-[1.8]">
                    {currentResolution.narrative}
                  </p>

                  <div className="bg-[#131522] border border-slate-800 rounded-lg p-3.5 text-sm text-purple-200 leading-relaxed">
                    {currentResolution.evaluatorNote}
                  </div>

                  {/* Applied Stat Deltas */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-xs font-mono-tabular">
                    {STAT_DELTA_LABELS.map(({ key, label }) => {
                      const val = currentResolution.appliedDeltas[key];
                      if (!val) return null;
                      const isPositive =
                        key === 'controversy' ? val < 0 : val > 0;
                      const sign = val > 0 ? `+${val}` : `${val}`;
                      return (
                        <span
                          key={key}
                          className={
                            key === 'controversy'
                              ? val > 0
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                              : isPositive
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                          }
                        >
                          {label} {sign}
                        </span>
                      );
                    })}
                    {currentResolution.unlockedTag && (
                      <span className="text-slate-300 font-sans">
                        · 行为印记：{currentResolution.unlockedTag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Act 3 Keepsake Card */}
                {currentResolution.keepsakeAwarded && (
                  <div className="bg-[#151223] border border-purple-500/45 rounded-xl p-5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>获得随身信物 · {currentResolution.keepsakeAwarded.origin}</span>
                    </div>
                    <div className="text-base font-bold text-white">
                      {currentResolution.keepsakeAwarded.name}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {currentResolution.keepsakeAwarded.description}
                    </p>
                    <p className="text-xs text-purple-200 pt-1">
                      精神印记：{currentResolution.keepsakeAwarded.imprint}
                    </p>
                  </div>
                )}

                {/* Act 4 Theqoo Hot Post */}
                {currentResolution.theqooPost && (
                  <TheqooPostCard post={currentResolution.theqooPost} />
                )}

                {/* Advance CTA */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={onNextAct}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm sm:text-base font-semibold transition-colors cursor-pointer"
                  >
                    <span>
                      {currentAct < 5 ? `进入第 ${currentAct + 1} 幕` : '推开金色大门 · 封存序章档案'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};
