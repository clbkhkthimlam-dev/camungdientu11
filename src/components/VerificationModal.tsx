/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hộp thoại Kiểm thử Tự động & Báo cáo Môi trường / Giới hạn Mô hình (Mục 10 & Mục 13 đặc tả).
 */

import React, { useMemo } from 'react';
import { CheckCircle2, X, ShieldCheck, Info } from 'lucide-react';
import { runAllPhysicsTests } from '../tests/physicsTests';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSoftwareGl: boolean;
  fullscreenSupportStatus: string;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  isSoftwareGl,
  fullscreenSupportStatus,
}) => {
  const testResults = useMemo(() => (isOpen ? runAllPhysicsTests() : []), [isOpen]);
  const passedCount = testResults.filter((r) => r.passed).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90dvh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2
              id="verification-modal-title"
              className="text-base sm:text-lg font-bold text-slate-100"
            >
              Kiểm thử Vật lí Tự động & Báo cáo Giới hạn Mô hình
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Đóng bảng kiểm thử"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-300">
          {/* Tóm tắt 12 bài kiểm thử vật lí */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">
                1. Kết quả chạy tự động 12 bài kiểm thử vật lí (Faraday–Lenz)
              </h3>
              <span className="font-mono font-semibold text-emerald-400">
                Đạt {passedCount}/{testResults.length} tiêu chí
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {testResults.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                >
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        t.passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    />
                    <span>{t.title}</span>
                  </div>
                  <span className="font-mono text-xs text-slate-400 sm:text-right">
                    {t.details}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Giả thiết khoa học & giới hạn mô hình */}
          <section className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>2. Quy ước dấu, Giả thiết Khoa học & Giới hạn Mô phỏng</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 leading-relaxed">
              <li>
                <strong>Mô hình giáo dục chuẩn hóa:</strong> Các đại lượng từ thông (Φ), suất điện động (E), dòng điện (I) và góc lệch kim điện kế là <em>giá trị đã chuẩn hóa phục vụ học tập</em>, không phải số đo hiệu chuẩn của một dụng cụ thực nghiệm cụ thể.
              </li>
              <li>
                <strong>Quy ước trục và pháp tuyến cố định:</strong> Trục cuộn dây cố định dọc trục X, pháp tuyến dương hướng từ trái sang phải (+X). Mọi tính toán dấu của E = −N·dΦ/dt đều tham chiếu tới pháp tuyến này, hoàn toàn độc lập với góc xoay camera.
              </li>
              <li>
                <strong>Mạch thứ cấp và Nam châm điện:</strong> Mặc định dùng mô hình thuần trở lớp học (I_s = E / R_total, bỏ qua độ tự cảm thứ cấp) hoặc có thể chuyển sang mô hình RL thứ cấp trong phần cài đặt nâng cao. Khi ngắt công tắc khóa K ở Thí nghiệm 2, dòng điện sơ cấp suy giảm theo hàm mũ với hằng số thời gian xả τ_off (giả định có đường xả nội trở, không mô phỏng hồ quang điện).
              </li>
              <li>
                <strong>Biểu diễn trực quan 3D:</strong> Cuộn dây cảm ứng vẽ 32 vòng dây đồng 3D để nhìn rõ lòng ống, trong khi mô hình toán học tính với N = 200 vòng. Đường sức từ và các hạt sáng chỉ chiều dòng điện quy ước là công cụ trực quan định tính (chiều dòng điện quy ước ngược chiều dịch chuyển có hướng của electron trong dây kim loại).
              </li>
            </ul>
          </section>

          {/* Báo cáo trung thực môi trường kiểm thử */}
          <section className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-slate-100">
              3. Báo cáo Trung thực Môi trường Kiểm thử (Section 10.3 Spec V2)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="font-semibold text-slate-200">
                  Trình duyệt Web & Responsive Emulation
                </div>
                <div className="text-emerald-400 font-mono mt-0.5">
                  ĐÃ KIỂM THỬ TRÌNH DUYỆT / MÔ PHỎNG KÍCH THƯỚC
                </div>
                <p className="text-slate-400 mt-1">
                  Đã kiểm tra bố cục không cuộn ngang ở các độ rộng 320px, 375px, 390px, 430px và 1440px, cùng bộ 12 bài kiểm thử số học Faraday–Lenz.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="font-semibold text-slate-200">
                  Thiết bị iPhone Safari / Android vật lí
                </div>
                <div className="text-amber-400 font-mono mt-0.5">
                  MÔ PHỎNG TRONG MÔI TRƯỜNG CLOUD BUILD (CHƯA THỬ THIẾT BỊ VẬT LÍ)
                </div>
                <p className="text-slate-400 mt-1">
                  Môi trường máy chủ AI Studio không gắn iPhone vật lí. Đã trang bị đầy đủ Pointer Capture, dvh, safe-area-inset và Chế độ Tập trung dự phòng khi Safari iPhone không hỗ trợ Fullscreen API trên thẻ div.
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-400 pt-1 font-mono">
              Trạng thái WebGL hiện tại: {isSoftwareGl ? 'Software WebGL (Đã bật tối ưu nhịp khung hình)' : 'Hardware GPU WebGL'} · Toàn màn hình: {fullscreenSupportStatus}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold min-h-[42px] cursor-pointer"
          >
            Đã hiểu & Quay lại thí nghiệm
          </button>
        </div>
      </div>
    </div>
  );
};
