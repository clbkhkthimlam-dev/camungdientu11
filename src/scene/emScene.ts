/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cảnh 3D phòng thí nghiệm Cảm ứng điện từ với Three.js:
 * 1. Triệt tiêu hoàn toàn hiện tượng chớp nháy (Z-fighting) nhờ tách biệt hình học tuyệt đối và tối ưu Depth Buffer.
 * 2. Bàn thí nghiệm gỗ sồi thật có 4 chân thép sơn tĩnh điện, khung giằng chữ H, chân đế cao su và mặt sàn phòng thí nghiệm.
 * 3. Tất cả thiết bị đặt trên bàn (Nam châm, Cuộn dây cảm ứng, Điện kế G, Nam châm điện, Bộ nguồn DC, Khóa K) đều có thể nắm kéo dời qua lại trên mặt bàn, dây dẫn tự động co giãn theo vị trí mới.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  clampCoilX,
  clampMagnetX,
  COIL_CENTER_X,
  ELECTROMAGNET_DEFAULT_X,
  GALVANOMETER_MAX_DEG,
  InteractionMode,
  MAGNET_DEFAULT_X,
  PhysicsState,
  SimulationParams,
} from '../physics/emPhysics';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3(1, 1, 1);
const _dragPlane = new THREE.Plane();
const _tableHorizontalPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.35);
const _tableElevatedPlane = new THREE.Plane();
const _rayIntersect = new THREE.Vector3();

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/** Tạo vân gỗ sồi tự nhiên ấm áp cho mặt bàn thí nghiệm */
function createWoodTableTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Nền gỗ sồi ấm
  const baseGrad = ctx.createLinearGradient(0, 0, 1024, 512);
  baseGrad.addColorStop(0, '#784b2a');
  baseGrad.addColorStop(0.5, '#855532');
  baseGrad.addColorStop(1, '#6e4324');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Các thớ gỗ chạy dọc theo chiều dài mặt bàn
  for (let i = 0; i < 140; i++) {
    const y = (i / 140) * 512;
    const h = 2 + (i % 5);
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(55, 30, 12, 0.14)' : 'rgba(210, 160, 110, 0.08)';
    ctx.fillRect(0, y, 1024, h);
  }

  // Đường ghép ván gỗ tinh tế
  ctx.strokeStyle = 'rgba(40, 20, 8, 0.22)';
  ctx.lineWidth = 2;
  for (let r = 1; r < 6; r++) {
    const py = (r / 6) * 512;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(1024, py);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Tạo texture nhãn cực nam châm N / S độ phân giải cao 2048x1024, sắc nét ở mọi góc nhìn */
function createMagnetPoleTexture(
  maxAnisotropy: number,
  nRight: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const leftIsN = !nRight;

  // Nửa trái (u = 0 .. 0.5)
  const gradLeft = ctx.createLinearGradient(0, 0, 1024, 1024);
  if (leftIsN) {
    gradLeft.addColorStop(0, '#ef4444');
    gradLeft.addColorStop(0.5, '#dc2626');
    gradLeft.addColorStop(1, '#991b1b');
  } else {
    gradLeft.addColorStop(0, '#3b82f6');
    gradLeft.addColorStop(0.5, '#2563eb');
    gradLeft.addColorStop(1, '#1e40af');
  }
  ctx.fillStyle = gradLeft;
  ctx.fillRect(0, 0, 1024, 1024);

  // Nửa phải (u = 0.5 .. 1.0)
  const gradRight = ctx.createLinearGradient(1024, 0, 2048, 1024);
  if (!leftIsN) {
    gradRight.addColorStop(0, '#ef4444');
    gradRight.addColorStop(0.5, '#dc2626');
    gradRight.addColorStop(1, '#991b1b');
  } else {
    gradRight.addColorStop(0, '#3b82f6');
    gradRight.addColorStop(0.5, '#2563eb');
    gradRight.addColorStop(1, '#1e40af');
  }
  ctx.fillStyle = gradRight;
  ctx.fillRect(1024, 0, 1024, 1024);

  // Vạch kim loại phân cách chính giữa thanh nam châm
  const centerGrad = ctx.createLinearGradient(988, 0, 1060, 0);
  centerGrad.addColorStop(0, '#64748b');
  centerGrad.addColorStop(0.5, '#f8fafc');
  centerGrad.addColorStop(1, '#475569');
  ctx.fillStyle = centerGrad;
  ctx.fillRect(992, 0, 64, 1024);

  // Đường viền vát sáng sắc nét quanh mặt nam châm
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.lineWidth = 22;
  ctx.strokeRect(14, 14, 2020, 996);

  // Chữ N / S lớn có viền контраст đậm rõ cho người dùng phổ thông dễ quan sát
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawPoleLabel = (
    cx: number,
    letter: string,
    subLabel: string,
    arrowHint: string
  ) => {
    ctx.font = '900 430px "Plus Jakarta Sans", sans-serif';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 24;
    ctx.strokeText(letter, cx, 445);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(letter, cx, 445);

    ctx.font = '800 84px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.fillText(subLabel, cx, 785);

    ctx.font = '700 54px "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
    ctx.fillText(arrowHint, cx, 905);
  };

  drawPoleLabel(
    500,
    leftIsN ? 'N' : 'S',
    leftIsN ? 'CỰC BẮC' : 'CỰC NAM',
    leftIsN ? '◄ B (Ra Bắc)' : '► B (Vào Nam)'
  );
  drawPoleLabel(
    1548,
    leftIsN ? 'S' : 'N',
    leftIsN ? 'CỰC NAM' : 'CỰC BẮC',
    leftIsN ? '◄ B (Vào Nam)' : 'B (Ra Bắc) ►'
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Tạo texture cho 2 mặt đầu mút (+X và -X) của thanh nam châm để nhìn từ đầu nào cũng rõ cực N / S */
function createMagnetEndCapTexture(
  maxAnisotropy: number,
  isNorth: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 340);
  if (isNorth) {
    grad.addColorStop(0, '#ef4444');
    grad.addColorStop(1, '#991b1b');
  } else {
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#1e3a8a');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 18;
  ctx.strokeRect(12, 12, 488, 488);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 260px "Plus Jakarta Sans", sans-serif';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.lineWidth = 16;
  ctx.strokeText(isNorth ? 'N' : 'S', 256, 225);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(isNorth ? 'N' : 'S', 256, 225);

  ctx.font = '800 54px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText(isNorth ? 'CỰC BẮC' : 'CỰC NAM', 256, 415);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Tạo nhãn nổi hướng dẫn 3D sắc nét */
function createBadgeTexture(
  text: string,
  subtext: string,
  accentColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 768, 192);

  const r = 36;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(12, 12, 744, 168, r);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 42px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 384, 72);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtext, 384, 132);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Tạo mặt số điện kế G chuẩn phòng thí nghiệm với độ tương phản cực cao, nhìn rõ vạch chia và số từ mọi cự ly */
function createGalvanometerDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Nền trắng tinh khiết độ tương phản tối đa (không bị xám khi nghiêng góc nhìn)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 1024);

  // Viền ngoài sắc nét
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 22;
  ctx.strokeRect(18, 18, 988, 988);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(38, 38, 948, 948);

  const cx = 512;
  const cy = 675;
  const radius = 435;

  // Dải màu phân cực trái (-) / phải (+) nổi bật phía sau vạch chia
  ctx.lineWidth = 26;
  ctx.strokeStyle = '#dbeafe';
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius - 22,
    THREE.MathUtils.degToRad(-135),
    THREE.MathUtils.degToRad(-90.8)
  );
  ctx.stroke();

  ctx.strokeStyle = '#fee2e2';
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius - 22,
    THREE.MathUtils.degToRad(-89.2),
    THREE.MathUtils.degToRad(-45)
  );
  ctx.stroke();

  // Rãnh gương chống thị sai (Anti-parallax mirror arc)
  const mirrorGrad = ctx.createLinearGradient(160, 260, 864, 260);
  mirrorGrad.addColorStop(0, '#cbd5e1');
  mirrorGrad.addColorStop(0.5, '#f8fafc');
  mirrorGrad.addColorStop(1, '#cbd5e1');
  ctx.strokeStyle = mirrorGrad;
  ctx.lineWidth = 24;
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius - 76,
    THREE.MathUtils.degToRad(-134),
    THREE.MathUtils.degToRad(-46)
  );
  ctx.stroke();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius - 64,
    THREE.MathUtils.degToRad(-134),
    THREE.MathUtils.degToRad(-46)
  );
  ctx.stroke();

  // Cung chính đậm nét
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius,
    THREE.MathUtils.degToRad(-135),
    THREE.MathUtils.degToRad(-45)
  );
  ctx.stroke();

  // Vạch chia độ chi tiết: mỗi 1.25° (vạch nhỏ), 5° (vạch vừa), 15° (vạch lớn + số)
  for (let deg = -45; deg <= 45; deg += 1.25) {
    const rad = THREE.MathUtils.degToRad(-90 + deg);
    const isZero = Math.abs(deg) < 0.01;
    const isMajor = Math.abs(deg % 15) < 0.01;
    const isMedium = Math.abs(deg % 5) < 0.01;
    const innerR = isZero
      ? radius - 68
      : isMajor
        ? radius - 58
        : isMedium
          ? radius - 36
          : radius - 20;
    const outerR = isMajor ? radius + 8 : radius + 3;

    ctx.strokeStyle = isZero
      ? '#059669'
      : isMajor
        ? deg > 0
          ? '#b91c1c'
          : '#1d4ed8'
        : '#0f172a';
    ctx.lineWidth = isZero ? 14 : isMajor ? 11 : isMedium ? 6.5 : 3.2;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * innerR, cy + Math.sin(rad) * innerR);
    ctx.lineTo(cx + Math.cos(rad) * outerR, cy + Math.sin(rad) * outerR);
    ctx.stroke();

    if (isMajor) {
      const textR = radius - 126;
      const tx = cx + Math.cos(rad) * textR;
      const ty = cy + Math.sin(rad) * textR;
      const label = deg === 0 ? '0' : deg > 0 ? `+${deg}` : `${deg}`;

      ctx.font = isZero
        ? '900 64px "IBM Plex Mono", monospace'
        : '900 52px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Viền trắng bảo vệ chữ số cực nét
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.strokeText(label, tx, ty);

      ctx.fillStyle = isZero
        ? '#047857'
        : deg > 0
          ? '#dc2626'
          : '#1d4ed8';
      ctx.fillText(label, tx, ty);
    }
  }

  // Tam giác chuẩn vị trí cân bằng 0 ở đỉnh cung
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius - 28);
  ctx.lineTo(cx - 18, cy - radius - 58);
  ctx.lineTo(cx + 18, cy - radius - 58);
  ctx.closePath();
  ctx.fill();

  // Chữ G lớn và đơn vị rõ ràng
  ctx.fillStyle = '#020617';
  ctx.font = '900 104px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('G', cx, 455);

  ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('ĐIỆN KẾ KIM (µA)', cx, 520);

  // Ký hiệu phân cực lệch trái / phải cực rõ
  ctx.fillStyle = '#1d4ed8';
  ctx.font = '900 58px "IBM Plex Mono", monospace';
  ctx.fillText('◄ −', 175, 515);

  ctx.fillStyle = '#dc2626';
  ctx.fillText('+ ►', 849, 515);

  // Vòng cung tâm kim dưới đáy
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(cx, cy, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('XOAY 360° HOẶC KÉO DỜI TRÊN BÀN', cx, 855);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Tạo mặt hiển thị bộ nguồn DC (Thí nghiệm 2) */
function createPowerSupplyFrontTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 384);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 364);

  ctx.fillStyle = '#020617';
  ctx.fillRect(42, 42, 428, 150);
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, 428, 150);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '700 58px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('6.0 V DC', 256, 115);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NGUỒN ĐIỆN MỘT CHIỀU SƠ CẤP', 256, 168);

  ctx.fillStyle = '#3b82f6';
  ctx.font = '800 44px "IBM Plex Mono", monospace';
  ctx.fillText('− (ÂM)', 140, 275);

  ctx.fillStyle = '#ef4444';
  ctx.fillText('+ (DƯƠNG)', 372, 275);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Tạo texture thước đo milimet khắc laser trên mặt bàn */
function createRulerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 1024, 128);

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 1020, 124);

  ctx.strokeStyle = '#f8fafc';
  ctx.fillStyle = '#fef08a';
  ctx.font = '700 25px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';

  for (let i = 0; i <= 50; i++) {
    const x = 24 + (i / 50) * 976;
    const isMajor = i % 5 === 0;
    ctx.lineWidth = isMajor ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, 4);
    ctx.lineTo(x, isMajor ? 50 : 26);
    ctx.stroke();

    if (isMajor) {
      ctx.fillText(`${i}cm`, x, 92);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/** Tạo mặt bảng mạch Bộ 2 Đèn LED mắc song song ngược cực */
function createLedModuleBoardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 768, 512);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 10;
  ctx.strokeRect(10, 10, 748, 492);

  // Đường mạch đồng song song nối từ 2 cọc đấu dây xuống 2 nhánh LED ngược cực
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(150, 86);
  ctx.lineTo(618, 86);
  ctx.moveTo(150, 405);
  ctx.lineTo(618, 405);
  ctx.moveTo(230, 86);
  ctx.lineTo(230, 405);
  ctx.moveTo(538, 86);
  ctx.lineTo(538, 405);
  ctx.stroke();

  ctx.fillStyle = '#f87171';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('►|— LED ĐỎ', 230, 342);
  ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#fca5a5';
  ctx.fillText('Φ TĂNG (KÉO TỚI)', 230, 376);

  ctx.fillStyle = '#34d399';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('—|◄ LED XANH', 538, 342);
  ctx.font = '700 23px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#6ee7b7';
  ctx.fillText('Φ GIẢM (KÉO LUI)', 538, 376);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('2 LED SONG SONG NGƯỢC CỰC', 384, 462);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface SceneControllerCallbacks {
  onMagnetDragStart: () => void;
  onMagnetDragMove: (newX: number, newY?: number, newZ?: number) => void;
  onMagnetDragEnd: () => void;
  onCoilDragStart: () => void;
  onCoilDragMove: (newCoilX: number, newCoilY?: number, newCoilZ?: number) => void;
  onCoilDragEnd: () => void;
  onElectromagnetDragStart: () => void;
  onElectromagnetDragMove: (newEmX: number) => void;
  onElectromagnetDragEnd: () => void;
  onToggleSwitchClick: () => void;
  onTableSnap?: () => void;
  onGalvanometerRotate?: (angleDeg: number, autoFace: boolean) => void;
}

type DragTargetKind =
  | 'none'
  | 'magnet'
  | 'magnet_lift'
  | 'secondary_coil'
  | 'coil_lift'
  | 'electromagnet_coil'
  | 'galvanometer'
  | 'galvanometer_rotate'
  | 'led_module'
  | 'power_supply'
  | 'knife_switch';

