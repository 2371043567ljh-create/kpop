import React, { useState } from 'react';
import { Check, Copy, Download, Upload, X } from 'lucide-react';
import { parseSaveData } from '../game/rules';
import type { SaveDataV1 } from '../game/types';

interface SaveImportModalProps {
  isOpen: boolean;
  mode: 'import' | 'export';
  currentSave: SaveDataV1 | null;
  onClose: () => void;
  onImportSuccess: (save: SaveDataV1) => void;
}

export const SaveImportModal: React.FC<SaveImportModalProps> = ({
  isOpen,
  mode,
  currentSave,
  onClose,
  onImportSuccess,
}) => {
  const [importText, setImportText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const exportJson = currentSave ? JSON.stringify(currentSave, null, 2) : '';

  const handleCopy = async () => {
    if (!exportJson) return;
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg('自动复制受限，请手动全选下方 JSON 文本框复制。');
    }
  };

  const handleDownload = () => {
    if (!exportJson || !currentSave) return;
    const blob = new Blob([exportJson], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `star-planet-prologue-${currentSave.player.displayName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setErrorMsg(null);
    const parsed = parseSaveData(importText.trim());
    if (!parsed) {
      setErrorMsg('存档 JSON 格式无效或版本不匹配，请确认复制了完整的序章存档代码。');
      return;
    }
    onImportSuccess(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportText(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4 pt-4 pb-20 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-modal-title"
    >
      <div className="w-full max-w-xl max-h-[calc(100dvh-6.5rem)] sm:max-h-[90vh] flex flex-col bg-[#12131C] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 id="save-modal-title" className="text-lg font-semibold text-white">
            {mode === 'export' ? '导出序章练习生存档 JSON' : '导入序章存档 JSON'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {mode === 'export' ? (
            <>
              <p className="text-sm text-slate-300 leading-relaxed">
                以下 JSON 数据已同步保存至浏览器 LocalStorage，同时预留了第一章至第五章（teamName、fandomName、debutRank 等）扩展接口，可用于后续版本无缝继承。
              </p>
              <textarea
                readOnly
                value={exportJson}
                rows={10}
                aria-label="存档 JSON 代码"
                className="w-full rounded-lg bg-[#09090F] border border-slate-800 p-3 text-xs font-mono-tabular text-slate-300 focus:outline-none focus:border-purple-500"
              />
              {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#1A1C2A] hover:bg-[#232638] border border-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>下载 .json 文件</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '已复制存档代码' : '复制存档 JSON'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300 leading-relaxed">
                粘贴此前导出的《STAR PLANET：序章》JSON 存档代码，或直接上传本地 `.json` 存档文件。
              </p>
              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-[#1A1C2A] hover:bg-[#232638] border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>选择本地 JSON 文件</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                placeholder='{"version": "1.0.0-prologue", ...}'
                aria-label="粘贴存档 JSON 代码"
                className="w-full rounded-lg bg-[#09090F] border border-slate-800 p-3 text-xs font-mono-tabular text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
              {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="px-5 py-2.5 min-h-[44px] rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  解析并读取存档
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
