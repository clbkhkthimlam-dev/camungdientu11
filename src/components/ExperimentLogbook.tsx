/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bảng Nhật Ký Thí Nghiệm Ảo (Virtual Experiment Log & Comparison Table)
 * - Cho phép học sinh lưu lại các thông số thí nghiệm: Tốc độ v, Từ thông Φ, Biến thiên dΦ/dt, Suất điện động E, Dòng i, Góc kim G.
 * - So sánh đối chiếu trực quan giữa các lần thực hiện (chứng minh định luật Faraday E tỉ lệ với tốc độ biến thiên từ thông).
 * - Lưu trữ bền vững qua localStorage, hỗ trợ chỉnh sửa ghi chú cá nhân, xuất file CSV và sao chép bảng số liệu.
 */

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Tag,
  Clock,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../audio/emAudio';

export interface ExperimentLogEntry {
  id: string;
  trialNumber: number;
  timeStr: string;
  experimentName: string;
  velocity: number; // m/s
  fluxMWb: number; // mWb
  dPhiDtMWb: number; // mWb/s
  emf: number; // V
  currentMA: number; // mA
  needleAngle: number; // deg
  activeLed: 'red' | 'green' | 'none';
  elevationY: number; // m
  turnsN: number;
  userNote: string;
}

interface ExperimentLogbookProps {
  entries: ExperimentLogEntry[];
  onAddCurrentSnapshot: () => void;
  onUpdateNote: (id: string, newNote: string) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
  onClose?: () => void;
  currentPreview: {
    velocity: number;
    fluxMWb: number;
    dPhiDtMWb: number;
    emf: number;
    currentMA: number;
    needleAngle: number;
    activeLed: 'red' | 'green' | 'none';
    elevationY: number;
  };
}

