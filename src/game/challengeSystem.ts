/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hệ thống thử thách trò chơi "Nhà Vật Lý Cảm Ứng Điện Từ Nhí" (Game Challenge Mode)
 * - Tích hợp các màn thử thách từ cơ bản đến nâng cao
 * - Đo lường tiến độ real-time theo trạng thái vật lý thực tế
 * - Chấm sao, tính điểm, streak và huân chương thành tích
 */

import { PhysicsState, SimulationParams } from '../physics/emPhysics';

export interface GameChallenge {
  id: string;
  levelNumber: number;
  title: string;
  subtitle: string;
  description: string;
  hint: string;
  badge: string;
  targetExperiment: 'permanent_magnet' | 'electromagnet' | 'any';
  targetMetricName: string;
  targetValue: number;
  checkProgress: (
    state: PhysicsState,
    params: SimulationParams,
    customData: Record<string, number>
  ) => {
    progress: number; // 0.0 .. 1.0
    displayValue: string;
    isComplete: boolean;
    streakStep?: boolean;
  };
}

export const GAME_CHALLENGES: GameChallenge[] = [
  {
    id: 'light_red_led',
    levelNumber: 1,
    title: 'Cực Quang Đỏ: Tăng Từ Thông',
    subtitle: 'Lao tới với tốc độ cao để thắp sáng LED Đỏ',
    description:
      'Định luật Lenz chỉ ra rằng khi từ thông Φ qua ống dây tăng, dòng điện cảm ứng sinh ra để chống lại sự tăng. Hãy đẩy nam châm thật nhanh lại gần cuộn dây để LED Đỏ đạt độ sáng ≥ 80%!',
    hint: 'Nắm thanh nam châm hoặc cuộn dây rồi trượt thật nhanh lại gần nhau (vận tốc v > 0.8 m/s).',
    badge: '⚡ Tia Chớp Đỏ',
    targetExperiment: 'permanent_magnet',
    targetMetricName: 'Độ sáng LED Đỏ',
    targetValue: 80,
    checkProgress: (state) => {
      const b = (state.redLedBrightness ?? 0) * 100;
      return {
        progress: Math.min(1, b / 80),
        displayValue: `${Math.round(b)}% / 80%`,
        isComplete: b >= 78,
      };
    },
  },
  {
    id: 'light_green_led',
    levelNumber: 2,
    title: 'Lục Bảo Ngọc: Giảm Từ Thông',
    subtitle: 'Rút lui dứt khoát để thắp sáng LED Xanh',
    description:
      'Khi từ thông Φ giảm (kéo nam châm lùi xa), dòng cảm ứng sẽ đổi chiều để chống lại sự giảm. Hãy rút nam châm ra xa cuộn dây thật dứt khoát để làm sáng bóng LED Xanh!',
    hint: 'Kéo nam châm đang ở gần cuộn dây giật lùi nhanh về phía ngoài bệ bàn.',
    badge: '🌿 Sóng Ngọc Lục',
    targetExperiment: 'permanent_magnet',
    targetMetricName: 'Độ sáng LED Xanh',
    targetValue: 80,
    checkProgress: (state) => {
      const b = (state.greenLedBrightness ?? 0) * 100;
      return {
        progress: Math.min(1, b / 80),
        displayValue: `${Math.round(b)}% / 80%`,
        isComplete: b >= 78,
      };
    },
  },
  {
    id: 'ac_oscillation',
    levelNumber: 3,
    title: 'Máy Phát Điện AC: Nhịp Điệu Xoay Chiều',
    subtitle: 'Đổi chiều dòng điện liên tục 5 lần',
    description:
      'Các nhà máy phát điện tạo ra dòng điện xoay chiều AC bằng cách liên tục thay đổi từ trường qua cuộn dây. Hãy dao động nam châm tiến-lùi nhịp nhàng để đạt chuỗi 5 lần đổi chiều liên tiếp!',
    hint: 'Đưa nam châm vào rồi rút ra liên tục mà không dừng lại quá lâu.',
    badge: '🔄 Bậc Thầy Xoay Chiều AC',
    targetExperiment: 'permanent_magnet',
    targetMetricName: 'Số lần đổi chiều',
    targetValue: 5,
    checkProgress: (state, _params, customData) => {
      const streak = customData.acStreak ?? 0;
      return {
        progress: Math.min(1, streak / 5),
        displayValue: `${streak} / 5 nhịp`,
        isComplete: streak >= 5,
      };
    },
  },
  {
    id: 'high_voltage_peak',
    levelNumber: 4,
    title: 'Xung Điện Faraday: Đạt Điện Áp ≥ 45V',
    subtitle: 'Tạo suất điện động cảm ứng cực đại',
    description:
      'Độ lớn của suất điện động cảm ứng tỉ lệ với tốc độ biến thiên từ thông |dΦ/dt|. Hãy thao tác nhanh nhất có thể (hoặc nhấc bổng cuộn dây rồi thả snap xuống) để đạt |E| ≥ 45V!',
    hint: 'Bật chế độ Tự động di chuyển với tốc độ Cao, hoặc dùng chuột kéo cực nhanh.',
    badge: '⚡ Siêu Tụ Điện 45V',
    targetExperiment: 'any',
    targetMetricName: 'Điện áp cực đại |E|',
    targetValue: 45,
    checkProgress: (state) => {
      const emf = Math.abs(state.emf);
      return {
        progress: Math.min(1, emf / 45),
        displayValue: `${emf.toFixed(1)}V / 45.0V`,
        isComplete: emf >= 44.5,
      };
    },
  },
  {
    id: 'electromagnet_switch_pulse',
    levelNumber: 5,
    title: 'Dòng Xung Sơ Cấp: Thí Nghiệm Oersted–Faraday',
    subtitle: 'Đóng/ngắt mạch sơ cấp tạo xung kim lệch ≥ 25°',
    description:
      'Chuyển sang Thí nghiệm 2 (Nam châm điện). Khi bật hoặc ngắt khóa K, dòng điện sơ cấp thay đổi đột ngột làm từ trường biến thiên, sinh ra dòng cảm ứng tức thời trong ống dây thứ cấp!',
    hint: 'Chọn Thí nghiệm 2 (Nam châm điện), đưa cuộn sơ cấp lại gần cuộn thứ cấp, rồi bấm khóa K!',
    badge: '🔬 Bác Học Oersted',
    targetExperiment: 'electromagnet',
    targetMetricName: 'Góc lệch kim điện kế',
    targetValue: 25,
    checkProgress: (state, params) => {
      if (params.experiment !== 'electromagnet') {
        return {
          progress: 0,
          displayValue: 'Cần chọn TN2 (Nam châm điện)',
          isComplete: false,
        };
      }
      const angle = Math.abs(state.needleAngleDeg);
      return {
        progress: Math.min(1, angle / 25),
        displayValue: `${angle.toFixed(1)}° / 25.0°`,
        isComplete: angle >= 24.5,
      };
    },
  },
];
