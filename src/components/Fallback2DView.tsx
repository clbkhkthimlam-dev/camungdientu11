/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sơ đồ 2D tương tác dự phòng (Fallback khi WebGL không khả dụng hoặc khi học sinh chọn đối chiếu sơ đồ phẳng SGK).
 * Phản ánh 100% dữ liệu từ cùng một mô hình vật lí.
 */

import React from 'react';
import {
  MAGNET_MAX_X,
  MAGNET_MIN_X,
  PhysicalInterpretation,
  PhysicsState,
  SimulationParams,
} from '../physics/emPhysics';

interface Fallback2DViewProps {
  state: PhysicsState;
  params: SimulationParams;
  interpretation: PhysicalInterpretation;
  isWebGLFallback: boolean;
  onMagnetSliderChange: (newX: number) => void;
  onToggleSwitch: () => void;
}

export const Fallback2DView: React.FC<Fallback2DViewProps> = ({
  state,
  params,
  interpretation,
  isWebGLFallback,
  onMagnetSliderChange,
  onToggleSwitch,
}) => {
  const isExp1 = params.experiment === 'permanent_magnet';
  // Ánh xạ vị trí magnetX [-4.2, -1.1] sang tọa độ SVG [70, 250]
  const normX = (state.magnetX - MAGNET_MIN_X) / (MAGNET_MAX_X - MAGNET_MIN_X);
  const svgMagnetX = 70 + normX * 180;
  const nRight = params.magnetPolarity === 1;

  return (
    <div className="w-full h-full flex flex-col items-center justify-between bg-slate-950 p-3 sm:p-5 select-none overflow-hidden">
      {isWebGLFallback && (
        <div className="w-full max-w-2xl bg-amber-950/80 border border-amber-700/60 text-amber-200 px-3 py-2 rounded-lg text-xs sm:text-sm mb-2">
          Thiết bị hoặc trình duyệt hiện không khởi tạo được ngữ cảnh 3D WebGL. Ứng dụng đã tự động chuyển sang <strong>Chế độ Sơ đồ 2D tương tác</strong> sử dụng cùng lõi vật lí Faraday–Lenz.
        </div>
      )}

      <div className="w-full max-w-3xl flex-1 flex items-center justify-center min-h-[210px]">
        <svg
          viewBox="0 0 680 280"
          className="w-full h-full max-h-[320px] bg-slate-900/90 rounded-xl border border-slate-800"
          aria-label="Sơ đồ nguyên lí cảm ứng điện từ"
        >
          {/* Trục chính của ống dây */}
          <line
            x1="40"
            y1="140"
            x2="470"
            y2="140"
            stroke="#334155"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
          <text x="48" y="128" fill="#64748b" fontSize="11" fontFamily="monospace">
            Trục cuộn dây (+X →)
          </text>

          {isExp1 ? (
            /* Thí nghiệm 1: Thanh nam châm vĩnh cửu */
            <g transform={`translate(${svgMagnetX}, 112)`}>
              {/* Nửa trái */}
              <rect
                x="-65"
                y="0"
                width="65"
                height="56"
                rx="4"
                fill={nRight ? '#1d4ed8' : '#dc2626'}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
              <text
                x="-32"
                y="35"
                fill="#ffffff"
                fontSize="22"
                fontWeight="bold"
                textAnchor="middle"
              >
                {nRight ? 'S' : 'N'}
              </text>
              {/* Nửa phải */}
              <rect
                x="0"
                y="0"
                width="65"
                height="56"
                rx="4"
                fill={nRight ? '#dc2626' : '#1d4ed8'}
                stroke="#e2e8f0"
                strokeWidth="1.5"
              />
              <text
                x="32"
                y="35"
                fill="#ffffff"
                fontSize="22"
                fontWeight="bold"
                textAnchor="middle"
              >
                {nRight ? 'N' : 'S'}
              </text>
              {/* Đường sức minh họa */}
              <path
                d="M 65 14 Q 115 -25 160 14"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeDasharray="4 3"
              />
              <path
                d="M 65 42 Q 115 81 160 42"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.8"
                strokeDasharray="4 3"
              />
            </g>
          ) : (
            /* Thí nghiệm 2: Nam châm điện & Khóa K */
            <g>
              {/* Cuộn sơ cấp */}
              <rect
                x="135"
                y="102"
                width="115"
                height="76"
                rx="6"
                fill="#1e293b"
                stroke="#d97706"
                strokeWidth="2.5"
              />
              {params.hasIronCore && (
                <rect
                  x="122"
                  y="124"
                  width="142"
                  height="32"
                  rx="3"
                  fill="#64748b"
                />
              )}
              <text
                x="192"
                y="92"
                fill="#fbbf24"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                Cuộn sơ cấp (Ip = {state.primaryCurrent.toFixed(2)} A)
              </text>
              {/* Nút khóa K trực tiếp trên sơ đồ */}
              <g
                onClick={onToggleSwitch}
                className="cursor-pointer"
                transform="translate(130, 212)"
              >
                <rect
                  x="0"
                  y="0"
                  width="125"
                  height="38"
                  rx="8"
                  fill={params.switchClosed ? '#059669' : '#334155'}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <text
                  x="62"
                  y="24"
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Khóa K: {params.switchClosed ? 'ĐANG ĐÓNG' : 'ĐANG MỞ'}
                </text>
              </g>
            </g>
          )}

          {/* Cuộn dây cảm ứng thứ cấp */}
          <g transform="translate(340, 88)">
            <rect
              x="0"
              y="0"
              width="104"
              height="104"
              rx="8"
              fill="#1e293b"
              stroke="#b45309"
              strokeWidth="3"
            />
            {[16, 32, 48, 64, 80, 92].map((lx) => (
              <line
                key={lx}
                x1={lx}
                y1="2"
                x2={lx}
                y2="102"
                stroke="#f59e0b"
                strokeWidth="3.5"
              />
            ))}
            <text
              x="52"
              y="-10"
              fill="#f8fafc"
              fontSize="13"
              fontWeight="bold"
              textAnchor="middle"
            >
              Cuộn dây cảm ứng
            </text>
            {interpretation.hasInducedCurrent && (
              <text
                x="-8"
                y="56"
                fill={state.secondaryCurrent < 0 ? '#ef4444' : '#3b82f6'}
                fontSize="13"
                fontWeight="bold"
                textAnchor="end"
              >
                {interpretation.lenzCoilFacePole}
              </text>
            )}
          </g>

          {/* Dây dẫn sang điện kế */}
          <line x1="444" y1="115" x2="518" y2="115" stroke="#f59e0b" strokeWidth="3" />
          <line x1="444" y1="165" x2="518" y2="165" stroke="#d97706" strokeWidth="3" />

          {/* Điện kế kim G */}
          <g transform="translate(585, 140)">
            <circle
              cx="0"
              cy="0"
              r="68"
              fill="#f8fafc"
              stroke="#334155"
              strokeWidth="5"
            />
            <text
              x="0"
              y="-38"
              fill="#0f172a"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
            >
              0
            </text>
            <text
              x="-42"
              y="-12"
              fill="#1d4ed8"
              fontSize="13"
              fontWeight="bold"
              textAnchor="middle"
            >
              −
            </text>
            <text
              x="42"
              y="-12"
              fill="#b91c1c"
              fontSize="13"
              fontWeight="bold"
              textAnchor="middle"
            >
              +
            </text>
            <text
              x="0"
              y="42"
              fill="#0f172a"
              fontSize="20"
              fontWeight="bold"
              textAnchor="middle"
            >
              G
            </text>
            {/* Kim điện kế xoay theo góc thật */}
            <g transform={`rotate(${state.needleAngleDeg})`}>
              <line
                x1="0"
                y1="14"
                x2="0"
                y2="-52"
                stroke="#dc2626"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
            <circle cx="0" cy="0" r="6" fill="#0f172a" />
          </g>
        </svg>
      </div>

      {isExp1 && (
        <div className="w-full max-w-md mt-2 flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
            Kéo vị trí nam châm:
          </span>
          <input
            type="range"
            min={MAGNET_MIN_X}
            max={MAGNET_MAX_X}
            step={0.02}
            value={state.magnetX}
            onChange={(e) => onMagnetSliderChange(parseFloat(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