export function ExperimentLogbook({
  entries,
  onAddCurrentSnapshot,
  onUpdateNote,
  onDeleteEntry,
  onClearAll,
  currentPreview,
}: ExperimentLogbookProps) {
  const [copied, setCopied] = useState(false);
  const [filterExp, setFilterExp] = useState<'all' | 'permanent_magnet' | 'electromagnet'>('all');

  // Tìm giá trị cực đại để highlight
  const maxAbsEmf = entries.reduce(
    (max, e) => Math.max(max, Math.abs(e.emf)),
    0
  );
  const maxAbsVel = entries.reduce(
    (max, e) => Math.max(max, Math.abs(e.velocity)),
    0
  );

  const filteredEntries = entries.filter((e) => {
    if (filterExp === 'permanent_magnet') return e.experimentName.includes('Nam châm vĩnh cửu');
    if (filterExp === 'electromagnet') return e.experimentName.includes('Nam châm điện');
    return true;
  });

  const handleCopyClipboard = () => {
    if (entries.length === 0) return;
    soundEngine.playUiTap();
    const headers = [
      'Lần đo',
      'Thời gian',
      'Thí nghiệm',
      'Số vòng N',
      'Tốc độ v (m/s)',
      'Từ thông Φ (mWb)',
      'dΦ/dt (mWb/s)',
      'Suất điện động E (V)',
      'Dòng cảm ứng i (mA)',
      'Góc lệch kim (°)',
      'Đèn LED',
      'Độ cao Y (m)',
      'Ghi chú',
    ];
    const rows = entries.map((e) => [
      `#${e.trialNumber}`,
      e.timeStr,
      e.experimentName,
      e.turnsN,
      e.velocity.toFixed(2),
      e.fluxMWb.toFixed(2),
      e.dPhiDtMWb.toFixed(2),
      e.emf.toFixed(2),
      e.currentMA.toFixed(1),
      e.needleAngle.toFixed(1),
      e.activeLed === 'red' ? 'LED Đỏ (Φ↑)' : e.activeLed === 'green' ? 'LED Xanh (Φ↓)' : 'Tắt',
      e.elevationY.toFixed(2),
      `"${e.userNote.replace(/"/g, '""')}"`,
    ]);
    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;
    soundEngine.playUiTap();
    const headers = [
      'Lần đo',
      'Thời gian',
      'Thí nghiệm',
      'Số vòng N',
      'Tốc độ v (m/s)',
      'Từ thông Phi (mWb)',
      'dPhi/dt (mWb/s)',
      'Suất điện động E (V)',
      'Dòng cảm ứng i (mA)',
      'Góc lệch kim (độ)',
      'Đèn LED',
      'Độ cao Y (m)',
      'Ghi chú',
    ];
    const rows = entries.map((e) => [
      e.trialNumber,
      `"${e.timeStr}"`,
      `"${e.experimentName}"`,
      e.turnsN,
      e.velocity.toFixed(3),
      e.fluxMWb.toFixed(3),
      e.dPhiDtMWb.toFixed(3),
      e.emf.toFixed(3),
      e.currentMA.toFixed(2),
      e.needleAngle.toFixed(2),
      `"${e.activeLed === 'red' ? 'Đỏ' : e.activeLed === 'green' ? 'Xanh' : 'Tắt'}"`,
      e.elevationY.toFixed(3),
      `"${e.userNote.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nhat_ky_thi_nghiem_cam_ung_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* 1. Header Bảng nhật ký */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Nhật Ký Thí Nghiệm & Bảng So Sánh
              <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                {entries.length} lần đo
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Lưu trữ & so sánh quan hệ giữa Tốc độ v, Từ thông Φ và Suất điện động E
            </p>
          </div>
        </div>

        {/* Nút tác vụ nhanh: Thêm lần đo hiện tại, Copy, Xuất CSV */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              soundEngine.playProgressDing(entries.length + 1);
              onAddCurrentSnapshot();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            title="Lưu lại toàn bộ thông số tức thời của thí nghiệm hiện tại vào bảng"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Ghi số liệu hiện tại</span>
          </button>

          {entries.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopyClipboard}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Sao chép bảng số liệu để dán vào Excel / Google Sheets"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sao chép</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                title="Tải bảng số liệu về máy định dạng file .csv"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xuất CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn xóa tất cả số liệu trong nhật ký?')) {
                    soundEngine.playUiTap();
                    onClearAll();
                  }
                }}
                className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                title="Xóa toàn bộ nhật ký"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Banner Thông số Trực tiếp Hiện Tại (Live Preview Strip) */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shrink-0">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-sans font-semibold text-slate-400 text-[11px]">Đang đo trực tiếp:</span>
          <span>v={currentPreview.velocity.toFixed(2)}m/s</span>
          <span className="text-slate-600">·</span>
          <span>Φ={currentPreview.fluxMWb.toFixed(2)}mWb</span>
          <span className="text-slate-600">·</span>
          <span className="text-amber-300 font-bold">E={currentPreview.emf >= 0 ? `+${currentPreview.emf.toFixed(2)}` : currentPreview.emf.toFixed(2)}V</span>
          <span className="text-slate-600">·</span>
          <span>i={currentPreview.currentMA.toFixed(1)}mA</span>
        </div>

        {currentPreview.activeLed !== 'none' && (
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1 ${
              currentPreview.activeLed === 'red'
                ? 'bg-rose-950 text-rose-300 border border-rose-600/50'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                currentPreview.activeLed === 'red' ? 'bg-red-500' : 'bg-emerald-400'
              }`}
            />
            {currentPreview.activeLed === 'red' ? 'LED Đỏ (Φ tăng)' : 'LED Xanh (Φ giảm)'}
          </span>
        )}
      </div>

      {/* 3. Vùng Bảng số liệu so sánh chi tiết */}
      <div className="flex-1 overflow-auto p-3">
        {filteredEntries.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">Chưa có số liệu nào được ghi</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
              Hãy bấm nút <strong className="text-amber-400 font-semibold">"Ghi số liệu hiện tại"</strong> ở trên khi di chuyển nam châm hoặc thay đổi mạch để lưu lại các lần đo và so sánh!
            </p>
            <button
              type="button"
              onClick={() => {
                soundEngine.playProgressDing(1);
                onAddCurrentSnapshot();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ghi lần đo #1 ngay bây giờ</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bảng so sánh responsive */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 shadow-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3 whitespace-nowrap">Lần đo</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Thời gian</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Thí nghiệm</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Tốc độ v</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Từ thông Φ</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">dΦ/dt</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Suất điện động E</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-right">Dòng i</th>
                    <th className="py-2.5 px-3 whitespace-nowrap text-center">Đèn LED</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Ghi chú cá nhân</th>
                    <th className="py-2.5 px-2 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                  {filteredEntries.map((entry) => {
                    const isMaxEmf = maxAbsEmf > 0 && Math.abs(entry.emf) >= maxAbsEmf - 0.01;
                    const isMaxVel = maxAbsVel > 0 && Math.abs(entry.velocity) >= maxAbsVel - 0.01;

                    return (
                      <tr
                        key={entry.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isMaxEmf ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        {/* Lần đo */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-amber-400">#{entry.trialNumber}</span>
                          {isMaxEmf && (
                            <span className="ml-1 text-[10px] font-sans font-bold bg-amber-500/30 text-amber-300 border border-amber-500/50 px-1 py-0.2 rounded">
                              Max E
                            </span>
                          )}
                        </td>

                        {/* Thời gian */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 text-[11px]">
                          {entry.timeStr}
                        </td>

                        {/* Tên TN */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-sans text-xs text-slate-300">
                          {entry.experimentName}
                          <span className="ml-1 text-[10px] text-slate-400">({entry.turnsN} vòng)</span>
                        </td>

                        {/* Tốc độ v */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right">
                          <span
                            className={
                              isMaxVel
                                ? 'text-amber-300 font-bold'
                                : Math.abs(entry.velocity) > 0.5
                                  ? 'text-sky-300'
                                  : 'text-slate-300'
                            }
                          >
                            {entry.velocity.toFixed(2)} m/s
                          </span>
                        </td>

                        {/* Từ thông Φ */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right text-slate-300">
                          {entry.fluxMWb.toFixed(2)} mWb
                        </td>

                        {/* Tốc độ biến thiên dΦ/dt */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right">
                          <span
                            className={
                              Math.abs(entry.dPhiDtMWb) > 0.01
                                ? entry.dPhiDtMWb > 0
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                                : 'text-slate-400'
                            }
                          >
                            {entry.dPhiDtMWb >= 0 ? `+${entry.dPhiDtMWb.toFixed(2)}` : entry.dPhiDtMWb.toFixed(2)}{' '}
                            mWb/s
                          </span>
                        </td>

                        {/* Suất điện động E */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right">
                          <span
                            className={`font-bold text-sm ${
                              isMaxEmf
                                ? 'text-amber-300 font-black drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
                                : Math.abs(entry.emf) > 5
                                  ? 'text-sky-300'
                                  : 'text-slate-200'
                            }`}
                          >
                            {entry.emf >= 0 ? `+${entry.emf.toFixed(2)}` : entry.emf.toFixed(2)} V
                          </span>
                        </td>

                        {/* Dòng điện i */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-right text-slate-300">
                          {entry.currentMA.toFixed(1)} mA
                        </td>

                        {/* Đèn LED */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center font-sans">
                          {entry.activeLed === 'red' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              Đỏ (Φ↑)
                            </span>
                          ) : entry.activeLed === 'green' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Xanh (Φ↓)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">Tắt</span>
                          )}
                        </td>

                        {/* Ghi chú cá nhân (cho phép gõ trực tiếp) */}
                        <td className="py-2 px-3 font-sans">
                          <input
                            type="text"
                            value={entry.userNote}
                            placeholder="Nhập ghi chú quan sát..."
                            onChange={(e) => onUpdateNote(entry.id, e.target.value)}
                            className="w-full min-w-[140px] max-w-[240px] bg-slate-950/80 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                          />
                        </td>

                        {/* Nút xóa */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiTap();
                              onDeleteEntry(entry.id);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Xóa lần đo này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. Thẻ Nhận Xét Khoa Học Đối Chiếu Tự Động (Scientific Comparison Insights) */}
            {entries.length >= 2 && (
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3.5 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                    Nhận xét rút ra từ số liệu thực nghiệm:
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300 leading-relaxed font-sans">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-sky-300 block mb-0.5">
                      1. Về độ lớn suất điện động (Định luật Faraday):
                    </strong>
                    <p>
                      Khi tốc độ dịch chuyển <span className="font-mono text-amber-300">v</span> tăng lên,
                      tốc độ biến thiên từ thông <span className="font-mono text-amber-300">|dΦ/dt|</span> càng lớn,
                      dẫn tới suất điện động cảm ứng <span className="font-mono text-amber-300">|E|</span> tăng theo tỉ lệ thuận.
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-emerald-300 block mb-0.5">
                      2. Về chiều dòng điện (Định luật Lenz):
                    </strong>
                    <p>
                      Khi <span className="font-mono text-rose-300">dΦ/dt &gt; 0</span> (kéo lại gần, từ thông tăng): LED Đỏ sáng.
                      Khi <span className="font-mono text-emerald-300">dΦ/dt &lt; 0</span> (rút ra xa, từ thông giảm): LED Xanh sáng.
                      Chiều dòng cảm ứng luôn chống lại sự biến thiên của từ thông ban đầu.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
