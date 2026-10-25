/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Giao diện Chế độ Trò chơi & Thử thách Cảm ứng Điện từ (Game Challenge Mode)
 * - Tích hợp đầy đủ theo tiêu chuẩn Game Shell & Encounter Design
 * - Thanh mục tiêu thấp chiếm <15% không gian, trực quan, hỗ trợ âm thanh thực và trạng thái tiến độ thời gian thực
 */

import React from 'react';
import {
  Trophy,
  Star,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
} from 'lucide-react';
import { GAME_CHALLENGES, GameChallenge } from '../game/challengeSystem';
import { soundEngine } from '../audio/emAudio';

interface GameChallengePanelProps {
  currentLevelIndex: number;
  onSelectLevel: (index: number) => void;
  progress: number;
  displayValue: string;
  isComplete: boolean;
  starsByLevel: Record<number, number>;
  onNextLevel: () => void;
  onResetLevel: () => void;
  onExitGameMode: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function GameChallengePanel({
  currentLevelIndex,
  onSelectLevel,
  progress,
  displayValue,
  isComplete,
  starsByLevel,
  onNextLevel,
  onResetLevel,
  onExitGameMode,
  isMuted,
  onToggleMute,
}: GameChallengePanelProps) {
  const currentChallenge: GameChallenge =
    GAME_CHALLENGES[currentLevelIndex] || GAME_CHALLENGES[0];
  const totalStars = Object.values(starsByLevel).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Thanh trạng thái Game Shell ghim trên đầu màn hình */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-3 pointer-events-auto">
        <div className="bg-slate-900/90 border border-amber-500/35 rounded-2xl p-3 shadow-2xl backdrop-blur-md">
          {/* Hàng trên: Màn chơi, Tiêu đề, Huy hiệu và Nút điều khiển */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-lg text-xs tracking-wider border border-amber-500/40">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                MÀN {currentChallenge.levelNumber}/{GAME_CHALLENGES.length}
              </span>
              <h2 className="text-sm md:text-base font-bold text-slate-100 flex items-center gap-1.5">
                {currentChallenge.title}
                <span className="hidden sm:inline-block text-xs font-medium text-amber-400/90 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                  {currentChallenge.badge}
                </span>
              </h2>
            </div>

            {/* Cụm công cụ: Âm thanh, Reset, Điểm sao & Thoát */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{totalStars}★</span>
              </div>

              <button
                type="button"
                onClick={onToggleMute}
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              <button
                type="button"
                onClick={onResetLevel}
                title="Thử lại màn này"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onExitGameMode}
                title="Quay lại Phòng thí nghiệm tự do"
                className="flex items-center gap-1 text-xs font-medium bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tự do</span>
              </button>
            </div>
          </div>

          {/* Hàng giữa: Mô tả nhiệm vụ & Thanh tiến độ thời gian thực */}
          <div className="mt-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-xs text-slate-300 flex-1">
              <p className="line-clamp-2 md:line-clamp-1">
                <strong className="text-amber-400">Nhiệm vụ: </strong>
                {currentChallenge.description}
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5 hidden sm:block">
                💡 <span className="italic">{currentChallenge.hint}</span>
              </p>
            </div>

            {/* Thanh tiến độ */}
            <div className="w-full md:w-64 flex flex-col gap-1 shrink-0">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Target className="w-3 h-3 text-sky-400" />
                  {currentChallenge.targetMetricName}:
                </span>
                <span className="font-bold text-amber-300">{displayValue}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-400 transition-all duration-150 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Hàng dưới: Bộ chọn nhanh 5 màn chơi */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 mr-1">
              Chọn màn:
            </span>
            {GAME_CHALLENGES.map((lvl, idx) => {
              const stars = starsByLevel[idx] || 0;
              const isActive = idx === currentLevelIndex;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiTap();
                    onSelectLevel(idx);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : stars > 0
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60'
                        : 'bg-slate-800/70 text-slate-300 border border-slate-700/60 hover:bg-slate-700'
                  }`}
                >
                  <span>Màn {lvl.levelNumber}</span>
                  {stars > 0 && (
                    <CheckCircle2
                      className={`w-3 h-3 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Chiến Thắng / Hoàn Thành Màn Chơi (Victory Modal) */}
      {isComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center transform scale-100">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <Sparkles className="w-9 h-9 text-slate-950 animate-bounce" />
            </div>

            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className="w-7 h-7 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                />
              ))}
            </div>

            <h3 className="text-2xl font-black text-slate-100 tracking-tight">
              XUẤT SẮC! HOÀN THÀNH MÀN {currentChallenge.levelNumber}
            </h3>

            <p className="text-amber-400 font-bold text-sm mt-1">
              Huy hiệu nhận được: {currentChallenge.badge}
            </p>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 my-5 text-left text-xs text-slate-300 leading-relaxed">
              <strong className="text-amber-300 block mb-1">
                🔬 Bài học Vật lý KHTN 9:
              </strong>
              {currentChallenge.id === 'light_red_led' && (
                <p>
                  Khi đưa nam châm lại gần cuộn dây, từ thông Φ tăng, dòng điện cảm
                  ứng chạy theo chiều làm sáng LED Đỏ và mặt cuộn dây trở thành cực
                  cùng tên để đẩy nam châm (Định luật Lenz).
                </p>
              )}
              {currentChallenge.id === 'light_green_led' && (
                <p>
                  Khi rút nam châm ra xa, từ thông Φ giảm, dòng điện cảm ứng lập
                  tức đổi chiều làm sáng LED Xanh và mặt cuộn dây hút nam châm lại.
                </p>
              )}
              {currentChallenge.id === 'ac_oscillation' && (
                <p>
                  Sự đảo chiều liên tục của từ thông khi chuyển động qua lại tạo
                  nên dòng điện xoay chiều (AC), nguyên lý của mọi máy phát điện
                  trong đời sống!
                </p>
              )}
              {currentChallenge.id === 'high_voltage_peak' && (
                <p>
                  Suất điện động cảm ứng E = −N·(dΦ/dt). Tốc độ dịch chuyển càng
                  nhanh thì điện thế sinh ra càng lớn, kim điện kế lệch càng xa.
                </p>
              )}
              {currentChallenge.id === 'electromagnet_switch_pulse' && (
                <p>
                  Chỉ trong khoảnh khắc đóng/ngắt mạch sơ cấp mới có dòng cảm
                  ứng, vì khi dòng điện ổn định thì từ trường không đổi (dΦ/dt = 0).
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onResetLevel}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Thử lại
              </button>

              {currentLevelIndex < GAME_CHALLENGES.length - 1 ? (
                <button
                  type="button"
                  onClick={onNextLevel}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  Màn tiếp theo
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onExitGameMode}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-4 h-4" />
                  Đã phá đảo!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
