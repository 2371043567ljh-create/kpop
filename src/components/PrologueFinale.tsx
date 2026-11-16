import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Lock,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AGENCY_CONFIGS, SCENE_BACKDROPS, TRACK_CONFIGS } from '../game/constants';
import { evaluatePrologueVerdict } from '../game/rules';
import type { SaveDataV1 } from '../game/types';
import { TheqooPostCard } from './TheqooPostCard';

interface PrologueFinaleProps {
  saveData: SaveDataV1;
  onRestart: () => void;
  onOpenExportModal: () => void;
}

export const PrologueFinale: React.FC<PrologueFinaleProps> = ({
  saveData,
  onRestart,
  onOpenExportModal,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  const { player, stats, keepsake, behaviorTags, theqooPost, prologueProgress, futureChapters } =
    saveData;
  const agency = AGENCY_CONFIGS[player.agency];
  const track = TRACK_CONFIGS[player.track];
  const isAce = player.roleMode === 'ace';
  const verdict = evaluatePrologueVerdict(saveData);
  const verdictStyle =
    verdict.tier === 'disqualified'
      ? 'bg-rose-950/35 border-rose-500/55 text-rose-200'
      : verdict.tier === 'probation'
        ? 'bg-amber-950/35 border-amber-500/50 text-amber-200'
        : verdict.tier === 'elite'
          ? 'bg-emerald-950/30 border-emerald-500/45 text-emerald-200'
          : 'bg-[#181526] border-purple-500/40 text-purple-200';

  const handleQuickCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(saveData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      onOpenExportModal();
    }
  };

  const handleDownload = () => {
    const jsonStr = JSON.stringify(saveData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star-planet-prologue-${player.displayName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#09090F] text-slate-100 pt-8 pb-24 sm:pt-12 sm:pb-24 lg:pb-14 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Golden Door Freeze Frame Banner */}
        <section className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-[#12131C] shadow-2xl">
          <div className="relative h-52 sm:h-64 w-full bg-[#09090F]">
            <img
              src={SCENE_BACKDROPS.title}
              alt="演播厅金色大门推开瞬间的追光"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center opacity-80"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(9,9,15,0.2) 0%, rgba(18,19,28,0.88) 72%, rgba(18,19,28,1) 100%)',
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-2">
              <div className="text-xs font-semibold tracking-wider text-purple-300">
                序章完 · 练习生档案正式封存
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-white">
                {player.displayName}
                {player.stageName && (
                  <span className="text-lg sm:text-xl font-normal text-slate-300 ml-2.5">
                    （本名 {player.realName}）
                  </span>
                )}
              </h1>
              <div className="text-sm text-slate-300">
                {track.englishBadge} · {agency.name} ·{' '}
                <span className={isAce ? 'text-amber-300 font-semibold' : 'text-purple-200 font-semibold'}>
                  {player.roleLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Prologue Verdict Status */}
            <div className={`border rounded-xl p-5 space-y-2 ${verdictStyle}`}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {verdict.tier === 'disqualified' || verdict.tier === 'probation' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 shrink-0" />
                )}
                <span>序章终审定级：{verdict.title}</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{verdict.summary}</p>
            </div>

            {/* Explicit Prologue End & Future Chapters Locked Notice */}
            <div className="bg-[#181526] border border-purple-500/40 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>序章已结束 · 后续章节扩展接口已就绪</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                序章已结束。完整故事后续包含第一章至第五章主线，当前版本暂未开放后续章节，您的存档已保存并支持一键导出，敬请期待后续更新。
              </p>
            </div>

            {/* Agency Imprint & ACE Risk Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0C0D15] border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs text-slate-400">所属社印记</div>
                <div className="text-base font-bold text-white">{agency.name}</div>
                <p className="text-xs text-slate-300 leading-relaxed">{agency.tagline}</p>
              </div>

              <div className="bg-[#0C0D15] border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs text-slate-400">发展定位与风险状态</div>
                <div
                  className={`text-base font-bold flex items-center gap-1.5 ${
                    isAce ? 'text-amber-300' : 'text-purple-200'
                  }`}
                >
                  {isAce && <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{player.roleLabel}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAce
                    ? '高危全能路线已进入正赛档案：外界与导师将持续以零短板标尺审视你的每一个舞台。'
                    : '主次定位分工明确：具备清晰长板与稳定托底能力，已做好迎接小组与公演对抗准备。'}
                </p>
              </div>
            </div>

            {/* Final Attributes Grid */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-300">封存面板数值</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                {[
                  { label: 'Vocal', value: stats.vocal, color: 'text-white' },
                  { label: 'Dance', value: stats.dance, color: 'text-white' },
                  { label: 'Rap', value: stats.rap, color: 'text-white' },
                  { label: 'Stage', value: stats.stage, color: 'text-purple-300' },
                  {
                    label: '体力/心态',
                    value: `${stats.stamina}/${stats.maxStamina}`,
                    color: 'text-sky-300',
                  },
                  { label: '路人缘', value: stats.publicFavor, color: 'text-emerald-300' },
                  { label: '争议度', value: stats.controversy, color: 'text-amber-300' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-[#0C0D15] border border-slate-800 rounded-lg p-3"
                  >
                    <div className="text-[11px] text-slate-400">{item.label}</div>
                    <div className={`text-lg font-mono-tabular font-bold mt-0.5 ${item.color}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Keepsake & Behavior Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0C0D15] border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>随身信物</span>
                </div>
                {keepsake ? (
                  <>
                    <div className="text-sm font-semibold text-white">{keepsake.name}</div>
                    <div className="text-xs text-slate-300 leading-relaxed">{keepsake.description}</div>
                    <div className="text-xs text-purple-300">{keepsake.imprint}</div>
                  </>
                ) : (
                  <div className="text-xs text-slate-500">未记录信物</div>
                )}
              </div>

              <div className="bg-[#0C0D15] border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="text-xs text-slate-400">序章抉择行为记录</div>
                <div className="text-sm text-slate-200 leading-relaxed">
                  {behaviorTags.length > 0 ? behaviorTags.join(' · ') : '无特殊标签'}
                </div>
                <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  已完成幕次：{prologueProgress.history.length} / 5 幕
                </div>
              </div>
            </div>

            {/* Act 4 Theqoo Hot Post Summary */}
            {theqooPost && (
              <div className="space-y-2.5">
                <h2 className="text-sm font-semibold text-slate-300">破晓上班路热帖战绩留存</h2>
                <TheqooPostCard post={theqooPost} />
              </div>
            )}

            {/* Locked Future Chapters Data Slot Preview (no spoilers) */}
            <div className="bg-[#0C0D15] border border-slate-800/80 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">后续主线数据接口预留（第 1–5 章）</span>
                <span className="text-slate-500 font-mono-tabular">
                  {futureChapters.unlocked ? '已解锁' : '待后续更新解锁'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
                <div className="border border-slate-800/70 rounded-lg px-3 py-2">
                  所属团队：{futureChapters.teamName ?? '待解锁'}
                </div>
                <div className="border border-slate-800/70 rounded-lg px-3 py-2">
                  官方粉丝名：{futureChapters.fandomName ?? '待解锁'}
                </div>
                <div className="border border-slate-800/70 rounded-lg px-3 py-2">
                  顺位记录：{futureChapters.debutRank ?? '待解锁'}
                </div>
              </div>
            </div>

            {/* Export & Restart Actions */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-lg bg-[#1A1C2A] hover:bg-[#232638] border border-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新建卡再玩序章</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-lg bg-[#1A1C2A] hover:bg-[#232638] border border-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>下载存档文件</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickCopy}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '已复制存档 JSON 代码' : '一键复制存档 JSON 代码'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