export class EMInductionSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private callbacks: SceneControllerCallbacks;

  // Các nhóm vật thể 3D trên bàn thí nghiệm
  private permanentMagnetGroup: THREE.Group;
  private magnetCarriageGroup!: THREE.Group;
  private magnetFloatingGroup!: THREE.Group;
  private magnetLiftHandle!: THREE.Group;
  private magnetDropLine!: THREE.Mesh;
  private magnetDropShadow!: THREE.Mesh;
  private magnetBodyMesh!: THREE.Mesh;
  private magnetDragRingMat!: THREE.MeshStandardMaterial;
  private magnetGuideBadge!: THREE.Mesh;
  private texPoleNRight: THREE.CanvasTexture;
  private texPoleSRight: THREE.CanvasTexture;
  private texCapN: THREE.CanvasTexture;
  private texCapS: THREE.CanvasTexture;

  private electromagnetGroup: THREE.Group;
  private primaryCoilGroup!: THREE.Group;
  private batteryGroup!: THREE.Group;
  private switchBaseGroup!: THREE.Group;
  private ironCoreMesh!: THREE.Mesh;
  private switchBladeGroup!: THREE.Group;
  private switchGuideBadge!: THREE.Mesh;
  private primaryCoilEmissiveMat!: THREE.MeshStandardMaterial;
  private primaryWiresGroup!: THREE.Group;

  private secondaryCoilGroup: THREE.Group;
  private coilCarriageGroup!: THREE.Group;
  private coilFloatingGroup!: THREE.Group;
  private coilLiftHandle!: THREE.Group;
  private coilDropLine!: THREE.Mesh;
  private coilDropShadow!: THREE.Mesh;
  private lenzRingMat!: THREE.MeshStandardMaterial;
  private coilInnerGlowMat!: THREE.MeshBasicMaterial;
  private coilGuideBadge!: THREE.Mesh;

  private galvanometerGroup: THREE.Group;
  private needlePivotGroup!: THREE.Group;
  private galvRotateRingGroup!: THREE.Group;
  private galvGuideBadge!: THREE.Mesh;
  private galvAutoFaceCamera = false;
  private galvManualAngleRad = THREE.MathUtils.degToRad(-24);
  private galvDragStartAngleRad = 0;

  // Bộ 2 đèn LED mắc song song ngược cực (Đỏ sáng khi Φ tăng, Xanh sáng khi Φ giảm, dời tùy ý trên bàn)
  private ledModuleGroup: THREE.Group;
  private redLedDomeMat!: THREE.MeshStandardMaterial;
  private redLedCoreMat!: THREE.MeshBasicMaterial;
  private redLedHaloMat!: THREE.MeshBasicMaterial;
  private greenLedDomeMat!: THREE.MeshStandardMaterial;
  private greenLedCoreMat!: THREE.MeshBasicMaterial;
  private greenLedHaloMat!: THREE.MeshBasicMaterial;
  private ledGuideBadge!: THREE.Mesh;

  private leadWiresDynamicGroup!: THREE.Group;
  private wireMatA!: THREE.MeshStandardMaterial;
  private wireMatB!: THREE.MeshStandardMaterial;
  private wireMatLedRed!: THREE.MeshStandardMaterial;
  private wireMatLedGreen!: THREE.MeshStandardMaterial;
  private primaryWireMat!: THREE.MeshStandardMaterial;

  // Lưu trạng thái vị trí để chỉ tái tạo dây dẫn khi người dùng thực sự dời thiết bị
  private lastWireCoilX = Number.NaN;
  private lastWireCoilY = Number.NaN;
  private lastWireCoilZ = Number.NaN;
  private lastWireGalvX = Number.NaN;
  private lastWireGalvZ = Number.NaN;
  private lastWireGalvRotY = Number.NaN;
  private lastWireLedX = Number.NaN;
  private lastWireLedZ = Number.NaN;
  private lastWiringSign = 0;

  private lastPriWireEmX = Number.NaN;
  private lastPriWireBatX = Number.NaN;
  private lastPriWireBatZ = Number.NaN;
  private lastPriWireSwX = Number.NaN;
  private lastPriWireSwZ = Number.NaN;

  // Đường sức từ & mũi tên chỉ chiều
  private fieldLinesGroup: THREE.Group;
  private fieldLineMat!: THREE.MeshStandardMaterial;
  private fieldLineOuterMat!: THREE.MeshStandardMaterial;
  private fieldArrowMat!: THREE.MeshStandardMaterial;
  private fieldArrowMeshes: Array<{
    mesh: THREE.Mesh;
    curve: THREE.CatmullRomCurve3;
    t: number;
  }> = [];

  // Hạt chỉ chiều dòng điện quy ước
  private secondaryParticlesInstanced!: THREE.InstancedMesh;
  private secondaryParticleMat!: THREE.MeshStandardMaterial;
  private secondaryLoopCurve!: THREE.CatmullRomCurve3;

  private primaryParticlesInstanced!: THREE.InstancedMesh;
  private primaryLoopCurve!: THREE.CatmullRomCurve3;

  // Tương tác Pointer & Raycaster
  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private activeDragKind: DragTargetKind = 'none';
  private activePointerId: number | null = null;
  private dragOffset = new THREE.Vector3();
  private pointerDownScreenPos = new THREE.Vector2();
  private switchMovedDuringDrag = false;
  private isHoveringDraggable = false;

  // Trạng thái hiển thị trực quan
  private showFieldLines = true;
  private showCurrentParticles = true;
  private show3DLabels = true;

  private disposables: Array<{ dispose: () => void }> = [];
  private cleanupEvents: (() => void) | null = null;

  constructor(container: HTMLElement, callbacks: SceneControllerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2.5)
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Màu nền phòng thí nghiệm tĩnh, ấm dịu, hoàn toàn không chớp nháy
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);
    this.scene.fog = new THREE.Fog(0x111827, 15, 36);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    pmremGenerator.dispose();
    this.disposables.push(envTex);

    // Khoảng near=0.25, far=42 tối ưu độ phân giải Z-buffer tuyệt đối, ngăn mọi hiện tượng chớp nháy mặt phẳng
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.25, 42);
    this.setResponsiveCameraPosition(width, height);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.texPoleNRight = createMagnetPoleTexture(maxAniso, true);
    this.texPoleSRight = createMagnetPoleTexture(maxAniso, false);
    this.texCapN = createMagnetEndCapTexture(maxAniso, true);
    this.texCapS = createMagnetEndCapTexture(maxAniso, false);
    this.disposables.push(
      this.texPoleNRight,
      this.texPoleSRight,
      this.texCapN,
      this.texCapS
    );

    this.setupLighting();
    this.buildLaboratoryTableWithLegs(maxAniso);

    this.permanentMagnetGroup = this.buildPermanentMagnetAssembly(maxAniso);
    this.scene.add(this.permanentMagnetGroup);

    this.electromagnetGroup = this.buildElectromagnetAssembly(maxAniso);
    this.scene.add(this.electromagnetGroup);

    this.secondaryCoilGroup = this.buildSecondaryCoilAssembly(maxAniso);
    this.scene.add(this.secondaryCoilGroup);

    this.galvanometerGroup = this.buildGalvanometerAssembly(maxAniso);
    this.scene.add(this.galvanometerGroup);

    this.ledModuleGroup = this.buildLedModuleAssembly(maxAniso);
    this.scene.add(this.ledModuleGroup);

    this.buildConnectingWiresAndParticles();
    this.fieldLinesGroup = this.buildMagneticFieldLines();
    this.scene.add(this.fieldLinesGroup);

    // Đăng ký sự kiện Pointer ở Capture Phase trước OrbitControls
    this.bindPointerEvents();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minPolarAngle = Math.PI * 0.06;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 15.5;
    this.controls.target.set(-0.3, 0.35, 0);
    this.controls.enabled = true;
    this.controls.update();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public getIsSoftwareGl(): boolean {
    return this.isSoftwareGl;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  private setResponsiveCameraPosition(width: number, height: number): void {
    const aspect = width / Math.max(1, height);
    if (aspect < 0.75) {
      // Điện thoại dọc: nhìn thấy rõ bàn có 4 chân và các thiết bị trên bàn
      this.camera.position.set(-0.3, 3.6, 8.9);
    } else if (aspect < 1.15) {
      this.camera.position.set(-0.3, 3.0, 7.4);
    } else {
      // Máy tính & điện thoại ngang: thấy trọn chiếc bàn có chân và toàn bộ dụng cụ
      this.camera.position.set(-0.3, 2.55, 6.35);
    }
  }

  public resetCameraView(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.setResponsiveCameraPosition(width, height);
    this.controls.target.set(-0.3, 0.35, 0);
    // Đặt lại cả vị trí Nam châm, Cuộn dây, Điện kế, Bộ 2 LED, Nguồn DC và Khóa K về mặc định trên mặt bàn
    this.magnetFloatingGroup.position.set(0, 0, 0);
    this.magnetDropLine.visible = false;
    this.magnetDropShadow.visible = false;
    this.callbacks.onMagnetDragMove(MAGNET_DEFAULT_X, 0, 0);

    this.coilFloatingGroup.position.set(0, 0, 0);
    this.coilDropLine.visible = false;
    this.coilDropShadow.visible = false;
    this.callbacks.onCoilDragMove(COIL_CENTER_X, 0, 0);

    this.galvanometerGroup.position.set(1.85, 0, -1.18);
    this.galvManualAngleRad = THREE.MathUtils.degToRad(-24);
    if (!this.galvAutoFaceCamera) {
      this.galvanometerGroup.rotation.y = this.galvManualAngleRad;
    }
    this.ledModuleGroup.position.set(1.12, 0, 1.15);
    this.batteryGroup.position.set(-3.35, 0.44, -1.25);
    this.switchBaseGroup.position.set(-2.85, 0.08, 1.12);
    this.lastWireCoilX = Number.NaN;
    this.lastWireCoilY = Number.NaN;
    this.lastWireCoilZ = Number.NaN;
    this.lastPriWireEmX = Number.NaN;
    this.controls.update();
  }

  public liftMagnet(targetY = 1.35): void {
    this.callbacks.onMagnetDragMove(
      this.permanentMagnetGroup.position.x,
      targetY,
      this.magnetFloatingGroup.position.z
    );
  }

  public placeMagnetOnTable(): void {
    this.callbacks.onMagnetDragMove(this.permanentMagnetGroup.position.x, 0, 0);
  }

  public setMagnet3DPosition(x: number, y: number, z: number): void {
    this.callbacks.onMagnetDragMove(x, y, z);
  }

  public liftCoil(targetY = 1.35): void {
    this.callbacks.onCoilDragMove(
      this.secondaryCoilGroup.position.x,
      targetY,
      this.coilFloatingGroup.position.z
    );
  }

  public placeCoilOnTable(): void {
    this.callbacks.onCoilDragMove(this.secondaryCoilGroup.position.x, 0, 0);
  }

  public setCoil3DPosition(x: number, y: number, z: number): void {
    this.callbacks.onCoilDragMove(x, y, z);
  }

  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setInteractionMode(_mode: InteractionMode): void {
    if (this.activeDragKind === 'none') {
      this.controls.enabled = true;
    }
  }

  public setVisualOptions(options: {
    showFieldLines: boolean;
    showCurrentParticles: boolean;
    show3DLabels?: boolean;
    reducedMotion: boolean;
    galvAutoFaceCamera?: boolean;
    galvManualAngleDeg?: number;
  }): void {
    this.showFieldLines = options.showFieldLines;
    this.showCurrentParticles = options.showCurrentParticles;
    if (typeof options.show3DLabels === 'boolean') {
      this.show3DLabels = options.show3DLabels;
    }
    if (typeof options.galvAutoFaceCamera === 'boolean') {
      this.galvAutoFaceCamera = options.galvAutoFaceCamera;
    }
    if (typeof options.galvManualAngleDeg === 'number') {
      this.galvManualAngleRad = THREE.MathUtils.degToRad(options.galvManualAngleDeg);
      if (!this.galvAutoFaceCamera) {
        this.galvanometerGroup.rotation.y = this.galvManualAngleRad;
      }
    }
  }

  private setupLighting(): void {
    const hemiLight = new THREE.HemisphereLight(0xf1f5f9, 0x1e293b, 1.15);
    hemiLight.position.set(0, 12, 0);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    keyLight.position.set(4.5, 8.5, 5.5);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1.5;
      keyLight.shadow.camera.far = 18;
      const d = 5.8;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      // Bias chuẩn xác để triệt tiêu hoàn toàn hiện tượng sọc bóng (shadow acne) gây chớp nháy mặt bàn
      keyLight.shadow.bias = -0.0015;
      keyLight.shadow.normalBias = 0.04;
    }
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.85);
    fillLight.position.set(-5.5, 5.0, 4.2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.95);
    rimLight.position.set(-4.0, 5.5, -5.0);
    this.scene.add(rimLight);
  }

  /**
   * Dựng chiếc Bàn Thí Nghiệm Vật Lí thật có 4 chân, khung giằng chữ H, mặt gỗ sồi dày dặn
   * và hoàn toàn KHÔNG có bất kỳ mặt phẳng trùng nhau (Zero Coplanar Z-fighting).
   */
  private buildLaboratoryTableWithLegs(maxAniso: number): void {
    const tableGroup = new THREE.Group();

    // 1. Sàn phòng thí nghiệm đặt sâu ở y = -2.65
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.88,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -2.65, 0);
    floorMesh.receiveShadow = true;
    tableGroup.add(floorMesh);

    // 2. Mặt bàn gỗ sồi nguyên tấm: bề mặt trên nằm chính xác tại y = 0.0 (từ y = -0.18 đến y = 0.0)
    const topW = 10.4;
    const topH = 0.18;
    const topD = 5.0;
    const centerX = -0.35;
    const centerZ = -0.15;

    const woodTex = createWoodTableTexture(maxAniso);
    this.disposables.push(woodTex);
    const woodTopMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.52,
      metalness: 0.06,
    });
    const tableTopMesh = new THREE.Mesh(
      new THREE.BoxGeometry(topW, topH, topD),
      woodTopMat
    );
    tableTopMesh.position.set(centerX, -topH / 2, centerZ);
    tableTopMesh.receiveShadow = true;
    tableTopMesh.castShadow = true;
    tableGroup.add(tableTopMesh);

    // 3. Nẹp viền bảo vệ xung quanh mép bàn (Tách rời 4 thanh ở 4 cạnh ngoài, KHÔNG chồng lấn với mặt bàn!)
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.38,
      metalness: 0.65,
    });
    const edgeT = 0.06;
    const frontEdge = new THREE.Mesh(
      new THREE.BoxGeometry(topW + edgeT * 2, topH, edgeT),
      edgeMat
    );
    frontEdge.position.set(centerX, -topH / 2, centerZ + topD / 2 + edgeT / 2);

    const backEdge = new THREE.Mesh(
      new THREE.BoxGeometry(topW + edgeT * 2, topH, edgeT),
      edgeMat
    );
    backEdge.position.set(centerX, -topH / 2, centerZ - topD / 2 - edgeT / 2);

    const leftEdge = new THREE.Mesh(
      new THREE.BoxGeometry(edgeT, topH, topD),
      edgeMat
    );
    leftEdge.position.set(centerX - topW / 2 - edgeT / 2, -topH / 2, centerZ);

    const rightEdge = new THREE.Mesh(
      new THREE.BoxGeometry(edgeT, topH, topD),
      edgeMat
    );
    rightEdge.position.set(centerX + topW / 2 + edgeT / 2, -topH / 2, centerZ);
    tableGroup.add(frontEdge, backEdge, leftEdge, rightEdge);

    // 4. Khung yếm bàn bằng thép sơn tĩnh điện bên dưới mặt bàn (từ y = -0.42 đến y = -0.18)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.42,
      metalness: 0.72,
    });
    const apronH = 0.24;
    const apronY = -topH - apronH / 2;
    const apronW = topW - 0.5;
    const apronD = topD - 0.5;

    const frontApron = new THREE.Mesh(
      new THREE.BoxGeometry(apronW, apronH, 0.1),
      frameMat
    );
    frontApron.position.set(centerX, apronY, centerZ + apronD / 2);

    const backApron = new THREE.Mesh(
      new THREE.BoxGeometry(apronW, apronH, 0.1),
      frameMat
    );
    backApron.position.set(centerX, apronY, centerZ - apronD / 2);

    const leftApron = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, apronH, apronD),
      frameMat
    );
    leftApron.position.set(centerX - apronW / 2, apronY, centerZ);

    const rightApron = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, apronH, apronD),
      frameMat
    );
    rightApron.position.set(centerX + apronW / 2, apronY, centerZ);
    tableGroup.add(frontApron, backApron, leftApron, rightApron);

    // 5. Bốn chân bàn thép vuông lớn vững chãi nối từ mặt dưới bàn (y = -0.18) xuống sàn (y = -2.58)
    const legHeight = 2.4;
    const legY = -topH - legHeight / 2; // -1.38
    const legGeo = new THREE.BoxGeometry(0.24, legHeight, 0.24);
    const footGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.07, 20);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.85,
      metalness: 0.1,
    });

    const legXOffsets = [centerX - apronW / 2, centerX + apronW / 2];
    const legZOffsets = [centerZ - apronD / 2, centerZ + apronD / 2];

    for (const lx of legXOffsets) {
      for (const lz of legZOffsets) {
        const legMesh = new THREE.Mesh(legGeo, frameMat);
        legMesh.position.set(lx, legY, lz);
        legMesh.castShadow = true;
        tableGroup.add(legMesh);

        // Đế cao su chống trượt ở đáy mỗi chân bàn
        const footMesh = new THREE.Mesh(footGeo, footMat);
        footMesh.position.set(lx, -topH - legHeight - 0.035, lz);
        tableGroup.add(footMesh);
      }
    }

    // 6. Thanh giằng ngang chữ H nối 4 chân bàn ở tầm thấp (y = -2.05) tạo kết cấu bàn học thực tế
    const sideBarGeo = new THREE.BoxGeometry(0.1, 0.1, apronD);
    const leftSideBar = new THREE.Mesh(sideBarGeo, frameMat);
    leftSideBar.position.set(legXOffsets[0], -2.05, centerZ);
    const rightSideBar = new THREE.Mesh(sideBarGeo, frameMat);
    rightSideBar.position.set(legXOffsets[1], -2.05, centerZ);

    const centerStretcherGeo = new THREE.BoxGeometry(apronW, 0.1, 0.12);
    const centerStretcher = new THREE.Mesh(centerStretcherGeo, frameMat);
    centerStretcher.position.set(centerX, -2.05, centerZ);
    tableGroup.add(leftSideBar, rightSideBar, centerStretcher);

    // 7. Thanh ray dẫn hướng & thước chia độ đặt nổi hẳn trên mặt bàn (đáy ở y = 0.005, đỉnh ở y = 0.065)
    const railBaseGeo = new THREE.BoxGeometry(7.6, 0.05, 0.96);
    const railBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.55,
    });
    const railBase = new THREE.Mesh(railBaseGeo, railBaseMat);
    railBase.position.set(-0.9, 0.025, 0);
    railBase.receiveShadow = true;
    tableGroup.add(railBase);

    // Hai thanh trượt inox mạ crôm
    const rodGeo = new THREE.CylinderGeometry(0.034, 0.034, 7.4, 20);
    rodGeo.rotateZ(Math.PI / 2);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.16,
      metalness: 0.92,
    });
    const rodFront = new THREE.Mesh(rodGeo, rodMat);
    rodFront.position.set(-0.9, 0.09, 0.28);
    const rodBack = new THREE.Mesh(rodGeo, rodMat);
    rodBack.position.set(-0.9, 0.09, -0.28);
    tableGroup.add(rodFront, rodBack);

    // Thước đo khoảng cách hộp nổi dày 0.02m (không dùng Plane mỏng dán sát mặt bàn để tuyệt đối không Z-fight)
    const rulerTex = createRulerTexture(maxAniso);
    this.disposables.push(rulerTex);
    const rulerBoxGeo = new THREE.BoxGeometry(6.8, 0.025, 0.28);
    const rulerTopMat = new THREE.MeshStandardMaterial({
      map: rulerTex,
      roughness: 0.48,
      metalness: 0.12,
    });
    const rulerSideMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
    });
    const rulerMesh = new THREE.Mesh(rulerBoxGeo, [
      rulerSideMat,
      rulerSideMat,
      rulerTopMat,
      rulerSideMat,
      rulerSideMat,
      rulerSideMat,
    ]);
    rulerMesh.position.set(-0.9, 0.0125, 0.68);
    tableGroup.add(rulerMesh);

    this.scene.add(tableGroup);
  }

  /**
   * Dựng cụm Nam châm vĩnh cửu độ chi tiết cao (Có thể kéo dọc bàn):
   * - Sửa triệt để lỗi UV mặt sau (-Z) của BoxGeometry: cả 6 mặt (Trước, Sau, Trên, Dưới, Đầu Phải +X, Đầu Trái -X)
   *   đều đồng nhất 100% cực Bắc (Đỏ - N) và cực Nam (Xanh - S) ở mọi góc xoay camera!
   */
  private buildPermanentMagnetAssembly(maxAniso: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(-2.65, 0, 0);

    // 1. Đế trượt trên ray (Carriage): Luôn nằm trên ray bàn thí nghiệm, giữ vị trí bệ đỡ khi nhấc nam châm lên
    this.magnetCarriageGroup = new THREE.Group();

    const carriageGeo = new THREE.BoxGeometry(1.32, 0.15, 0.82);
    const carriageMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8,
    });
    const carriage = new THREE.Mesh(carriageGeo, carriageMat);
    carriage.position.set(0, 0.145, 0);
    carriage.castShadow = true;
    carriage.receiveShadow = true;
    this.magnetCarriageGroup.add(carriage);

    const bushingGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.26, 24);
    bushingGeo.rotateZ(Math.PI / 2);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.92,
    });
    for (const bx of [-0.44, 0.44]) {
      for (const bz of [-0.28, 0.28]) {
        const bush = new THREE.Mesh(bushingGeo, brassMat);
        bush.position.set(bx, 0.09, bz);
        this.magnetCarriageGroup.add(bush);
      }
    }

    const pillarGeo = new THREE.CylinderGeometry(0.072, 0.092, 0.64, 28);
    const leftPillar = new THREE.Mesh(pillarGeo, brassMat);
    leftPillar.position.set(-0.38, 0.48, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, brassMat);
    rightPillar.position.set(0.38, 0.48, 0);
    this.magnetCarriageGroup.add(leftPillar, rightPillar);

    // Kẹp đệm chữ U cao su đỡ nam châm trên đỉnh 2 trụ
    const cradleGeo = new THREE.BoxGeometry(0.22, 0.06, 0.44);
    const cradleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.2,
    });
    const cradleLeft = new THREE.Mesh(cradleGeo, cradleMat);
    cradleLeft.position.set(-0.38, 0.79, 0);
    const cradleRight = new THREE.Mesh(cradleGeo, cradleMat);
    cradleRight.position.set(0.38, 0.79, 0);
    this.magnetCarriageGroup.add(cradleLeft, cradleRight);

    group.add(this.magnetCarriageGroup);

    // 2. Thân nam châm lơ lửng / nhấc lên (Floating Assembly): Có thể nhấc lên trong không gian 3D
    this.magnetFloatingGroup = new THREE.Group();

    // Thanh nam châm chữ nhật với 6 mặt đồng bộ cực từ tuyệt đối
    const magnetGeo = new THREE.BoxGeometry(1.48, 0.44, 0.48);
    const endCapRightMat = new THREE.MeshStandardMaterial({
      map: this.texCapN,
      roughness: 0.22,
      metalness: 0.18,
    });
    const endCapLeftMat = new THREE.MeshStandardMaterial({
      map: this.texCapS,
      roughness: 0.22,
      metalness: 0.18,
    });
    const frontTopBottomMat = new THREE.MeshStandardMaterial({
      map: this.texPoleNRight,
      roughness: 0.22,
      metalness: 0.18,
    });
    const backFaceMat = new THREE.MeshStandardMaterial({
      map: this.texPoleSRight,
      roughness: 0.22,
      metalness: 0.18,
    });

    this.magnetBodyMesh = new THREE.Mesh(magnetGeo, [
      endCapRightMat,
      endCapLeftMat,
      frontTopBottomMat,
      frontTopBottomMat,
      frontTopBottomMat,
      backFaceMat,
    ]);
    this.magnetBodyMesh.position.set(0, 0.85, 0);
    this.magnetBodyMesh.castShadow = true;
    this.magnetBodyMesh.receiveShadow = true;
    this.magnetFloatingGroup.add(this.magnetBodyMesh);

    // Đai kẹp inox chính giữa thanh nam châm
    const collarGeo = new THREE.BoxGeometry(0.1, 0.48, 0.52);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.16,
      metalness: 0.94,
    });
    const collar = new THREE.Mesh(collarGeo, chromeMat);
    collar.position.set(0, 0.85, 0);
    this.magnetFloatingGroup.add(collar);

    const thumbScrew = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.068, 0.11, 24),
      brassMat
    );
    thumbScrew.position.set(0, 1.13, 0);
    this.magnetFloatingGroup.add(thumbScrew);

    // 3. Tay nắm nhấc 3D thẳng đứng (Vertical Lift Handle) trên đỉnh vít siết
    this.magnetLiftHandle = new THREE.Group();
    this.magnetLiftHandle.position.set(0, 1.34, 0);
    const liftMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.18,
      metalness: 0.9,
    });
    const liftRingGeo = new THREE.TorusGeometry(0.16, 0.024, 16, 32);
    const liftRingMesh = new THREE.Mesh(liftRingGeo, liftMat);
    const arrowShaftGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 12);
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, liftMat);
    const arrowConeGeo = new THREE.ConeGeometry(0.045, 0.08, 16);
    const arrowConeUp = new THREE.Mesh(arrowConeGeo, liftMat);
    arrowConeUp.position.set(0, 0.12, 0);
    const arrowConeDown = new THREE.Mesh(arrowConeGeo, liftMat);
    arrowConeDown.position.set(0, -0.12, 0);
    arrowConeDown.rotateZ(Math.PI);
    this.magnetLiftHandle.add(liftRingMesh, arrowShaft, arrowConeUp, arrowConeDown);
    this.magnetFloatingGroup.add(this.magnetLiftHandle);

    // Tay nắm kéo ngang dưới đáy
    const handleGeo = new THREE.TorusGeometry(0.24, 0.03, 18, 40);
    handleGeo.rotateX(Math.PI / 2);
    this.magnetDragRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    const handleMesh = new THREE.Mesh(handleGeo, this.magnetDragRingMat);
    handleMesh.position.set(0, 0.2, 0.46);
    this.magnetFloatingGroup.add(handleMesh);

    // Nhãn 3D hướng dẫn nổi
    const badgeTex = createBadgeTexture(
      '◄ KÉO / NHẤC NAM CHÂM 3D ►',
      'Kéo núm trên để nhấc · Kéo thân để dời vị trí',
      '#38bdf8',
      maxAniso
    );
    this.disposables.push(badgeTex);
    const badgeGeo = new THREE.PlaneGeometry(1.24, 0.26);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: badgeTex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.magnetGuideBadge = new THREE.Mesh(badgeGeo, badgeMat);
    this.magnetGuideBadge.position.set(0, 1.62, 0);
    this.magnetFloatingGroup.add(this.magnetGuideBadge);

    // Hộp va chạm Hitbox bao phủ toàn bộ cụm
    const hitGeo = new THREE.BoxGeometry(1.95, 2.2, 1.4);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitGeo, hitMat);
    hitBox.position.set(0, 0.95, 0);
    this.magnetFloatingGroup.add(hitBox);

    group.add(this.magnetFloatingGroup);

    // 4. Dây dóng độ cao thẳng đứng & Bóng chiếu sàn khi nhấc lên lơ lửng
    const dropLineGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 8);
    const dropLineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    this.magnetDropLine = new THREE.Mesh(dropLineGeo, dropLineMat);
    this.magnetDropLine.visible = false;
    group.add(this.magnetDropLine);

    const shadowGeo = new THREE.RingGeometry(0.04, 0.46, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.magnetDropShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.magnetDropShadow.position.set(0, 0.02, 0);
    this.magnetDropShadow.visible = false;
    group.add(this.magnetDropShadow);

    return group;
  }

  /** Dựng cụm Nam châm điện cho Thí nghiệm 2 (Cuộn sơ cấp, Nguồn DC, Khóa K — từng thiết bị đều dời được trên bàn) */
  private buildElectromagnetAssembly(maxAniso: number): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    // 1. Cụm Cuộn sơ cấp nam châm điện (Có thể kéo dọc thanh ray)
    this.primaryCoilGroup = new THREE.Group();
    this.primaryCoilGroup.position.set(ELECTROMAGNET_DEFAULT_X, 0, 0);

    const baseGeo = new THREE.BoxGeometry(1.18, 0.16, 0.92);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.35,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, 0.14, 0);
    this.primaryCoilGroup.add(baseMesh);

    const bobbinGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.06, 28, 1, true);
    bobbinGeo.rotateZ(Math.PI / 2);
    const bobbinMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.42,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const bobbin = new THREE.Mesh(bobbinGeo, bobbinMat);
    bobbin.position.set(0, 0.85, 0);
    this.primaryCoilGroup.add(bobbin);

    const flangeGeo = new THREE.CylinderGeometry(0.54, 0.54, 0.065, 32);
    flangeGeo.rotateZ(Math.PI / 2);
    const leftFlange = new THREE.Mesh(flangeGeo, bobbinMat);
    leftFlange.position.set(-0.5, 0.85, 0);
    const rightFlange = new THREE.Mesh(flangeGeo, bobbinMat);
    rightFlange.position.set(0.5, 0.85, 0);
    this.primaryCoilGroup.add(leftFlange, rightFlange);

    const helixPoints: THREE.Vector3[] = [];
    const turns = 24;
    const samples = turns * 18;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const angle = t * turns * Math.PI * 2;
      const x = -0.45 + t * 0.9;
      const r = 0.415;
      helixPoints.push(
        new THREE.Vector3(x, 0.85 + Math.cos(angle) * r, Math.sin(angle) * r)
      );
    }
    const helixCurve = new THREE.CatmullRomCurve3(helixPoints);
    const wireGeo = new THREE.TubeGeometry(helixCurve, 260, 0.023, 8, false);
    this.primaryCoilEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0xea580c,
      emissiveIntensity: 0,
    });
    const primaryWireMesh = new THREE.Mesh(wireGeo, this.primaryCoilEmissiveMat);
    primaryWireMesh.castShadow = true;
    this.primaryCoilGroup.add(primaryWireMesh);

    const coreGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.52, 28);
    coreGeo.rotateZ(Math.PI / 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.26,
      metalness: 0.88,
    });
    this.ironCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.ironCoreMesh.position.set(0.08, 0.85, 0);
    this.primaryCoilGroup.add(this.ironCoreMesh);

    const emHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.6, 1.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    emHitBox.position.set(0, 0.8, 0);
    this.primaryCoilGroup.add(emHitBox);
    group.add(this.primaryCoilGroup);

    // 2. Bộ nguồn điện một chiều hiện số (Có thể kéo dời vị trí trên mặt bàn)
    this.batteryGroup = new THREE.Group();
    this.batteryGroup.position.set(-3.35, 0.44, -1.25);
    this.batteryGroup.rotation.y = THREE.MathUtils.degToRad(18);

    const psuFrontTex = createPowerSupplyFrontTexture(maxAniso);
    this.disposables.push(psuFrontTex);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.5,
    });
    const frontMat = new THREE.MeshStandardMaterial({
      map: psuFrontTex,
      roughness: 0.35,
      metalness: 0.2,
    });
    const boxGeo = new THREE.BoxGeometry(1.18, 0.84, 0.86);
    const boxMesh = new THREE.Mesh(boxGeo, [
      boxMat,
      boxMat,
      boxMat,
      boxMat,
      frontMat,
      boxMat,
    ]);
    boxMesh.castShadow = true;
    this.batteryGroup.add(boxMesh);

    const termGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.18, 16);
    termGeo.rotateX(Math.PI / 2);
    const posTerm = new THREE.Mesh(
      termGeo,
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.5 })
    );
    posTerm.position.set(0.28, -0.22, 0.48);
    const negTerm = new THREE.Mesh(
      termGeo,
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.25, metalness: 0.5 })
    );
    negTerm.position.set(-0.28, -0.22, 0.48);
    this.batteryGroup.add(posTerm, negTerm);
    group.add(this.batteryGroup);

    // 3. Công tắc cầu dao Khóa K (Chạm để đóng/ngắt, giữ kéo để dời vị trí trên mặt bàn)
    this.switchBaseGroup = new THREE.Group();
    this.switchBaseGroup.position.set(-2.85, 0.08, 1.12);

    const swPlacaGeo = new THREE.BoxGeometry(1.04, 0.14, 0.64);
    const swPlacaMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.3,
    });
    this.switchBaseGroup.add(new THREE.Mesh(swPlacaGeo, swPlacaMat));

    const clipMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9,
    });
    const pivotPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.24, 0.14),
      clipMat
    );
    pivotPost.position.set(-0.28, 0.15, 0);
    const contactPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.24, 0.14),
      clipMat
    );
    contactPost.position.set(0.28, 0.15, 0);
    this.switchBaseGroup.add(pivotPost, contactPost);

    this.switchBladeGroup = new THREE.Group();
    this.switchBladeGroup.position.set(-0.28, 0.23, 0);
    const bladeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.05, 0.07),
      clipMat
    );
    bladeMesh.position.set(0.31, 0, 0);
    const knobMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.26, 20),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    knobMesh.rotation.z = Math.PI / 2;
    knobMesh.position.set(0.68, 0.02, 0);
    this.switchBladeGroup.add(bladeMesh, knobMesh);
    this.switchBladeGroup.rotation.z = THREE.MathUtils.degToRad(34);
    this.switchBaseGroup.add(this.switchBladeGroup);

    const swBadgeTex = createBadgeTexture(
      'KHÓA K (CHẠM / KÉO DỜI)',
      'Đóng/ngắt hoặc dời trên bàn',
      '#10b981',
      maxAniso
    );
    this.disposables.push(swBadgeTex);
    this.switchGuideBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.12, 0.26),
      new THREE.MeshBasicMaterial({
        map: swBadgeTex,
        transparent: true,
        depthWrite: false,
      })
    );
    this.switchGuideBadge.position.set(0, 0.68, 0);
    this.switchBaseGroup.add(this.switchGuideBadge);

    const swHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.9, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    swHitBox.position.set(0, 0.35, 0);
    this.switchBaseGroup.add(swHitBox);

    group.add(this.switchBaseGroup);

    // 4. Nhóm dây dẫn động nối Nguồn DC -> Khóa K -> Cuộn sơ cấp
    this.primaryWireMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      roughness: 0.35,
      metalness: 0.35,
    });
    this.primaryWiresGroup = new THREE.Group();
    group.add(this.primaryWiresGroup);

    return group;
  }

  /** Dựng Cuộn dây cảm ứng thứ cấp (Có thể nắm kéo dời hoặc nhấc lên không gian 3D, tự động hít về bàn khi rà gần) */
  private buildSecondaryCoilAssembly(maxAniso: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(COIL_CENTER_X, 0, 0);

    // 1. Bệ trượt đế trên ray bàn thí nghiệm (Carriage Dock): Cố định theo trục Y=0, Z=0 trên mặt bàn
    this.coilCarriageGroup = new THREE.Group();

    const pedestalGeo = new THREE.BoxGeometry(1.42, 0.16, 1.16);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.35,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, 0.13, 0);
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    this.coilCarriageGroup.add(pedestal);

    // Hai gá đỡ chữ V bằng đồng thau định vị cuộn dây trên bệ
    const cradleGeo = new THREE.BoxGeometry(0.18, 0.14, 0.94);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.88,
    });
    const cradleLeft = new THREE.Mesh(cradleGeo, brassMat);
    cradleLeft.position.set(-0.52, 0.24, 0);
    const cradleRight = new THREE.Mesh(cradleGeo, brassMat);
    cradleRight.position.set(0.52, 0.24, 0);
    this.coilCarriageGroup.add(cradleLeft, cradleRight);

    group.add(this.coilCarriageGroup);

    // 2. Cụm ống dây lơ lửng / nhấc lên 3D (Floating Coil Assembly): Có thể nhấc lên trong không gian
    this.coilFloatingGroup = new THREE.Group();

    const outerRadius = 0.56;
    const innerRadius = 0.46;
    const length = 1.24;

    const innerTubeGeo = new THREE.CylinderGeometry(
      innerRadius,
      innerRadius,
      length + 0.04,
      36,
      1,
      true
    );
    innerTubeGeo.rotateZ(Math.PI / 2);
    const innerTubeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.45,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const innerTube = new THREE.Mesh(innerTubeGeo, innerTubeMat);
    innerTube.position.set(0, 0.85, 0);
    this.coilFloatingGroup.add(innerTube);

    const fluxGlowGeo = new THREE.CylinderGeometry(
      innerRadius * 0.88,
      innerRadius * 0.88,
      length * 0.9,
      24
    );
    fluxGlowGeo.rotateZ(Math.PI / 2);
    this.coilInnerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    });
    const fluxGlowMesh = new THREE.Mesh(fluxGlowGeo, this.coilInnerGlowMat);
    fluxGlowMesh.position.set(0, 0.85, 0);
    this.coilFloatingGroup.add(fluxGlowMesh);

    const flangeShape = new THREE.Shape();
    flangeShape.absarc(0, 0, 0.76, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    flangeShape.holes.push(holePath);

    const flangeExtrude = new THREE.ExtrudeGeometry(flangeShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      curveSegments: 36,
    });
    flangeExtrude.rotateY(Math.PI / 2);
    const flangeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.28,
      metalness: 0.68,
    });

    const leftFlange = new THREE.Mesh(flangeExtrude, flangeMat);
    leftFlange.position.set(-length / 2 - 0.03, 0.85, 0);
    const rightFlange = new THREE.Mesh(flangeExtrude, flangeMat);
    rightFlange.position.set(length / 2 - 0.03, 0.85, 0);
    this.coilFloatingGroup.add(leftFlange, rightFlange);

    const visualTurns = 36;
    const samples = visualTurns * 20;
    const coilPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const angle = t * visualTurns * Math.PI * 2;
      const x = -0.56 + t * 1.12;
      const r = outerRadius + 0.03 * ((i % 20) < 10 ? 0 : 0.22);
      coilPoints.push(
        new THREE.Vector3(x, 0.85 + Math.cos(angle) * r, Math.sin(angle) * r)
      );
    }
    const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
    const copperGeo = new THREE.TubeGeometry(coilCurve, 440, 0.022, 10, false);
    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.18,
      metalness: 0.92,
    });
    const copperCoilMesh = new THREE.Mesh(copperGeo, copperMat);
    copperCoilMesh.castShadow = true;
    this.coilFloatingGroup.add(copperCoilMesh);

    const lenzRingGeo = new THREE.TorusGeometry(0.63, 0.032, 14, 40);
    lenzRingGeo.rotateY(Math.PI / 2);
    this.lenzRingMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
    });
    const lenzRing = new THREE.Mesh(lenzRingGeo, this.lenzRingMat);
    lenzRing.position.set(-0.67, 0.85, 0);
    this.coilFloatingGroup.add(lenzRing);

    // 3. Tay nắm nhấc 3D thẳng đứng trên đỉnh cuộn dây (Vertical Lift Handle)
    this.coilLiftHandle = new THREE.Group();
    this.coilLiftHandle.position.set(0, 1.62, 0);
    const liftMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.18,
      metalness: 0.9,
    });
    const liftRingGeo = new THREE.TorusGeometry(0.18, 0.026, 16, 32);
    const liftRingMesh = new THREE.Mesh(liftRingGeo, liftMat);
    const arrowShaftGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.24, 12);
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, liftMat);
    const arrowConeGeo = new THREE.ConeGeometry(0.05, 0.09, 16);
    const arrowConeUp = new THREE.Mesh(arrowConeGeo, liftMat);
    arrowConeUp.position.set(0, 0.13, 0);
    const arrowConeDown = new THREE.Mesh(arrowConeGeo, liftMat);
    arrowConeDown.position.set(0, -0.13, 0);
    arrowConeDown.rotateZ(Math.PI);
    this.coilLiftHandle.add(liftRingMesh, arrowShaft, arrowConeUp, arrowConeDown);
    this.coilFloatingGroup.add(this.coilLiftHandle);

    const coilBadgeTex = createBadgeTexture(
      '◄ KÉO / NHẤC CUỘN DÂY 3D ►',
      'Kéo núm trên để nhấc · Rà gần bàn tự hít vào bệ',
      '#f59e0b',
      maxAniso
    );
    this.disposables.push(coilBadgeTex);
    this.coilGuideBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.24, 0.26),
      new THREE.MeshBasicMaterial({
        map: coilBadgeTex,
        transparent: true,
        depthWrite: false,
      })
    );
    this.coilGuideBadge.position.set(0, 1.98, 0);
    this.coilFloatingGroup.add(this.coilGuideBadge);

    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.24, 16);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.9,
    });
    // Cọc sau nối Điện kế G và Cọc trước nối song song Bộ 2 Đèn LED ngược cực
    const postA = new THREE.Mesh(postGeo, postMat);
    postA.position.set(-0.36, 0.26, -0.44);
    const postB = new THREE.Mesh(postGeo, postMat);
    postB.position.set(0.36, 0.26, -0.44);
    const postFrontA = new THREE.Mesh(postGeo, postMat);
    postFrontA.position.set(-0.36, 0.26, 0.44);
    const postFrontB = new THREE.Mesh(postGeo, postMat);
    postFrontB.position.set(0.36, 0.26, 0.44);
    this.coilFloatingGroup.add(postA, postB, postFrontA, postFrontB);

    const coilHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 1.95, 1.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    coilHitBox.position.set(0, 0.95, 0);
    this.coilFloatingGroup.add(coilHitBox);

    group.add(this.coilFloatingGroup);

    // 4. Dây dóng độ cao thẳng đứng & Bóng chiếu sàn khi nhấc cuộn dây lên lơ lửng
    const dropLineGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 8);
    const dropLineMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65,
    });
    this.coilDropLine = new THREE.Mesh(dropLineGeo, dropLineMat);
    this.coilDropLine.visible = false;
    group.add(this.coilDropLine);

    const shadowGeo = new THREE.RingGeometry(0.04, 0.54, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.coilDropShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.coilDropShadow.position.set(0, 0.02, 0);
    this.coilDropShadow.visible = false;
    group.add(this.coilDropShadow);

    return group;
  }

  /**
   * Dựng Điện kế kim 3D cao cấp:
   * - Mặt chia độ tự phát sáng tương phản cực cao (không bị bóng mờ hay chói lóa ở mọi góc nhìn)
   * - Kim chỉ thị 2 lớp (viền đen + thân đỏ tươi phát sáng + mũi giáo sắc nét)
   * - Đế mâm xoay 360° + Tay nắm xoay trên đỉnh (có thể xoay 360° hoặc bật tự động quay đối diện hướng xem)
   */
  private buildGalvanometerAssembly(maxAniso: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(1.85, 0, -1.18);
    group.rotation.y = this.galvManualAngleRad;

    // 1. Đế mâm xoay 360° (Rotary Turntable Base) + Núm xoay đỉnh
    this.galvRotateRingGroup = new THREE.Group();

    const turntableOuterGeo = new THREE.CylinderGeometry(1.08, 1.14, 0.08, 40);
    const turntableMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.78,
    });
    const turntableOuter = new THREE.Mesh(turntableOuterGeo, turntableMat);
    turntableOuter.position.set(0, 0.04, -0.04);
    turntableOuter.receiveShadow = true;
    this.galvRotateRingGroup.add(turntableOuter);

    const goldRingGeo = new THREE.TorusGeometry(1.09, 0.026, 14, 48);
    goldRingGeo.rotateX(Math.PI / 2);
    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.88,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
    });
    const goldRing = new THREE.Mesh(goldRingGeo, goldRingMat);
    goldRing.position.set(0, 0.075, -0.04);
    this.galvRotateRingGroup.add(goldRing);

    // Tay nắm xoay 360° trên nóc đồng hồ (Top Rotary Handle)
    const topMountGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.09, 24);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.92,
    });
    const topMount = new THREE.Mesh(topMountGeo, chromeMat);
    topMount.position.set(0, 1.84, -0.34);
    this.galvRotateRingGroup.add(topMount);

    const topKnobRingGeo = new THREE.TorusGeometry(0.22, 0.038, 14, 32);
    topKnobRingGeo.rotateX(Math.PI / 2);
    const topKnobRing = new THREE.Mesh(topKnobRingGeo, goldRingMat);
    topKnobRing.position.set(0, 1.9, -0.34);
    this.galvRotateRingGroup.add(topKnobRing);

    // Hitbox ưu tiên cho núm xoay 360° trên đỉnh và vành mâm xoay
    const topKnobHit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.28, 18),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    topKnobHit.position.set(0, 1.9, -0.34);
    this.galvRotateRingGroup.add(topKnobHit);

    group.add(this.galvRotateRingGroup);

    // 2. Thân đế chính và vỏ hộp nghiêng khí động học
    const baseGeo = new THREE.BoxGeometry(1.88, 0.22, 1.36);
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.36,
      metalness: 0.55,
    });
    const baseMesh = new THREE.Mesh(baseGeo, casingMat);
    baseMesh.position.set(0, 0.17, 0);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    const upperBodyGeo = new THREE.BoxGeometry(1.84, 1.66, 0.84);
    const upperBody = new THREE.Mesh(upperBodyGeo, casingMat);
    upperBody.position.set(0, 0.99, -0.14);
    upperBody.rotation.x = THREE.MathUtils.degToRad(-14);
    upperBody.castShadow = true;
    group.add(upperBody);

    // Ốp sườn kim loại phay xước hai bên thân đồng hồ
    const cheekGeo = new THREE.BoxGeometry(0.06, 1.54, 0.72);
    const leftCheek = new THREE.Mesh(cheekGeo, chromeMat);
    leftCheek.position.set(-0.93, 0.99, -0.14);
    leftCheek.rotation.x = THREE.MathUtils.degToRad(-14);
    const rightCheek = new THREE.Mesh(cheekGeo, chromeMat);
    rightCheek.position.set(0.93, 0.99, -0.14);
    rightCheek.rotation.x = THREE.MathUtils.degToRad(-14);
    group.add(leftCheek, rightCheek);

    // 3. Khung viền Bezel mạ crôm + 4 ốc lục giác ở 4 góc
    const bezelGeo = new THREE.BoxGeometry(1.74, 1.56, 0.08);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.88,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 1.01, 0.25);
    bezelMesh.rotation.x = THREE.MathUtils.degToRad(-14);
    group.add(bezelMesh);

    // 4. Mặt chia độ tự phát sáng sắc nét + Kim chỉ thị 2 lớp tương phản cực cao
    const dialFrameGroup = new THREE.Group();
    dialFrameGroup.position.set(0, 1.01, 0.296);
    dialFrameGroup.rotation.x = THREE.MathUtils.degToRad(-14);

    // 4 ốc vít góc mặt đồng hồ
    const screwGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.025, 14);
    screwGeo.rotateX(Math.PI / 2);
    const screwMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.25,
      metalness: 0.9,
    });
    for (const sx of [-0.76, 0.76]) {
      for (const sy of [-0.68, 0.68]) {
        const screw = new THREE.Mesh(screwGeo, screwMat);
        screw.position.set(sx, sy, 0.008);
        dialFrameGroup.add(screw);
      }
    }

    // Mặt chia độ dùng MeshBasicMaterial (toneMapped: false) để giữ nền trắng tinh khiết 100% và vạch chia siêu nét ở mọi góc nhìn
    const dialTex = createGalvanometerDialTexture(maxAniso);
    this.disposables.push(dialTex);
    const dialGeo = new THREE.PlaneGeometry(1.62, 1.44);
    const dialMat = new THREE.MeshBasicMaterial({
      map: dialTex,
      toneMapped: false,
    });
    const dialMesh = new THREE.Mesh(dialGeo, dialMat);
    dialFrameGroup.add(dialMesh);

    // Cụm kim quay 3D tương phản cao (High-contrast Dual-Layer Pointer Needle)
    this.needlePivotGroup = new THREE.Group();
    this.needlePivotGroup.position.set(0, -0.24, 0.028);

    // Lớp nền đen đậm tạo viền tương phản nổi bật trên nền mặt số trắng
    const shadowBladeGeo = new THREE.BoxGeometry(0.056, 0.64, 0.01);
    shadowBladeGeo.translate(0, 0.31, -0.005);
    const shadowBladeMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      toneMapped: false,
    });
    this.needlePivotGroup.add(new THREE.Mesh(shadowBladeGeo, shadowBladeMat));

    // Thân kim chính màu đỏ tươi rực rỡ (không bị tối theo góc ánh sáng)
    const mainBladeGeo = new THREE.BoxGeometry(0.036, 0.62, 0.016);
    mainBladeGeo.translate(0, 0.3, 0.004);
    const mainBladeMat = new THREE.MeshBasicMaterial({
      color: 0xff1111,
      toneMapped: false,
    });
    this.needlePivotGroup.add(new THREE.Mesh(mainBladeGeo, mainBladeMat));

    // Đầu mũi kim hình mũi giáo (Spade/Lance Tip) chỉ chính xác vào từng vạch chia
    const tipOutlineGeo = new THREE.ConeGeometry(0.068, 0.17, 4);
    tipOutlineGeo.rotateY(Math.PI / 4);
    tipOutlineGeo.scale(1.0, 1.0, 0.25);
    tipOutlineGeo.translate(0, 0.61, -0.004);
    this.needlePivotGroup.add(new THREE.Mesh(tipOutlineGeo, shadowBladeMat));

    const tipCoreGeo = new THREE.ConeGeometry(0.05, 0.145, 4);
    tipCoreGeo.rotateY(Math.PI / 4);
    tipCoreGeo.scale(1.0, 1.0, 0.32);
    tipCoreGeo.translate(0, 0.61, 0.006);
    this.needlePivotGroup.add(new THREE.Mesh(tipCoreGeo, mainBladeMat));

    // Đuôi đối trọng kim màu đen tuyền phía dưới tâm quay
    const tailGeo = new THREE.BoxGeometry(0.042, 0.17, 0.02);
    tailGeo.translate(0, -0.08, 0);
    this.needlePivotGroup.add(new THREE.Mesh(tailGeo, shadowBladeMat));

    const tailWeightGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.024, 16);
    tailWeightGeo.rotateX(Math.PI / 2);
    tailWeightGeo.translate(0, -0.14, 0.004);
    this.needlePivotGroup.add(new THREE.Mesh(tailWeightGeo, shadowBladeMat));

    // Trục xoay trung tâm bằng đồng thau sáng bóng + tâm đen
    const bossGeo = new THREE.CylinderGeometry(0.086, 0.086, 0.045, 28);
    bossGeo.rotateX(Math.PI / 2);
    const bossMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9,
    });
    this.needlePivotGroup.add(new THREE.Mesh(bossGeo, bossMat));

    const centerPinGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.055, 20);
    centerPinGeo.rotateX(Math.PI / 2);
    this.needlePivotGroup.add(new THREE.Mesh(centerPinGeo, shadowBladeMat));

    dialFrameGroup.add(this.needlePivotGroup);

    // Vít chỉnh vị trí 0 (Zero-adjust screw) dưới mặt đồng hồ
    const zeroScrewGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.05, 20);
    zeroScrewGeo.rotateX(Math.PI / 2);
    const zeroScrew = new THREE.Mesh(zeroScrewGeo, bossMat);
    zeroScrew.position.set(0, -0.58, 0.025);
    dialFrameGroup.add(zeroScrew);

    group.add(dialFrameGroup);

    // 5. Hai cọc đấu dây phía trước (Cọc âm Xanh lam - Cọc dương Đỏ)
    const termCollarGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.08, 20);
    const termGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.26, 20);

    const leftCollar = new THREE.Mesh(termCollarGeo, chromeMat);
    leftCollar.position.set(-0.46, 0.29, 0.44);
    const leftTerm = new THREE.Mesh(
      termGeo,
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.22, metalness: 0.65 })
    );
    leftTerm.position.set(-0.46, 0.36, 0.44);

    const rightCollar = new THREE.Mesh(termCollarGeo, chromeMat);
    rightCollar.position.set(0.46, 0.29, 0.44);
    const rightTerm = new THREE.Mesh(
      termGeo,
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.22, metalness: 0.65 })
    );
    rightTerm.position.set(0.46, 0.36, 0.44);
    group.add(leftCollar, leftTerm, rightCollar, rightTerm);

    // 6. Nhãn hướng dẫn nổi phía trên Điện kế G
    const galvBadgeTex = createBadgeTexture(
      'ĐIỆN KẾ KIM G (XOAY 360°)',
      'Kéo núm đỉnh để xoay 360° · Kéo thân để dời vị trí',
      '#f59e0b',
      maxAniso
    );
    this.disposables.push(galvBadgeTex);
    this.galvGuideBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 0.26),
      new THREE.MeshBasicMaterial({
        map: galvBadgeTex,
        transparent: true,
        depthWrite: false,
      })
    );
    this.galvGuideBadge.position.set(0, 2.18, -0.15);
    group.add(this.galvGuideBadge);

    return group;
  }

  /**
   * Dựng Bộ 2 Đèn LED mắc song song ngược cực (Đèn Đỏ sáng khi từ thông Φ tăng / kéo nam châm tới,
   * Đèn Xanh sáng khi từ thông Φ giảm / kéo nam châm lui). Có dây dẫn nối song song và kéo dời tùy ý trên bàn!
   */
  private buildLedModuleAssembly(maxAniso: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(1.12, 0, 1.15);
    group.rotation.y = THREE.MathUtils.degToRad(-12);

    const boardTex = createLedModuleBoardTexture(maxAniso);
    this.disposables.push(boardTex);
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.45,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: boardTex,
      roughness: 0.38,
      metalness: 0.15,
    });
    const boardGeo = new THREE.BoxGeometry(1.36, 0.14, 0.88);
    const boardMesh = new THREE.Mesh(boardGeo, [
      sideMat,
      sideMat,
      topMat,
      sideMat,
      sideMat,
      sideMat,
    ]);
    boardMesh.position.set(0, 0.1, 0);
    boardMesh.castShadow = true;
    boardMesh.receiveShadow = true;
    group.add(boardMesh);

    const footGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.035, 14);
    const footMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.85,
    });
    for (const fx of [-0.58, 0.58]) {
      for (const fz of [-0.35, 0.35]) {
        const f = new THREE.Mesh(footGeo, footMat);
        f.position.set(fx, 0.018, fz);
        group.add(f);
      }
    }

    const postGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.22, 18);
    const leftPost = new THREE.Mesh(
      postGeo,
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.7 })
    );
    leftPost.position.set(-0.44, 0.24, -0.32);
    const rightPost = new THREE.Mesh(
      postGeo,
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.25, metalness: 0.7 })
    );
    rightPost.position.set(0.44, 0.24, -0.32);
    group.add(leftPost, rightPost);

    const bezelGeo = new THREE.CylinderGeometry(0.165, 0.19, 0.07, 24);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.18,
      metalness: 0.92,
    });
    const leftBezel = new THREE.Mesh(bezelGeo, bezelMat);
    leftBezel.position.set(-0.3, 0.2, -0.02);
    const rightBezel = new THREE.Mesh(bezelGeo, bezelMat);
    rightBezel.position.set(0.3, 0.2, -0.02);
    group.add(leftBezel, rightBezel);

    const ledCylGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.22, 24);
    const ledTopGeo = new THREE.SphereGeometry(
      0.135,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const coreGeo = new THREE.SphereGeometry(0.068, 16, 16);
    const haloGeo = new THREE.RingGeometry(0.15, 0.34, 32);
    haloGeo.rotateX(-Math.PI / 2);

    // 1. Bóng LED ĐỎ (Sáng rực khi từ thông Φ tăng / kéo nam châm lại gần)
    this.redLedDomeMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      emissive: 0xff1e1e,
      emissiveIntensity: 0.04,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
    });
    this.redLedCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffdada,
      transparent: true,
      opacity: 0.1,
    });
    this.redLedHaloMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const redCyl = new THREE.Mesh(ledCylGeo, this.redLedDomeMat);
    redCyl.position.set(-0.3, 0.34, -0.02);
    const redTop = new THREE.Mesh(ledTopGeo, this.redLedDomeMat);
    redTop.position.set(-0.3, 0.45, -0.02);
    const redCore = new THREE.Mesh(coreGeo, this.redLedCoreMat);
    redCore.position.set(-0.3, 0.36, -0.02);
    const redHalo = new THREE.Mesh(haloGeo, this.redLedHaloMat);
    redHalo.position.set(-0.3, 0.176, -0.02);
    group.add(redCyl, redTop, redCore, redHalo);

    // 2. Bóng LED XANH (Sáng rực khi từ thông Φ giảm / kéo nam châm ra xa)
    this.greenLedDomeMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      emissive: 0x00ff66,
      emissiveIntensity: 0.04,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
    });
    this.greenLedCoreMat = new THREE.MeshBasicMaterial({
      color: 0xd1fae5,
      transparent: true,
      opacity: 0.1,
    });
    this.greenLedHaloMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const greenCyl = new THREE.Mesh(ledCylGeo, this.greenLedDomeMat);
    greenCyl.position.set(0.3, 0.34, -0.02);
    const greenTop = new THREE.Mesh(ledTopGeo, this.greenLedDomeMat);
    greenTop.position.set(0.3, 0.45, -0.02);
    const greenCore = new THREE.Mesh(coreGeo, this.greenLedCoreMat);
    greenCore.position.set(0.3, 0.36, -0.02);
    const greenHalo = new THREE.Mesh(haloGeo, this.greenLedHaloMat);
    greenHalo.position.set(0.3, 0.176, -0.02);
    group.add(greenCyl, greenTop, greenCore, greenHalo);

    const ledBadgeTex = createBadgeTexture(
      'BỘ 2 LED SONG SONG NGƯỢC CỰC',
      'Φ tăng: Đỏ sáng · Φ giảm: Xanh sáng (Kéo dời tùy ý)',
      '#ef4444',
      maxAniso
    );
    this.disposables.push(ledBadgeTex);
    this.ledGuideBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 0.26),
      new THREE.MeshBasicMaterial({
        map: ledBadgeTex,
        transparent: true,
        depthWrite: false,
      })
    );
    this.ledGuideBadge.position.set(0, 0.78, 0);
    group.add(this.ledGuideBadge);

    const ledHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.85, 1.05),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    ledHitBox.position.set(0, 0.35, 0);
    group.add(ledHitBox);

    return group;
  }

  /** Khởi tạo vật liệu dây dẫn và hạt dòng điện */
  private buildConnectingWiresAndParticles(): void {
    this.wireMatA = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.26,
      metalness: 0.8,
    });
    this.wireMatB = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.26,
      metalness: 0.8,
    });
    this.wireMatLedRed = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.32,
      metalness: 0.45,
    });
    this.wireMatLedGreen = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.32,
      metalness: 0.45,
    });

    this.leadWiresDynamicGroup = new THREE.Group();
    this.scene.add(this.leadWiresDynamicGroup);

    // Hạt chỉ chiều dòng điện: nhiều hơn, nhỏ mịn và chuyển động đều đặn
    const particleGeo = new THREE.SphereGeometry(0.022, 10, 10);
    this.secondaryParticleMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfacc15,
      emissiveIntensity: 1.15,
      roughness: 0.16,
    });
    this.secondaryParticlesInstanced = new THREE.InstancedMesh(
      particleGeo,
      this.secondaryParticleMat,
      92
    );
    this.secondaryParticlesInstanced.frustumCulled = false;
    this.scene.add(this.secondaryParticlesInstanced);

    const primaryParticleMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x0284c7,
      emissiveIntensity: 1.05,
      roughness: 0.18,
    });
    this.primaryParticlesInstanced = new THREE.InstancedMesh(
      particleGeo,
      primaryParticleMat,
      52
    );
    this.primaryParticlesInstanced.frustumCulled = false;
    this.primaryParticlesInstanced.visible = false;
    this.scene.add(this.primaryParticlesInstanced);

    this.rebuildSecondaryWiresIfNeeded(COIL_CENTER_X, 1);
    this.rebuildPrimaryWiresIfNeeded();
  }

  /**
   * Cập nhật đường đi của cả dây đồng nối Điện kế G VÀ dây nối song song tới Bộ 2 Đèn LED
   * mỗi khi Cuộn dây, Điện kế G hoặc Bộ 2 Đèn LED được người dùng kéo dời vị trí trên mặt bàn!
   */
  private rebuildSecondaryWiresIfNeeded(
    coilX: number,
    wiringSign: 1 | -1,
    coilY: number = 0,
    coilZ: number = 0
  ): void {
    const gx = this.galvanometerGroup.position.x;
    const gz = this.galvanometerGroup.position.z;
    const gRotY = this.galvanometerGroup.rotation.y;
    const lx = this.ledModuleGroup.position.x;
    const lz = this.ledModuleGroup.position.z;
    if (
      Math.abs(coilX - this.lastWireCoilX) < 0.005 &&
      Math.abs(coilY - this.lastWireCoilY) < 0.005 &&
      Math.abs(coilZ - this.lastWireCoilZ) < 0.005 &&
      Math.abs(gx - this.lastWireGalvX) < 0.005 &&
      Math.abs(gz - this.lastWireGalvZ) < 0.005 &&
      Math.abs(gRotY - this.lastWireGalvRotY) < 0.006 &&
      Math.abs(lx - this.lastWireLedX) < 0.005 &&
      Math.abs(lz - this.lastWireLedZ) < 0.005 &&
      wiringSign === this.lastWiringSign
    ) {
      return;
    }

    this.lastWireCoilX = coilX;
    this.lastWireCoilY = coilY;
    this.lastWireCoilZ = coilZ;
    this.lastWireGalvX = gx;
    this.lastWireGalvZ = gz;
    this.lastWireGalvRotY = gRotY;
    this.lastWireLedX = lx;
    this.lastWireLedZ = lz;
    this.lastWiringSign = wiringSign;

    while (this.leadWiresDynamicGroup.children.length > 0) {
      const child = this.leadWiresDynamicGroup.children[0] as THREE.Mesh;
      child.geometry?.dispose();
      this.leadWiresDynamicGroup.remove(child);
    }

    // 1. Dây nối từ cọc sau của Cuộn dây cảm ứng (ở độ cao 3D coilY, coilZ) tới Điện kế G
    const coilPostA = new THREE.Vector3(coilX - 0.36, 0.26 + coilY, -0.44 + coilZ);
    const coilPostB = new THREE.Vector3(coilX + 0.36, 0.26 + coilY, -0.44 + coilZ);

    this.galvanometerGroup.updateMatrixWorld();
    const galvLeftTerm = new THREE.Vector3(-0.46, 0.28, 0.44).applyMatrix4(
      this.galvanometerGroup.matrixWorld
    );
    const galvRightTerm = new THREE.Vector3(0.46, 0.28, 0.44).applyMatrix4(
      this.galvanometerGroup.matrixWorld
    );

    const targetA = wiringSign === 1 ? galvLeftTerm : galvRightTerm;
    const targetB = wiringSign === 1 ? galvRightTerm : galvLeftTerm;

    const midA = new THREE.Vector3(
      (coilPostA.x + targetA.x) * 0.5,
      Math.max(0.12, (coilPostA.y + targetA.y) * 0.38),
      Math.min(coilPostA.z, targetA.z) - 0.35
    );
    const midB = new THREE.Vector3(
      (coilPostB.x + targetB.x) * 0.5,
      Math.max(0.12, (coilPostB.y + targetB.y) * 0.38),
      (coilPostB.z + targetB.z) * 0.5 - 0.15
    );

    const curve1 = new THREE.CatmullRomCurve3([coilPostA, midA, targetA]);
    const curve2 = new THREE.CatmullRomCurve3([coilPostB, midB, targetB]);

    // 2. Dây nối song song từ cọc trước của Cuộn dây cảm ứng tới Bộ 2 Đèn LED ngược cực
    const coilFrontA = new THREE.Vector3(coilX - 0.36, 0.26 + coilY, 0.44 + coilZ);
    const coilFrontB = new THREE.Vector3(coilX + 0.36, 0.26 + coilY, 0.44 + coilZ);

    this.ledModuleGroup.updateMatrixWorld();
    const ledLeftTerm = new THREE.Vector3(-0.44, 0.24, -0.32).applyMatrix4(
      this.ledModuleGroup.matrixWorld
    );
    const ledRightTerm = new THREE.Vector3(0.44, 0.24, -0.32).applyMatrix4(
      this.ledModuleGroup.matrixWorld
    );

    const midLedA = new THREE.Vector3(
      (coilFrontA.x + ledLeftTerm.x) * 0.5,
      Math.max(0.1, (coilFrontA.y + ledLeftTerm.y) * 0.36),
      Math.max(coilFrontA.z, ledLeftTerm.z) * 0.65 + 0.22
    );
    const midLedB = new THREE.Vector3(
      (coilFrontB.x + ledRightTerm.x) * 0.5,
      Math.max(0.1, (coilFrontB.y + ledRightTerm.y) * 0.36),
      Math.max(coilFrontB.z, ledRightTerm.z) * 0.65 + 0.34
    );

    const curveLed1 = new THREE.CatmullRomCurve3([
      coilFrontA,
      midLedA,
      ledLeftTerm,
    ]);
    const curveLed2 = new THREE.CatmullRomCurve3([
      coilFrontB,
      midLedB,
      ledRightTerm,
    ]);

    this.leadWiresDynamicGroup.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(curve1, 28, 0.022, 8, false),
        this.wireMatA
      ),
      new THREE.Mesh(
        new THREE.TubeGeometry(curve2, 28, 0.022, 8, false),
        this.wireMatB
      ),
      new THREE.Mesh(
        new THREE.TubeGeometry(curveLed1, 28, 0.021, 8, false),
        this.wireMatLedRed
      ),
      new THREE.Mesh(
        new THREE.TubeGeometry(curveLed2, 28, 0.021, 8, false),
        this.wireMatLedGreen
      )
    );

    // Cập nhật đường cong khép kín cho hạt chỉ chiều dòng điện thứ cấp
    const loopPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const angle = t * 8 * Math.PI * 2;
      const x = coilX - 0.52 + t * 1.04;
      const r = 0.61;
      loopPts.push(
        new THREE.Vector3(
          x,
          0.85 + coilY + Math.cos(angle) * r,
          coilZ + Math.sin(angle) * r
        )
      );
    }
    loopPts.push(
      coilPostB,
      midB,
      targetB,
      new THREE.Vector3(gx, 0.72, gz),
      targetA,
      midA,
      coilPostA,
      coilFrontA,
      midLedA,
      ledLeftTerm,
      new THREE.Vector3(lx, 0.28, lz),
      ledRightTerm,
      midLedB,
      coilFrontB
    );
    this.secondaryLoopCurve = new THREE.CatmullRomCurve3(loopPts, true);
    this.secondaryLoopCurve.curveType = 'centripetal';
  }

  /** Cập nhật dây dẫn mạch sơ cấp khi người dùng dời Nguồn DC, Khóa K hoặc Cuộn sơ cấp trên bàn */
  private rebuildPrimaryWiresIfNeeded(): void {
    const emX = this.primaryCoilGroup.position.x;
    const bx = this.batteryGroup.position.x;
    const bz = this.batteryGroup.position.z;
    const sx = this.switchBaseGroup.position.x;
    const sz = this.switchBaseGroup.position.z;

    if (
      Math.abs(emX - this.lastPriWireEmX) < 0.005 &&
      Math.abs(bx - this.lastPriWireBatX) < 0.005 &&
      Math.abs(bz - this.lastPriWireBatZ) < 0.005 &&
      Math.abs(sx - this.lastPriWireSwX) < 0.005 &&
      Math.abs(sz - this.lastPriWireSwZ) < 0.005
    ) {
      return;
    }

    this.lastPriWireEmX = emX;
    this.lastPriWireBatX = bx;
    this.lastPriWireBatZ = bz;
    this.lastPriWireSwX = sx;
    this.lastPriWireSwZ = sz;

    while (this.primaryWiresGroup.children.length > 0) {
      const child = this.primaryWiresGroup.children[0] as THREE.Mesh;
      child.geometry?.dispose();
      this.primaryWiresGroup.remove(child);
    }

    const batPos = new THREE.Vector3(bx + 0.25, 0.24, bz + 0.42);
    const batNeg = new THREE.Vector3(bx - 0.25, 0.24, bz + 0.42);
    const swLeft = new THREE.Vector3(sx - 0.28, 0.2, sz);
    const swRight = new THREE.Vector3(sx + 0.28, 0.2, sz);
    const coilIn = new THREE.Vector3(emX - 0.42, 0.45, 0.28);
    const coilOut = new THREE.Vector3(emX + 0.42, 0.45, -0.28);

    const w1 = new THREE.CatmullRomCurve3([
      batPos,
      new THREE.Vector3((batPos.x + swLeft.x) * 0.5, 0.14, (batPos.z + swLeft.z) * 0.5),
      swLeft,
    ]);
    const w2 = new THREE.CatmullRomCurve3([
      swRight,
      new THREE.Vector3((swRight.x + coilIn.x) * 0.5, 0.16, (swRight.z + coilIn.z) * 0.5),
      coilIn,
    ]);
    const w3 = new THREE.CatmullRomCurve3([
      coilOut,
      new THREE.Vector3((coilOut.x + batNeg.x) * 0.5, 0.16, (coilOut.z + batNeg.z) * 0.5 - 0.2),
      batNeg,
    ]);

    this.primaryWiresGroup.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(w1, 24, 0.022, 8, false),
        this.primaryWireMat
      ),
      new THREE.Mesh(
        new THREE.TubeGeometry(w2, 24, 0.022, 8, false),
        this.primaryWireMat
      ),
      new THREE.Mesh(
        new THREE.TubeGeometry(w3, 24, 0.022, 8, false),
        this.primaryWireMat
      )
    );

    this.primaryLoopCurve = new THREE.CatmullRomCurve3(
      [
        batPos,
        swLeft,
        swRight,
        coilIn,
        new THREE.Vector3(emX, 1.25, 0),
        coilOut,
        batNeg,
      ],
      true
    );
  }

  /**
   * Dựng hệ thống Đường sức từ 3D chuẩn vật lí (Exact Magnetic Dipole Streamlines):
   * - Các đường sức thanh mảnh tinh tế, màu xanh lá cây sinh động.
   * - Mũi tên nhỏ gọn, màu lá đậm hơn một chút xíu, gắn chuẩn tiếp tuyến (Ra Bắc N - Vào Nam S).
   * - Gồm 3 lớp vòng từ trường khép kín trải rộng + Chùm tia sức từ ở hai đầu cực Bắc/Nam xuyên qua lòng cuộn dây.
   */
  private buildMagneticFieldLines(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(-2.65, 0.85, 0);

    // Vật liệu cho các vòng đường sức từ chính (xanh lá cây tươi sáng, thanh mảnh)
    this.fieldLineMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x15803d,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.76,
      roughness: 0.2,
    });

    // Vật liệu cho lớp đường sức từ mở rộng phía ngoài (xanh lá nhẹ nhàng, thanh thoát)
    this.fieldLineOuterMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x16a34a,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.55,
      roughness: 0.22,
    });

    // Vật liệu mũi tên chỉ chiều từ trường: màu lá đậm hơn một chút xíu, sắc nét và tương phản tốt
    this.fieldArrowMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      emissive: 0x0f3e20,
      emissiveIntensity: 0.42,
      roughness: 0.24,
      metalness: 0.2,
    });

    // Hình học đầu mũi tên 3D nhỏ gọn, thanh thoát, hướng chuẩn theo trục +Y cục bộ
    const arrowGeo = new THREE.ConeGeometry(0.026, 0.092, 20);

    // Hàm tính vector đơn vị trường lưỡng cực từ thực của thanh nam châm có 2 cực tại x = +L và x = -L
    const L = 0.58;
    const eps2 = 0.012;
    const getDipoleUnitB = (x: number, rho: number): [number, number] => {
      const dxN = x - L;
      const dxS = x + L;
      const rN3 = Math.pow(dxN * dxN + rho * rho + eps2, 1.5);
      const rS3 = Math.pow(dxS * dxS + rho * rho + eps2, 1.5);
      const bx = dxN / rN3 - dxS / rS3;
      const brho = rho / rN3 - rho / rS3;
      const len = Math.hypot(bx, brho) || 1;
      return [bx / len, brho / len];
    };

    // Hàm tích phân đường sức từ khép kín từ cực +X (t=0) vòng qua đỉnh (x=0, rho=rhoPeak) tới cực -X (t=1)
    const traceDipoleArch2D = (rhoPeak: number): Array<[number, number]> => {
      const halfPts: Array<[number, number]> = [[0, rhoPeak]];
      let x = 0;
      let rho = rhoPeak;
      const ds = 0.045;
      for (let step = 0; step < 95; step++) {
        const [bx1, br1] = getDipoleUnitB(x, rho);
        const mx = x - bx1 * (ds * 0.5);
        const mr = Math.max(0.01, rho - br1 * (ds * 0.5));
        const [bx2, br2] = getDipoleUnitB(mx, mr);
        x -= bx2 * ds;
        rho = Math.max(0.02, rho - br2 * ds);
        halfPts.push([x, rho]);
        // Dừng khi đường sức đi vào bề mặt đầu cực nam châm
        if (x <= 0.68 && rho <= 0.17 && step > 5) {
          break;
        }
        if (Math.hypot(x - L, rho) < 0.13) {
          break;
        }
      }

      // Ghép đối xứng từ cực +X (t=0) -> đỉnh vòm (t=0.5) -> cực -X (t=1)
      const fullArch: Array<[number, number]> = [];
      for (let i = halfPts.length - 1; i >= 0; i--) {
        fullArch.push([halfPts[i][0], halfPts[i][1]]);
      }
      for (let i = 1; i < halfPts.length; i++) {
        fullArch.push([-halfPts[i][0], halfPts[i][1]]);
      }
      return fullArch;
    };

    // 1. Ba lớp vòng đường sức từ khép kín (Trong - Trung - Ngoài trải rộng, đường sức mỏng thanh lịch)
    const shells = [
      {
        rhoPeak: 0.58,
        tubeRadius: 0.006,
        azimuthCount: 8,
        mat: this.fieldLineMat,
        arrowTs: [0.22, 0.5, 0.78],
      },
      {
        rhoPeak: 1.06,
        tubeRadius: 0.0055,
        azimuthCount: 8,
        mat: this.fieldLineMat,
        arrowTs: [0.18, 0.5, 0.82],
      },
      {
        rhoPeak: 1.66,
        tubeRadius: 0.005,
        azimuthCount: 8,
        mat: this.fieldLineOuterMat,
        arrowTs: [0.15, 0.38, 0.62, 0.85],
      },
    ];

    for (const shell of shells) {
      const arch2D = traceDipoleArch2D(shell.rhoPeak);
      for (let k = 0; k < shell.azimuthCount; k++) {
        const phi = (k * Math.PI * 2) / shell.azimuthCount;
        const cosP = Math.cos(phi);
        const sinP = Math.sin(phi);

        const pts3D = arch2D.map(
          ([px, pr]) => new THREE.Vector3(px, pr * cosP, pr * sinP)
        );
        const curve = new THREE.CatmullRomCurve3(pts3D, false);
        const tubeGeo = new THREE.TubeGeometry(
          curve,
          84,
          shell.tubeRadius,
          8,
          false
        );
        group.add(new THREE.Mesh(tubeGeo, shell.mat));

        for (const t of shell.arrowTs) {
          const arrowMesh = new THREE.Mesh(arrowGeo, this.fieldArrowMat);
          group.add(arrowMesh);
          this.fieldArrowMeshes.push({ mesh: arrowMesh, curve, t });
        }
      }
    }

    // 2. Đường sức từ trục chính (Central Axis Line) đi thẳng qua tâm nam châm và xuyên suốt lòng cuộn dây cảm ứng
    const rightAxisCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.68, 0, 0),
        new THREE.Vector3(1.5, 0, 0),
        new THREE.Vector3(2.3, 0, 0),
        new THREE.Vector3(3.15, 0, 0),
      ],
      false
    );
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(rightAxisCurve, 32, 0.0065, 8, false),
        this.fieldLineMat
      )
    );
    for (const t of [0.22, 0.55, 0.86]) {
      const arrowMesh = new THREE.Mesh(arrowGeo, this.fieldArrowMat);
      group.add(arrowMesh);
      this.fieldArrowMeshes.push({ mesh: arrowMesh, curve: rightAxisCurve, t });
    }

    const leftAxisCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-2.65, 0, 0),
        new THREE.Vector3(-1.95, 0, 0),
        new THREE.Vector3(-1.3, 0, 0),
        new THREE.Vector3(-0.68, 0, 0),
      ],
      false
    );
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(leftAxisCurve, 32, 0.0065, 8, false),
        this.fieldLineMat
      )
    );
    for (const t of [0.25, 0.68]) {
      const arrowMesh = new THREE.Mesh(arrowGeo, this.fieldArrowMat);
      group.add(arrowMesh);
      this.fieldArrowMeshes.push({ mesh: arrowMesh, curve: leftAxisCurve, t });
    }

    // 3. Chùm tia sức từ loe rộng ở 2 đầu cực (+X xuyên qua cuộn dây và -X phía đối diện)
    const tracePolarPlume2D = (): Array<[number, number]> => {
      const plumePts: Array<[number, number]> = [[0.68, 0.065]];
      let x = 0.68;
      let rho = 0.065;
      const ds = 0.05;
      for (let step = 0; step < 48; step++) {
        const [bx, br] = getDipoleUnitB(x, rho);
        x += bx * ds;
        rho += br * ds;
        plumePts.push([x, rho]);
      }
      return plumePts;
    };

    const plume2D = tracePolarPlume2D();
    const plumeAngles = 8;
    for (let k = 0; k < plumeAngles; k++) {
      const phi = (k * Math.PI * 2) / plumeAngles;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Chùm tia đầu cực phải (+X): đi từ mặt cực +X tỏa rộng xuyên qua cuộn dây
      const rightPts = plume2D.map(
        ([px, pr]) => new THREE.Vector3(px, pr * cosP, pr * sinP)
      );
      const rightCurve = new THREE.CatmullRomCurve3(rightPts, false);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(rightCurve, 48, 0.0052, 8, false),
          this.fieldLineOuterMat
        )
      );
      for (const t of [0.28, 0.72]) {
        const arrowMesh = new THREE.Mesh(arrowGeo, this.fieldArrowMat);
        group.add(arrowMesh);
        this.fieldArrowMeshes.push({ mesh: arrowMesh, curve: rightCurve, t });
      }

      // Chùm tia đầu cực trái (-X): đi từ ngoài hội tụ vào mặt cực -X
      const leftPts: THREE.Vector3[] = [];
      for (let i = plume2D.length - 1; i >= 0; i--) {
        const [px, pr] = plume2D[i];
        leftPts.push(new THREE.Vector3(-px, pr * cosP, pr * sinP));
      }
      const leftCurve = new THREE.CatmullRomCurve3(leftPts, false);
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(leftCurve, 48, 0.0052, 8, false),
          this.fieldLineOuterMat
        )
      );
      for (const t of [0.32, 0.75]) {
        const arrowMesh = new THREE.Mesh(arrowGeo, this.fieldArrowMat);
        group.add(arrowMesh);
        this.fieldArrowMeshes.push({ mesh: arrowMesh, curve: leftCurve, t });
      }
    }

    return group;
  }

  /**
   * Hệ thống kéo đa thiết bị trên mặt bàn thí nghiệm (Capture Phase):
   * - Nam châm vĩnh cửu, Cuộn dây cảm ứng, Cuộn sơ cấp nam châm điện: kéo dọc trục X, tính toán cảm ứng điện từ thời gian thực.
   * - Điện kế G, Nguồn điện DC, Công tắc Khóa K: kéo tự do trên mặt bàn (X, Z), dây dẫn tự động co giãn theo!
   */
  private bindPointerEvents(): void {
    const dom = this.renderer.domElement;

    const updatePointerNDC = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      this.pointerNDC.x =
        ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      this.pointerNDC.y =
        -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    };

    const updateCameraFacingAxisPlane = (anchorPos: THREE.Vector3) => {
      _vec3A.subVectors(this.camera.position, anchorPos);
      _vec3A.x = 0;
      if (_vec3A.lengthSq() < 1e-4) {
        _vec3A.set(0, 0, 1);
      } else {
        _vec3A.normalize();
      }
      _dragPlane.setFromNormalAndCoplanarPoint(_vec3A, anchorPos);
    };

    const detectHitEquipment = (): {
      kind: DragTargetKind;
      group: THREE.Group | null;
    } => {
      if (this.permanentMagnetGroup.visible) {
        if (
          this.raycaster.intersectObject(this.magnetLiftHandle, true).length > 0
        ) {
          return { kind: 'magnet_lift', group: this.magnetFloatingGroup };
        }
        if (
          this.raycaster.intersectObject(this.permanentMagnetGroup, true).length >
          0
        ) {
          return { kind: 'magnet', group: this.magnetFloatingGroup };
        }
      }
      if (this.electromagnetGroup.visible) {
        if (
          this.raycaster.intersectObject(this.switchBaseGroup, true).length > 0
        ) {
          return { kind: 'knife_switch', group: this.switchBaseGroup };
        }
        if (
          this.raycaster.intersectObject(this.primaryCoilGroup, true).length > 0
        ) {
          return { kind: 'electromagnet_coil', group: this.primaryCoilGroup };
        }
        if (this.raycaster.intersectObject(this.batteryGroup, true).length > 0) {
          return { kind: 'power_supply', group: this.batteryGroup };
        }
      }
      if (
        this.raycaster.intersectObject(this.ledModuleGroup, true).length > 0
      ) {
        return { kind: 'led_module', group: this.ledModuleGroup };
      }
      if (
        this.raycaster.intersectObject(this.coilLiftHandle, true).length > 0
      ) {
        return { kind: 'coil_lift', group: this.coilFloatingGroup };
      }
      if (
        this.raycaster.intersectObject(this.coilFloatingGroup, true).length > 0 ||
        this.raycaster.intersectObject(this.secondaryCoilGroup, true).length > 0
      ) {
        return { kind: 'secondary_coil', group: this.secondaryCoilGroup };
      }
      if (
        this.raycaster.intersectObject(this.galvRotateRingGroup, true).length > 0
      ) {
        return { kind: 'galvanometer_rotate', group: this.galvanometerGroup };
      }
      if (
        this.raycaster.intersectObject(this.galvanometerGroup, true).length > 0
      ) {
        return { kind: 'galvanometer', group: this.galvanometerGroup };
      }
      return { kind: 'none', group: null };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') {
        return;
      }

      updatePointerNDC(e);
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      this.pointerDownScreenPos.set(e.clientX, e.clientY);
      this.switchMovedDuringDrag = false;

      const hit = detectHitEquipment();
      if (hit.kind !== 'none' && hit.group) {
        if (this.controls) {
          this.controls.enabled = false;
        }
        e.stopPropagation();

        this.activeDragKind = hit.kind;
        this.activePointerId = e.pointerId;
        dom.style.cursor = 'grabbing';

        try {
          dom.setPointerCapture(e.pointerId);
        } catch {
          // Bỏ qua
        }

        if (hit.kind === 'magnet_lift') {
          this.camera.getWorldDirection(_vec3A);
          _dragPlane.setFromNormalAndCoplanarPoint(
            _vec3A.negate(),
            this.magnetFloatingGroup.getWorldPosition(_vec3B)
          );
          if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
            this.dragOffset.set(
              0,
              this.magnetFloatingGroup.position.y - _rayIntersect.y,
              0
            );
          }
          this.callbacks.onMagnetDragStart();
        } else if (hit.kind === 'coil_lift') {
          this.camera.getWorldDirection(_vec3A);
          _dragPlane.setFromNormalAndCoplanarPoint(
            _vec3A.negate(),
            this.coilFloatingGroup.getWorldPosition(_vec3B)
          );
          if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
            this.dragOffset.set(
              0,
              this.coilFloatingGroup.position.y - _rayIntersect.y,
              0
            );
          }
          this.callbacks.onCoilDragStart();
        } else if (
          hit.kind === 'magnet' ||
          hit.kind === 'secondary_coil' ||
          hit.kind === 'electromagnet_coil'
        ) {
          if (hit.kind === 'magnet' && this.magnetFloatingGroup.position.y > 0.05) {
            _vec3A.set(0, 1, 0);
            this.magnetFloatingGroup.getWorldPosition(_vec3B);
            _tableElevatedPlane.setFromNormalAndCoplanarPoint(_vec3A, _vec3B);
            if (
              this.raycaster.ray.intersectPlane(
                _tableElevatedPlane,
                _rayIntersect
              )
            ) {
              this.dragOffset.set(
                this.permanentMagnetGroup.position.x - _rayIntersect.x,
                0,
                this.magnetFloatingGroup.position.z - _rayIntersect.z
              );
            }
            this.callbacks.onMagnetDragStart();
          } else if (hit.kind === 'secondary_coil' && this.coilFloatingGroup.position.y > 0.05) {
            _vec3A.set(0, 1, 0);
            this.coilFloatingGroup.getWorldPosition(_vec3B);
            _tableElevatedPlane.setFromNormalAndCoplanarPoint(_vec3A, _vec3B);
            if (
              this.raycaster.ray.intersectPlane(
                _tableElevatedPlane,
                _rayIntersect
              )
            ) {
              this.dragOffset.set(
                this.secondaryCoilGroup.position.x - _rayIntersect.x,
                0,
                this.coilFloatingGroup.position.z - _rayIntersect.z
              );
            }
            this.callbacks.onCoilDragStart();
          } else {
            updateCameraFacingAxisPlane(hit.group.position);
            if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
              this.dragOffset.set(hit.group.position.x - _rayIntersect.x, 0, 0);
            }
            if (hit.kind === 'magnet') this.callbacks.onMagnetDragStart();
            else if (hit.kind === 'secondary_coil')
              this.callbacks.onCoilDragStart();
            else if (hit.kind === 'electromagnet_coil')
              this.callbacks.onElectromagnetDragStart();
          }
        } else if (hit.kind === 'galvanometer_rotate') {
          this.galvAutoFaceCamera = false;
          if (
            this.raycaster.ray.intersectPlane(
              _tableHorizontalPlane,
              _rayIntersect
            )
          ) {
            const pointerAngle = Math.atan2(
              _rayIntersect.x - this.galvanometerGroup.position.x,
              _rayIntersect.z - this.galvanometerGroup.position.z
            );
            this.galvDragStartAngleRad =
              this.galvanometerGroup.rotation.y - pointerAngle;
          }
        } else {
          // Thiết bị kéo tự do trên mặt phẳng bàn (X, Z): Bộ 2 LED, Điện kế G, Nguồn DC, Khóa K
          if (
            this.raycaster.ray.intersectPlane(
              _tableHorizontalPlane,
              _rayIntersect
            )
          ) {
            this.dragOffset.set(
              hit.group.position.x - _rayIntersect.x,
              0,
              hit.group.position.z - _rayIntersect.z
            );
          }
        }
        return;
      }

      // Chạm ra ngoài các thiết bị: bật OrbitControls để xoay camera
      if (this.controls) {
        this.controls.enabled = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointerNDC(e);
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);

      if (this.activeDragKind !== 'none' && e.pointerId === this.activePointerId) {
        e.stopPropagation();
        const coilX = this.secondaryCoilGroup.position.x;
        const leftSourceX = this.permanentMagnetGroup.visible
          ? this.permanentMagnetGroup.position.x
          : this.primaryCoilGroup.position.x;

        if (this.activeDragKind === 'magnet_lift') {
          this.camera.getWorldDirection(_vec3A);
          _dragPlane.setFromNormalAndCoplanarPoint(
            _vec3A.negate(),
            this.magnetFloatingGroup.getWorldPosition(_vec3B)
          );
          if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
            let targetY = THREE.MathUtils.clamp(
              _rayIntersect.y + this.dragOffset.y,
              0,
              2.5
            );
            // Tự động hít/snap về bệ đỡ trên bàn khi rà về gần mặt bàn
            if (targetY < 0.22) {
              targetY = 0;
            }
            this.magnetFloatingGroup.position.y = targetY;
            if (targetY === 0) {
              this.magnetFloatingGroup.position.z = 0;
            }
            this.callbacks.onMagnetDragMove(
              this.permanentMagnetGroup.position.x,
              targetY,
              this.magnetFloatingGroup.position.z
            );
          }
        } else if (this.activeDragKind === 'coil_lift') {
          this.camera.getWorldDirection(_vec3A);
          _dragPlane.setFromNormalAndCoplanarPoint(
            _vec3A.negate(),
            this.coilFloatingGroup.getWorldPosition(_vec3B)
          );
          if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
            let targetY = THREE.MathUtils.clamp(
              _rayIntersect.y + this.dragOffset.y,
              0,
              2.5
            );
            // Tự động hít/snap về bệ đỡ trên bàn khi rà về gần mặt bàn
            if (targetY < 0.22) {
              targetY = 0;
            }
            this.coilFloatingGroup.position.y = targetY;
            if (targetY === 0) {
              this.coilFloatingGroup.position.z = 0;
            }
            this.callbacks.onCoilDragMove(
              this.secondaryCoilGroup.position.x,
              targetY,
              this.coilFloatingGroup.position.z
            );
          }
        } else if (this.activeDragKind === 'magnet') {
          if (this.magnetFloatingGroup.position.y > 0.05) {
            _vec3A.set(0, 1, 0);
            this.magnetFloatingGroup.getWorldPosition(_vec3B);
            _tableElevatedPlane.setFromNormalAndCoplanarPoint(_vec3A, _vec3B);
            if (
              this.raycaster.ray.intersectPlane(
                _tableElevatedPlane,
                _rayIntersect
              )
            ) {
              const targetX = clampMagnetX(
                _rayIntersect.x + this.dragOffset.x,
                coilX
              );
              let targetZ = THREE.MathUtils.clamp(
                _rayIntersect.z + this.dragOffset.z,
                -1.8,
                1.8
              );
              if (Math.abs(targetZ) < 0.16 && this.magnetFloatingGroup.position.y < 0.35) {
                targetZ = 0;
              }
              this.permanentMagnetGroup.position.x = targetX;
              this.magnetFloatingGroup.position.z = targetZ;
              this.callbacks.onMagnetDragMove(
                targetX,
                this.magnetFloatingGroup.position.y,
                targetZ
              );
            }
          } else {
            updateCameraFacingAxisPlane(this.permanentMagnetGroup.position);
            if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
              const targetX = clampMagnetX(
                _rayIntersect.x + this.dragOffset.x,
                coilX
              );
              this.permanentMagnetGroup.position.x = targetX;
              this.callbacks.onMagnetDragMove(targetX, 0, 0);
            }
          }
        } else if (this.activeDragKind === 'secondary_coil') {
          if (this.coilFloatingGroup.position.y > 0.05) {
            _vec3A.set(0, 1, 0);
            this.coilFloatingGroup.getWorldPosition(_vec3B);
            _tableElevatedPlane.setFromNormalAndCoplanarPoint(_vec3A, _vec3B);
            if (
              this.raycaster.ray.intersectPlane(
                _tableElevatedPlane,
                _rayIntersect
              )
            ) {
              const targetCoilX = clampCoilX(
                _rayIntersect.x + this.dragOffset.x,
                leftSourceX
              );
              let targetZ = THREE.MathUtils.clamp(
                _rayIntersect.z + this.dragOffset.z,
                -1.8,
                1.8
              );
              if (Math.abs(targetZ) < 0.16 && this.coilFloatingGroup.position.y < 0.35) {
                targetZ = 0;
              }
              this.secondaryCoilGroup.position.x = targetCoilX;
              this.coilFloatingGroup.position.z = targetZ;
              this.callbacks.onCoilDragMove(
                targetCoilX,
                this.coilFloatingGroup.position.y,
                targetZ
              );
            }
          } else {
            updateCameraFacingAxisPlane(this.secondaryCoilGroup.position);
            if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
              const targetCoilX = clampCoilX(
                _rayIntersect.x + this.dragOffset.x,
                leftSourceX
              );
              this.secondaryCoilGroup.position.x = targetCoilX;
              this.callbacks.onCoilDragMove(targetCoilX, 0, 0);
            }
          }
        } else if (this.activeDragKind === 'electromagnet_coil') {
          updateCameraFacingAxisPlane(this.primaryCoilGroup.position);
          if (this.raycaster.ray.intersectPlane(_dragPlane, _rayIntersect)) {
            const targetEmX = clampMagnetX(
              _rayIntersect.x + this.dragOffset.x,
              coilX
            );
            this.primaryCoilGroup.position.x = targetEmX;
            this.callbacks.onElectromagnetDragMove(targetEmX);
          }
        } else if (this.activeDragKind === 'led_module') {
          if (
            this.raycaster.ray.intersectPlane(
              _tableHorizontalPlane,
              _rayIntersect
            )
          ) {
            this.ledModuleGroup.position.x = THREE.MathUtils.clamp(
              _rayIntersect.x + this.dragOffset.x,
              -4.2,
              3.95
            );
            this.ledModuleGroup.position.z = THREE.MathUtils.clamp(
              _rayIntersect.z + this.dragOffset.z,
              -1.85,
              1.88
            );
          }
        } else if (this.activeDragKind === 'galvanometer_rotate') {
          if (
            this.raycaster.ray.intersectPlane(
              _tableHorizontalPlane,
              _rayIntersect
            )
          ) {
            const pointerAngle = Math.atan2(
              _rayIntersect.x - this.galvanometerGroup.position.x,
              _rayIntersect.z - this.galvanometerGroup.position.z
            );
            let newAngleRad = this.galvDragStartAngleRad + pointerAngle;
            newAngleRad = Math.atan2(Math.sin(newAngleRad), Math.cos(newAngleRad));
            this.galvManualAngleRad = newAngleRad;
            this.galvanometerGroup.rotation.y = newAngleRad;
            const deg = Math.round(THREE.MathUtils.radToDeg(newAngleRad));
            this.callbacks.onGalvanometerRotate?.(deg, false);
          }
        } else if (this.activeDragKind === 'galvanometer') {
          if (
            this.raycaster.ray.intersectPlane(
              _tableHorizontalPlane,
              _rayIntersect
            )
          ) {
            this.galvanometerGroup.position.x = THREE.MathUtils.clamp(
              _rayIntersect.x + this.dragOffset.x,
              -1.5,
              3.9
            );
            this.galvanometerGroup.position.z = THREE.MathUtils.clamp(
              _rayIntersect.z + this.dragOffset.z,
              -1.85,
              1.55
            );
          }
        } else if (this.activeDragKind === 'power_supply') {
          if (
            this.raycaster.ray.intersectPlane(
              _tableHorizontalPlane,
              _rayIntersect
            )
          ) {
            this.batteryGroup.position.x = THREE.MathUtils.clamp(
              _rayIntersect.x + this.dragOffset.x,
              -4.6,
              -1.2
            );
            this.batteryGroup.position.z = THREE.MathUtils.clamp(
              _rayIntersect.z + this.dragOffset.z,
              -1.85,
              1.4
            );
          }
        } else if (this.activeDragKind === 'knife_switch') {
          const moveDist = Math.hypot(
            e.clientX - this.pointerDownScreenPos.x,
            e.clientY - this.pointerDownScreenPos.y
          );
          if (moveDist > 6) {
            this.switchMovedDuringDrag = true;
          }
          if (
            this.switchMovedDuringDrag &&
            this.raycaster.ray.intersectPlane(
              _tableHorizontalPlane,
              _rayIntersect
            )
          ) {
            this.switchBaseGroup.position.x = THREE.MathUtils.clamp(
              _rayIntersect.x + this.dragOffset.x,
              -4.6,
              -0.8
            );
            this.switchBaseGroup.position.z = THREE.MathUtils.clamp(
              _rayIntersect.z + this.dragOffset.z,
              -1.6,
              1.85
            );
          }
        }
        return;
      }

      // Hover chỉ báo con trỏ chuột khi di qua các thiết bị trên bàn
      if (e.pointerType === 'mouse' && this.activeDragKind === 'none') {
        const hit = detectHitEquipment();
        this.isHoveringDraggable = hit.kind !== 'none';
        if (hit.kind === 'magnet_lift' || hit.kind === 'coil_lift') {
          dom.style.cursor = 'ns-resize';
        } else {
          dom.style.cursor = this.isHoveringDraggable ? 'grab' : 'default';
        }
      }
    };

    const finishDrag = (e: PointerEvent) => {
      if (this.activeDragKind === 'none') return;
      if (this.activePointerId !== null && e.pointerId === this.activePointerId) {
        try {
          if (dom.hasPointerCapture(e.pointerId)) {
            dom.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Bỏ qua
        }
      }

      const finishedKind = this.activeDragKind;
      this.activeDragKind = 'none';
      this.activePointerId = null;
      dom.style.cursor = this.isHoveringDraggable ? 'grab' : 'default';
      if (this.controls) {
        this.controls.enabled = true;
      }

      if (finishedKind === 'magnet' || finishedKind === 'magnet_lift') {
        if (this.magnetFloatingGroup.position.y < 0.25) {
          const wasLifted = this.magnetFloatingGroup.position.y > 0.04;
          this.magnetFloatingGroup.position.set(0, 0, 0);
          this.callbacks.onMagnetDragMove(this.permanentMagnetGroup.position.x, 0, 0);
          if (wasLifted) {
            this.callbacks.onTableSnap?.();
          }
        }
        this.callbacks.onMagnetDragEnd();
      } else if (finishedKind === 'secondary_coil' || finishedKind === 'coil_lift') {
        if (this.coilFloatingGroup.position.y < 0.25) {
          const wasLifted = this.coilFloatingGroup.position.y > 0.04;
          this.coilFloatingGroup.position.set(0, 0, 0);
          this.callbacks.onCoilDragMove(this.secondaryCoilGroup.position.x, 0, 0);
          if (wasLifted) {
            this.callbacks.onTableSnap?.();
          }
        }
        this.callbacks.onCoilDragEnd();
      } else if (finishedKind === 'electromagnet_coil') {
        this.callbacks.onElectromagnetDragEnd();
      } else if (
        finishedKind === 'knife_switch' &&
        !this.switchMovedDuringDrag
      ) {
        this.callbacks.onToggleSwitchClick();
      }
    };

    dom.addEventListener('pointerdown', onPointerDown, { capture: true });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    this.cleanupEvents = () => {
      dom.removeEventListener('pointerdown', onPointerDown, { capture: true });
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }

  /** Cập nhật toàn bộ đồ họa 3D từ trạng thái mô hình vật lí */
  public syncFromPhysics(state: PhysicsState, params: SimulationParams): void {
    const isExp1 = params.experiment === 'permanent_magnet';
    this.permanentMagnetGroup.visible = isExp1;
    this.electromagnetGroup.visible = !isExp1;

    this.magnetGuideBadge.visible = this.show3DLabels && isExp1;
    this.switchGuideBadge.visible = this.show3DLabels && !isExp1;
    this.coilGuideBadge.visible = this.show3DLabels;
    this.ledGuideBadge.visible = this.show3DLabels;
    this.galvGuideBadge.visible = this.show3DLabels;

    if (this.show3DLabels) {
      this.magnetGuideBadge.quaternion.copy(this.camera.quaternion);
      this.coilGuideBadge.quaternion.copy(this.camera.quaternion);
      this.switchGuideBadge.quaternion.copy(this.camera.quaternion);
      this.ledGuideBadge.quaternion.copy(this.camera.quaternion);
      this.galvGuideBadge.quaternion.copy(this.camera.quaternion);
    }

    // Xoay Điện kế 360° hoặc Tự động quay đối diện hướng xem (Camera)
    if (this.galvAutoFaceCamera && this.activeDragKind !== 'galvanometer_rotate') {
      const targetAngle = Math.atan2(
        this.camera.position.x - this.galvanometerGroup.position.x,
        this.camera.position.z - this.galvanometerGroup.position.z
      );
      const diff = Math.atan2(
        Math.sin(targetAngle - this.galvanometerGroup.rotation.y),
        Math.cos(targetAngle - this.galvanometerGroup.rotation.y)
      );
      this.galvanometerGroup.rotation.y += diff * 0.18;
      this.galvManualAngleRad = this.galvanometerGroup.rotation.y;
    } else if (this.activeDragKind !== 'galvanometer_rotate') {
      const diff = Math.atan2(
        Math.sin(this.galvManualAngleRad - this.galvanometerGroup.rotation.y),
        Math.cos(this.galvManualAngleRad - this.galvanometerGroup.rotation.y)
      );
      this.galvanometerGroup.rotation.y += diff * 0.25;
    }

    // Cập nhật vị trí Cuộn dây cảm ứng thứ cấp trên bàn và trong không gian 3D
    this.secondaryCoilGroup.position.x = state.coilX;
    const targetCoilY = state.coilY ?? 0;
    const targetCoilZ = state.coilZ ?? 0;
    this.coilFloatingGroup.position.set(0, targetCoilY, targetCoilZ);
    this.coilCarriageGroup.position.set(0, 0, 0);

    if (targetCoilY > 0.04) {
      this.coilDropLine.visible = true;
      this.coilDropLine.position.set(0, (targetCoilY + 0.85) / 2, targetCoilZ);
      this.coilDropLine.scale.set(1, Math.max(0.01, targetCoilY + 0.85), 1);

      this.coilDropShadow.visible = true;
      this.coilDropShadow.position.set(0, 0.02, targetCoilZ);
      const shadowScale = Math.max(0.4, 1.25 - targetCoilY * 0.25);
      this.coilDropShadow.scale.set(shadowScale, shadowScale, shadowScale);
    } else {
      this.coilDropLine.visible = false;
      this.coilDropShadow.visible = false;
    }

    if (isExp1) {
      this.permanentMagnetGroup.position.x = state.magnetX;
      const targetY = state.magnetY ?? 0;
      const targetZ = state.magnetZ ?? 0;
      this.magnetFloatingGroup.position.set(0, targetY, targetZ);
      this.magnetCarriageGroup.position.set(0, 0, 0);

      // Hiển thị dây dóng độ cao thẳng đứng & bóng chiếu bàn khi nhấc lên
      if (targetY > 0.04) {
        this.magnetDropLine.visible = true;
        this.magnetDropLine.position.set(0, (targetY + 0.85) / 2, targetZ);
        this.magnetDropLine.scale.set(1, Math.max(0.01, targetY + 0.85), 1);

        this.magnetDropShadow.visible = true;
        this.magnetDropShadow.position.set(0, 0.02, targetZ);
        const shadowScale = Math.max(0.4, 1.2 - targetY * 0.28);
        this.magnetDropShadow.scale.set(shadowScale, shadowScale, shadowScale);
      } else {
        this.magnetDropLine.visible = false;
        this.magnetDropShadow.visible = false;
      }

      const mats = this.magnetBodyMesh.material as THREE.MeshStandardMaterial[];
      const nRight = params.magnetPolarity === 1;

      // Đồng bộ cả 6 mặt của thanh nam châm (Bao gồm mặt đầu +X, -X, mặt Trên/Dưới/Trước và mặt Sau -Z)
      const targetCapRight = nRight ? this.texCapN : this.texCapS;
      const targetCapLeft = nRight ? this.texCapS : this.texCapN;
      const targetFrontTopBottom = nRight ? this.texPoleNRight : this.texPoleSRight;
      // Mặt 5 (-Z, mặt sau) có trục U đảo chiều (+X sang -X), nên dùng texture đối xứng ngang để cực N và S khớp 100% với 5 mặt còn lại
      const targetBackFace = nRight ? this.texPoleSRight : this.texPoleNRight;

      if (mats[0].map !== targetCapRight) {
        mats[0].map = targetCapRight;
        mats[0].needsUpdate = true;
      }
      if (mats[1].map !== targetCapLeft) {
        mats[1].map = targetCapLeft;
        mats[1].needsUpdate = true;
      }
      for (let i = 2; i <= 4; i++) {
        if (mats[i].map !== targetFrontTopBottom) {
          mats[i].map = targetFrontTopBottom;
          mats[i].needsUpdate = true;
        }
      }
      if (mats[5].map !== targetBackFace) {
        mats[5].map = targetBackFace;
        mats[5].needsUpdate = true;
      }

      this.magnetDragRingMat.emissiveIntensity =
        this.activeDragKind === 'magnet' || this.activeDragKind === 'magnet_lift'
          ? 1.35
          : this.isHoveringDraggable
            ? 0.85
            : 0.4;
    } else {
      this.primaryCoilGroup.position.x = state.electromagnetX;
      this.ironCoreMesh.visible = params.hasIronCore;
      const targetBladeAngle = params.switchClosed
        ? THREE.MathUtils.degToRad(2)
        : THREE.MathUtils.degToRad(34);
      this.switchBladeGroup.rotation.z = THREE.MathUtils.lerp(
        this.switchBladeGroup.rotation.z,
        targetBladeAngle,
        0.35
      );
      const normIp = Math.min(1, state.primaryCurrent / 3.0);
      this.primaryCoilEmissiveMat.emissiveIntensity = normIp * 0.5;
      this.rebuildPrimaryWiresIfNeeded();
    }

    // Cập nhật dây nối động giữa Cuộn cảm ứng và Điện kế G
    this.rebuildSecondaryWiresIfNeeded(
      state.coilX,
      params.wiringSign,
      targetCoilY,
      targetCoilZ
    );

    // Cập nhật đường sức từ và hướng mũi tên chuẩn tiếp tuyến (Ra Bắc N - Vào Nam S)
    if (!this.showFieldLines) {
      this.fieldLinesGroup.visible = false;
    } else {
      const pulseTime = state.simTime;
      // Nhịp thở chớp nhẹ sinh động của từ trường
      const breath = Math.sin(pulseTime * 3.4) * 0.08;
      const waveTraveling = Math.cos(pulseTime * 2.6) * 0.06;
      // Tăng phát sáng sống động khi có chuyển động tương đối hoặc từ thông biến thiên
      const dynActivity = Math.min(
        0.35,
        Math.abs(state.magnetVelocity) * 0.12 + Math.abs(state.dPhiDt) * 16
      );

      if (isExp1) {
        this.fieldLinesGroup.visible = true;
        this.fieldLinesGroup.position.set(
          state.magnetX,
          0.85 + (state.magnetY ?? 0),
          state.magnetZ ?? 0
        );
        this.fieldLineMat.opacity = Math.min(0.92, 0.68 + breath + dynActivity);
        this.fieldLineMat.emissiveIntensity = Math.min(
          1.15,
          0.55 + breath * 1.5 + dynActivity
        );
        this.fieldLineOuterMat.opacity = Math.min(
          0.72,
          0.46 + waveTraveling + dynActivity * 0.7
        );
        this.fieldLineOuterMat.emissiveIntensity = Math.min(
          0.9,
          0.45 + waveTraveling + dynActivity * 0.8
        );
      } else {
        const normIp = Math.min(1, state.primaryCurrent / 3.0);
        this.fieldLinesGroup.visible = normIp > 0.02;
        this.fieldLinesGroup.position.set(state.electromagnetX, 0.85, 0);
        this.fieldLineMat.opacity = Math.min(
          0.92,
          0.14 + normIp * 0.56 + breath * 0.5
        );
        this.fieldLineMat.emissiveIntensity =
          0.35 + normIp * 0.6 + breath * 0.8;
        this.fieldLineOuterMat.opacity = Math.min(
          0.72,
          0.08 + normIp * 0.4 + waveTraveling * 0.5
        );
        this.fieldLineOuterMat.emissiveIntensity =
          0.25 + normIp * 0.5 + waveTraveling * 0.6;
      }

      const fieldSign = isExp1 ? params.magnetPolarity : params.batteryPolarity;
      _vec3C.set(0, 1, 0); // Trục đỉnh hình nón mũi tên (+Y)
      for (let idx = 0; idx < this.fieldArrowMeshes.length; idx++) {
        const item = this.fieldArrowMeshes[idx];
        item.curve.getPointAt(item.t, _vec3A);
        item.curve.getTangentAt(item.t, _vec3B);
        if (fieldSign < 0) {
          _vec3B.negate();
        }
        _vec3B.normalize();
        item.mesh.position.copy(_vec3A);
        // Căn chỉnh hướng mũi tên bằng Quaternion theo tiếp tuyến cục bộ
        item.mesh.quaternion.setFromUnitVectors(_vec3C, _vec3B);

        // Hiệu ứng chớp sóng lăn tăn nhịp nhàng dọc theo mũi tên
        const arrowWave =
          1.0 + 0.1 * Math.sin(pulseTime * 4.2 - item.t * 6.28);
        item.mesh.scale.set(arrowWave, arrowWave, arrowWave);
      }
    }

    // Cập nhật vòng cực cảm ứng Lenz & ánh sáng lòng cuộn dây
    const absFlux = Math.min(1, Math.abs(state.fluxPerTurn) / 0.01);
    this.coilInnerGlowMat.opacity = 0.05 + absFlux * 0.25;

    const absIs = Math.abs(state.secondaryCurrent);
    if (absIs > 0.005) {
      const isNorthFace = state.secondaryCurrent < 0;
      this.lenzRingMat.color.setHex(isNorthFace ? 0xef4444 : 0x3b82f6);
      this.lenzRingMat.emissive.setHex(isNorthFace ? 0xdc2626 : 0x2563eb);
      this.lenzRingMat.emissiveIntensity = Math.min(1.15, absIs * 0.9);
    } else {
      this.lenzRingMat.color.setHex(0x64748b);
      this.lenzRingMat.emissiveIntensity = 0;
    }

    // Cập nhật góc quay thực của kim điện kế 3D
    const clampedDeg = Math.max(
      -GALVANOMETER_MAX_DEG,
      Math.min(GALVANOMETER_MAX_DEG, state.needleAngleDeg)
    );
    this.needlePivotGroup.rotation.z = THREE.MathUtils.degToRad(-clampedDeg);

    // Cập nhật độ phát sáng của Bộ 2 Đèn LED mắc song song ngược cực:
    // - Từ thông Φ tăng (kéo nam châm tới gần / đóng khóa K): Đèn ĐỎ sáng rực
    // - Từ thông Φ giảm (kéo nam châm lùi xa / ngắt khóa K): Đèn XANH sáng rực
    const redB = state.redLedBrightness ?? 0;
    const greenB = state.greenLedBrightness ?? 0;

    if (redB > 0.01) {
      this.redLedDomeMat.color.setHex(0xff2a2a);
      this.redLedDomeMat.emissiveIntensity = 0.8 + redB * 2.4;
      this.redLedCoreMat.opacity = Math.min(1, 0.45 + redB * 0.55);
      this.redLedHaloMat.opacity = Math.min(0.85, 0.25 + redB * 0.65);
    } else {
      this.redLedDomeMat.color.setHex(0x7f1d1d);
      this.redLedDomeMat.emissiveIntensity = 0.04;
      this.redLedCoreMat.opacity = 0.08;
      this.redLedHaloMat.opacity = 0;
    }

    if (greenB > 0.01) {
      this.greenLedDomeMat.color.setHex(0x10b981);
      this.greenLedDomeMat.emissiveIntensity = 0.8 + greenB * 2.4;
      this.greenLedCoreMat.opacity = Math.min(1, 0.45 + greenB * 0.55);
      this.greenLedHaloMat.opacity = Math.min(0.85, 0.25 + greenB * 0.65);
    } else {
      this.greenLedDomeMat.color.setHex(0x064e3b);
      this.greenLedDomeMat.emissiveIntensity = 0.04;
      this.greenLedCoreMat.opacity = 0.08;
      this.greenLedHaloMat.opacity = 0;
    }

    // Cập nhật hạt dòng điện thứ cấp: nhiều hạt nhỏ, sáng rực rỡ và chạy đều đặn
    const showSecParticles = this.showCurrentParticles;
    this.secondaryParticlesInstanced.visible = showSecParticles;
    const secCount = this.secondaryParticlesInstanced.count;
    const isCurrentFlowing = absIs > 0.001;
    const pScale = isCurrentFlowing ? 1.05 : 0.45;
    _scaleVec.set(pScale, pScale, pScale);
    this.secondaryParticleMat.emissiveIntensity = isCurrentFlowing
      ? Math.min(1.4, 0.6 + absIs * 0.8)
      : 0.12;

    for (let i = 0; i < secCount; i++) {
      let u = (i / secCount + state.particlePhase) % 1;
      if (u < 0) u += 1;
      this.secondaryLoopCurve.getPointAt(u, _vec3A);
      _quat.identity();
      _mat4.compose(_vec3A, _quat, _scaleVec);
      this.secondaryParticlesInstanced.setMatrixAt(i, _mat4);
    }
    this.secondaryParticlesInstanced.instanceMatrix.needsUpdate = true;

    // Cập nhật hạt dòng điện sơ cấp (TN2)
    const showPriParticles = !isExp1 && this.showCurrentParticles;
    this.primaryParticlesInstanced.visible = showPriParticles;
    if (showPriParticles) {
      const priCount = this.primaryParticlesInstanced.count;
      const isPriFlowing = state.primaryCurrent > 0.02;
      const priPhase =
        (state.simTime *
          0.45 *
          params.batteryPolarity *
          (state.primaryCurrent / 3)) %
        1;
      const priScale = isPriFlowing ? 1.0 : 0.4;
      _scaleVec.set(priScale, priScale, priScale);
      for (let i = 0; i < priCount; i++) {
        let u = (i / priCount + priPhase) % 1;
        if (u < 0) u += 1;
        this.primaryLoopCurve.getPointAt(u, _vec3A);
        _mat4.compose(_vec3A, _quat, _scaleVec);
        this.primaryParticlesInstanced.setMatrixAt(i, _mat4);
      }
      this.primaryParticlesInstanced.instanceMatrix.needsUpdate = true;
    }

    if (this.controls.enabled && this.activeDragKind === 'none') {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.cleanupEvents) {
      this.cleanupEvents();
    }
    this.controls.dispose();
    for (const item of this.disposables) {
      item.dispose();
    }
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    this.renderer.dispose();
  }
}
