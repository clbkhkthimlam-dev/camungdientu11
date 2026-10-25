/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mô hình vật lí độc lập cho phòng thí nghiệm ảo 3D Cảm ứng điện từ (Lớp 9)
 * Tuân thủ chặt chẽ định luật Faraday–Lenz và quy ước dấu cố định.
 * Hỗ trợ di chuyển tương đối cả Nam châm, Cuộn dây cảm ứng và Nam châm điện trên mặt bàn thí nghiệm.
 */

export type ExperimentId = 'permanent_magnet' | 'electromagnet';
export type FluxModelMode = 'qualitative' | 'dipole';
export type SecondaryCircuitMode = 'resistive' | 'rl';
export type InteractionMode = 'drag_magnet' | 'orbit_camera';

export interface SimulationParams {
  experiment: ExperimentId;
  fluxModel: FluxModelMode;
  secondaryCircuitMode: SecondaryCircuitMode;
  /** Số vòng dây thứ cấp N (mặc định 200 vòng) */
  coilTurnsN: number;
  /** Tổng điện trở mạch thứ cấp R_total (Ohm chuẩn hóa) */
  totalResistance: number;
  /** Độ tự cảm mạch thứ cấp L_s (khi chọn chế độ RL thứ cấp) */
  secondaryInductance: number;
  /** Cực nam châm phía gần cuộn dây (+1: Cực Bắc N hướng về cuộn dây, -1: Cực Nam S hướng về cuộn dây) */
  magnetPolarity: 1 | -1;
  /** Tốc độ di chuyển tự động (0.4 = Chậm, 1.0 = Bình thường, 2.0 = Nhanh) */
  autoSpeedMultiplier: number;
  /** Đảo hai đầu dây nối điện kế (+1: Đấu chuẩn, -1: Đảo cực dây nối điện kế) */
  wiringSign: 1 | -1;
  /** Công tắc mạch sơ cấp nam châm điện (true = Đóng mạch, false = Ngắt mạch) */
  switchClosed: boolean;
  /** Cực nguồn điện một chiều mạch sơ cấp (+1 hoặc -1) */
  batteryPolarity: 1 | -1;
  /** Có lõi sắt từ trong lòng nam châm điện hay không */
  hasIronCore: boolean;
  /** Điện áp nguồn sơ cấp chuẩn hóa */
  primaryVoltage: number;
}

export interface PhysicsState {
  /** Thời gian mô phỏng tích lũy (s) */
  simTime: number;
  /** Vị trí tâm nam châm vĩnh cửu trên trục X */
  magnetX: number;
  /** Độ cao nhấc nam châm vĩnh cửu lên trong không gian 3D (0 = trên bàn/giá đỡ ray, > 0 = nhấc lên không gian) */
  magnetY: number;
  /** Vị trí nam châm vĩnh cửu theo trục Z độ sâu (-1.8m đến +1.8m) */
  magnetZ: number;
  /** Trạng thái nam châm đang được nhấc lên khỏi giá đỡ trên bàn */
  isMagnetLifted: boolean;
  /** Góc quay của thanh nam châm trên trụ thoi quanh trục thẳng đứng Y (độ, 0..360°) để phát điện xoay chiều AC */
  magnetAngleDeg: number;
  /** Vận tốc góc của nam châm trên trụ thoi (rad/s) */
  magnetAngularVelocity: number;
  /** Chế độ máy phát điện xoay chiều AC: nam châm quay liên tục trên trụ thoi trước cuộn dây */
  isRotatingAC: boolean;
  /** Tốc độ quay của nam châm (vòng/phút - RPM) */
  acRpm: number;
  /** Vị trí tâm cuộn dây cảm ứng thứ cấp trên trục X (có thể dời qua lại trên bàn) */
  coilX: number;
  /** Độ cao nhấc cuộn dây cảm ứng lên trong không gian 3D (0 = trên giá đỡ trên bàn, > 0 = nhấc lên 3D) */
  coilY: number;
  /** Vị trí cuộn dây cảm ứng theo trục Z độ sâu (-1.8m đến +1.8m) */
  coilZ: number;
  /** Trạng thái cuộn dây cảm ứng đang được nhấc lên khỏi giá đỡ trên bàn */
  isCoilLifted: boolean;
  /** Vị trí tâm cuộn sơ cấp nam châm điện trên trục X (có thể dời qua lại trên bàn) */
  electromagnetX: number;
  /** Vận tốc tương đối dọc trục X giữa nguồn từ trường và cuộn dây cảm ứng (đơn vị/s) */
  magnetVelocity: number;
  /** Pha dao động tự động khi bật chế độ chạy tự động */
  autoPhase: number;
  /** Từ thông qua 1 vòng dây ở bước hiện tại Φ_k (chuẩn hóa) */
  fluxPerTurn: number;
  /** Từ thông qua 1 vòng dây ở bước ngay trước Φ_{k-1} */
  previousFluxPerTurn: number;
  /** Từ thông móc vòng N * Φ_k */
  fluxLinkage: number;
  /** Tốc độ biến thiên từ thông qua 1 vòng dΦ/dt */
  dPhiDt: number;
  /** Suất điện động cảm ứng E = -N * dΦ/dt */
  emf: number;
  /** Dòng điện cảm ứng mạch thứ cấp I_s */
  secondaryCurrent: number;
  /** Dòng điện mạch sơ cấp nam châm điện I_p */
  primaryCurrent: number;
  /** Tốc độ biến thiên dòng sơ cấp dI_p/dt */
  dIpDt: number;
  /** Góc lệch mục tiêu của kim điện kế (độ, từ -45 đến +45) */
  needleTargetAngleDeg: number;
  /** Góc lệch thực tế của kim điện kế (độ, có giảm chấn cơ học) */
  needleAngleDeg: number;
  /** Vận tốc góc của kim điện kế (độ/s) */
  needleAngularVelocity: number;
  /** Pha dịch chuyển hạt chỉ chiều dòng điện quy ước */
  particlePhase: number;
  /** Tốc độ biến thiên độ lớn từ thông d|Φ|/dt (dương khi từ thông tăng, âm khi từ thông giảm) */
  dAbsPhiDt: number;
  /** Độ sáng đèn LED Đỏ (0..1) — Sáng khi từ thông tăng (kéo nam châm tới gần / đóng mạch) */
  redLedBrightness: number;
  /** Độ sáng đèn LED Xanh (0..1) — Sáng khi từ thông giảm (kéo nam châm ra xa / ngắt mạch) */
  greenLedBrightness: number;
}

/** Giới hạn hình học trên mặt bàn thí nghiệm */
export const COIL_CENTER_X = 0;
export const ELECTROMAGNET_DEFAULT_X = -1.72;
export const MIN_SEPARATION_X = 1.1;
export const TABLE_MIN_X = -4.3;
export const TABLE_MAX_X = 2.4;
export const MAGNET_MIN_X = -4.2;
export const MAGNET_MAX_X = -1.1;
export const MAGNET_DEFAULT_X = -2.65;

/** Bước thời gian vật lí cố định (1/120 giây) */
export const FIXED_DT = 1 / 120;

/** Ngưỡng khử nhiễu số học để kim đứng yên tuyệt đối ở 0 khi không biến thiên */
export const EPSILON_FLUX_RATE = 1e-5;
export const EPSILON_CURRENT = 1e-4;

/** Các hằng số mô hình điện kế và mạch RL */
export const GALVANOMETER_MAX_DEG = 45;
export const GALVANOMETER_SENSITIVITY_K = 22.0;
export const TAU_PRIMARY_ON = 0.28;
export const TAU_PRIMARY_OFF = 0.22;
export const PRIMARY_RESISTANCE = 2.0;

export function createDefaultParams(): SimulationParams {
  return {
    experiment: 'permanent_magnet',
    fluxModel: 'qualitative',
    secondaryCircuitMode: 'resistive',
    coilTurnsN: 200,
    totalResistance: 10.0,
    secondaryInductance: 0.18,
    magnetPolarity: 1,
    autoSpeedMultiplier: 1.0,
    wiringSign: 1,
    switchClosed: false,
    batteryPolarity: 1,
    hasIronCore: true,
    primaryVoltage: 6.0,
  };
}

export function clampMagnetX(x: number, coilX: number = COIL_CENTER_X): number {
  if (!Number.isFinite(x)) return MAGNET_DEFAULT_X;
  const maxAllowed = coilX - MIN_SEPARATION_X;
  return Math.max(TABLE_MIN_X, Math.min(maxAllowed, x));
}

export function clampCoilX(coilX: number, leftSourceX: number): number {
  if (!Number.isFinite(coilX)) return COIL_CENTER_X;
  const minAllowed = leftSourceX + MIN_SEPARATION_X;
  return Math.max(minAllowed, Math.min(TABLE_MAX_X, coilX));
}

/**
 * Tính từ thông qua 1 vòng dây thứ cấp Φ(magnetX, coilX, polarity, magnetY, magnetZ, coilY, coilZ) cho Thí nghiệm 1.
 * Hỗ trợ chuyển động trong không gian 3D của cả Nam châm và Cuộn dây (nhấc lên cao Y, dời chiều sâu Z).
 * Khi Y = 0 và Z = 0, kết quả trùng khớp 100% với mô hình dọc trục 1D trên bàn.
 */
export function computePermanentMagnetFluxPerTurn(
  magnetX: number,
  polarity: 1 | -1,
  mode: FluxModelMode,
  coilX: number = COIL_CENTER_X,
  magnetY: number = 0,
  magnetZ: number = 0,
  coilY: number = 0,
  coilZ: number = 0,
  magnetAngleDeg: number = 0
): number {
  const safeCoilX = Number.isFinite(coilX) ? coilX : COIL_CENTER_X;
  const clampedX = clampMagnetX(magnetX, safeCoilX);
  const dx = safeCoilX - clampedX;
  const dy = (Number.isFinite(coilY) ? coilY : 0) - (Number.isFinite(magnetY) ? magnetY : 0);
  const dz = (Number.isFinite(coilZ) ? coilZ : 0) - (Number.isFinite(magnetZ) ? magnetZ : 0);

  // Khoảng cách 3D thực tế trong không gian giữa nam châm và tâm cuộn cảm ứng
  const r3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const r = Math.max(MIN_SEPARATION_X, r3d);
  const axialProjection = r > 0 ? Math.min(1, Math.abs(dx) / r) : 1;

  // Hệ số góc quay quanh trục Y thẳng đứng của nam châm trên trụ thoi:
  // Tại angle = 0: Cực gần (polarity) hướng thẳng vào cuộn dây -> cos(0) = 1 (cực đại)
  // Tại angle = 90° hoặc 270°: Nam châm nằm ngang vuông góc -> cos(90°) = 0 (từ thông triệt tiêu)
  // Tại angle = 180°: Cực đối diện quay về phía cuộn dây -> cos(180°) = -1 (đảo cực từ thông)
  const angleRad = (magnetAngleDeg * Math.PI) / 180;
  const rotationFactor = Math.cos(angleRad);

  if (mode === 'dipole') {
    const a = 0.65;
    const normFactor = 0.042;
    const denom = Math.pow(a * a + r * r, 1.5);
    return polarity * ((normFactor * a * a) / (2 * denom)) * axialProjection * rotationFactor;
  }

  const dMin = MIN_SEPARATION_X; // 1.1
  const delta = Math.max(0, r - dMin);
  const sigma = 1.15;
  const phi0 = 0.012;
  const gaussianPart = Math.exp(-(delta * delta) / (2 * sigma * sigma));
  const decayTail = 1 / (1 + 0.45 * delta);
  return polarity * phi0 * gaussianPart * decayTail * axialProjection * rotationFactor;
}

/**
 * Tính từ thông qua 1 vòng dây thứ cấp từ dòng sơ cấp I_p và khoảng cách giữa 2 cuộn dây (Thí nghiệm 2).
 */
export function computeElectromagnetFluxPerTurn(
  primaryCurrent: number,
  hasIronCore: boolean,
  batteryPolarity: 1 | -1,
  electromagnetX: number = ELECTROMAGNET_DEFAULT_X,
  coilX: number = COIL_CENTER_X
): number {
  const coreMultiplier = hasIronCore ? 1.0 : 0.38;
  const mutualFluxPerAmp = 0.0036;
  const z = Math.max(MIN_SEPARATION_X, Math.abs(coilX - electromagnetX));
  const refZ = Math.abs(COIL_CENTER_X - ELECTROMAGNET_DEFAULT_X); // 1.72
  const deltaZ = z - refZ;
  const distanceFactor = Math.exp(-0.55 * deltaZ);
  return (
    batteryPolarity *
    coreMultiplier *
    mutualFluxPerAmp *
    distanceFactor *
    primaryCurrent
  );
}

export function computeCurrentFluxPerTurn(
  state: Pick<PhysicsState, 'magnetX' | 'primaryCurrent'> &
    Partial<
      Pick<
        PhysicsState,
        | 'coilX'
        | 'coilY'
        | 'coilZ'
        | 'electromagnetX'
        | 'magnetY'
        | 'magnetZ'
        | 'magnetAngleDeg'
      >
    >,
  params: SimulationParams
): number {
  const coilX = state.coilX ?? COIL_CENTER_X;
  const emX = state.electromagnetX ?? ELECTROMAGNET_DEFAULT_X;
  if (params.experiment === 'permanent_magnet') {
    return computePermanentMagnetFluxPerTurn(
      state.magnetX,
      params.magnetPolarity,
      params.fluxModel,
      coilX,
      state.magnetY ?? 0,
      state.magnetZ ?? 0,
      state.coilY ?? 0,
      state.coilZ ?? 0,
      state.magnetAngleDeg ?? 0
    );
  }
  return computeElectromagnetFluxPerTurn(
    state.primaryCurrent,
    params.hasIronCore,
    params.batteryPolarity,
    emX,
    coilX
  );
}

export function createInitialPhysicsState(
  params: SimulationParams = createDefaultParams()
): PhysicsState {
  const initialX = MAGNET_DEFAULT_X;
  const initialCoilX = COIL_CENTER_X;
  const initialEmX = ELECTROMAGNET_DEFAULT_X;
  const initialPrimaryCurrent = 0;
  const initialFlux = computeCurrentFluxPerTurn(
    {
      magnetX: initialX,
      coilX: initialCoilX,
      electromagnetX: initialEmX,
      primaryCurrent: initialPrimaryCurrent,
      magnetAngleDeg: 0,
    },
    params
  );

  return {
    simTime: 0,
    magnetX: initialX,
    magnetY: 0,
    magnetZ: 0,
    isMagnetLifted: false,
    magnetAngleDeg: 0,
    magnetAngularVelocity: 0,
    isRotatingAC: false,
    acRpm: 120,
    coilX: initialCoilX,
    coilY: 0,
    coilZ: 0,
    isCoilLifted: false,
    electromagnetX: initialEmX,
    magnetVelocity: 0,
    autoPhase: 0,
    fluxPerTurn: initialFlux,
    previousFluxPerTurn: initialFlux,
    fluxLinkage: params.coilTurnsN * initialFlux,
    dPhiDt: 0,
    emf: 0,
    secondaryCurrent: 0,
    primaryCurrent: initialPrimaryCurrent,
    dIpDt: 0,
    needleTargetAngleDeg: 0,
    needleAngleDeg: 0,
    needleAngularVelocity: 0,
    particlePhase: 0,
    dAbsPhiDt: 0,
    redLedBrightness: 0,
    greenLedBrightness: 0,
  };
}

export function synchronizeFluxState(
  state: PhysicsState,
  params: SimulationParams
): PhysicsState {
  const currentFlux = computeCurrentFluxPerTurn(state, params);
  return {
    ...state,
    magnetY: state.magnetY ?? 0,
    magnetZ: state.magnetZ ?? 0,
    isMagnetLifted: state.isMagnetLifted ?? false,
    magnetAngleDeg: state.magnetAngleDeg ?? 0,
    magnetAngularVelocity: 0,
    isRotatingAC: state.isRotatingAC ?? false,
    acRpm: state.acRpm ?? 120,
    coilY: state.coilY ?? 0,
    coilZ: state.coilZ ?? 0,
    isCoilLifted: state.isCoilLifted ?? false,
    fluxPerTurn: currentFlux,
    previousFluxPerTurn: currentFlux,
    fluxLinkage: params.coilTurnsN * currentFlux,
    magnetVelocity: 0,
    dPhiDt: 0,
    dIpDt: 0,
    emf: 0,
    secondaryCurrent: 0,
    needleTargetAngleDeg: 0,
    dAbsPhiDt: 0,
    redLedBrightness: 0,
    greenLedBrightness: 0,
  };
}

export interface StepInput {
  dt: number;
  isRunning: boolean;
  isDraggingMagnet: boolean;
  targetMagnetX?: number;
  targetMagnetY?: number;
  targetMagnetZ?: number;
  isMagnetLifted?: boolean;
  isDraggingCoil?: boolean;
  targetCoilX?: number;
  targetCoilY?: number;
  targetCoilZ?: number;
  isCoilLifted?: boolean;
  isDraggingElectromagnet?: boolean;
  targetElectromagnetX?: number;
  isRotatingAC?: boolean;
  acRpm?: number;
  targetMagnetAngleDeg?: number;
  isDraggingMagnetRotate?: boolean;
}

export function stepPhysics(
  prevState: PhysicsState,
  params: SimulationParams,
  input: StepInput
): PhysicsState {
  const dt =
    Number.isFinite(input.dt) && input.dt > 0 ? Math.min(input.dt, 0.05) : FIXED_DT;

  let nextCoilX = prevState.coilX ?? COIL_CENTER_X;
  let nextCoilY = prevState.coilY ?? 0;
  let nextCoilZ = prevState.coilZ ?? 0;
  let nextIsCoilLifted = prevState.isCoilLifted ?? false;

  let nextMagnetX = prevState.magnetX;
  let nextMagnetY = prevState.magnetY ?? 0;
  let nextMagnetZ = prevState.magnetZ ?? 0;
  let nextIsMagnetLifted = prevState.isMagnetLifted ?? false;

  let nextEmX = prevState.electromagnetX ?? ELECTROMAGNET_DEFAULT_X;
  let nextVelocity = 0;
  let nextAutoPhase = prevState.autoPhase;
  let nextPrimaryCurrent = prevState.primaryCurrent;
  let nextDIpDt = 0;

  let nextMagnetAngleDeg = prevState.magnetAngleDeg ?? 0;
  let nextMagnetAngularVelocity = 0;
  let nextIsRotatingAC = input.isRotatingAC ?? prevState.isRotatingAC ?? false;
  let nextAcRpm = input.acRpm ?? prevState.acRpm ?? 120;

  const smoothFactor = 1 - Math.exp(-32 * dt);
  const SNAP_TABLE_Y_THRESHOLD = 0.22;
  const SNAP_TABLE_Z_THRESHOLD = 0.16;

  // Cập nhật vị trí cuộn dây cảm ứng (Hỗ trợ kéo di chuyển tự do trong không gian 3D X, Y, Z)
  if (input.isDraggingCoil) {
    if (typeof input.targetCoilX === 'number') {
      const leftLimit =
        params.experiment === 'permanent_magnet' ? nextMagnetX : nextEmX;
      const clampedTargetCoil = clampCoilX(input.targetCoilX, leftLimit);
      nextCoilX = prevState.coilX + (clampedTargetCoil - prevState.coilX) * smoothFactor;
      if (Math.abs(nextCoilX - clampedTargetCoil) < 1e-4) {
        nextCoilX = clampedTargetCoil;
      }
    }
    if (typeof input.targetCoilY === 'number') {
      let clampedY = Math.max(0, Math.min(2.5, input.targetCoilY));
      // Tự động hít/snap về bệ đỡ trên bàn khi rà về gần mặt bàn
      if (clampedY < SNAP_TABLE_Y_THRESHOLD) {
        clampedY = 0;
      }
      nextCoilY = (prevState.coilY ?? 0) + (clampedY - (prevState.coilY ?? 0)) * smoothFactor;
      if (Math.abs(nextCoilY - clampedY) < 1e-4) nextCoilY = clampedY;
    }
    if (typeof input.targetCoilZ === 'number') {
      let clampedZ = Math.max(-1.8, Math.min(1.8, input.targetCoilZ));
      if (Math.abs(clampedZ) < SNAP_TABLE_Z_THRESHOLD && nextCoilY < 0.35) {
        clampedZ = 0;
      }
      nextCoilZ = (prevState.coilZ ?? 0) + (clampedZ - (prevState.coilZ ?? 0)) * smoothFactor;
      if (Math.abs(nextCoilZ - clampedZ) < 1e-4) nextCoilZ = clampedZ;
    }
    nextIsCoilLifted = nextCoilY > 0.04 || Math.abs(nextCoilZ) > 0.04;
  } else if (typeof input.isCoilLifted === 'boolean') {
    nextIsCoilLifted = input.isCoilLifted;
    if (!nextIsCoilLifted) {
      // Đặt lại đúng vị trí vào bệ trên bàn: chuyển động êm về Y = 0, Z = 0
      nextCoilY = (prevState.coilY ?? 0) + (0 - (prevState.coilY ?? 0)) * smoothFactor;
      nextCoilZ = (prevState.coilZ ?? 0) + (0 - (prevState.coilZ ?? 0)) * smoothFactor;
      if (nextCoilY < 0.01) nextCoilY = 0;
      if (Math.abs(nextCoilZ) < 0.01) nextCoilZ = 0;
    } else if (typeof input.targetCoilY === 'number') {
      const clampedY = Math.max(0, Math.min(2.5, input.targetCoilY));
      nextCoilY = (prevState.coilY ?? 0) + (clampedY - (prevState.coilY ?? 0)) * smoothFactor;
    }
  } else if (nextIsCoilLifted) {
    if (typeof input.targetCoilY === 'number') {
      let clampedY = Math.max(0, Math.min(2.5, input.targetCoilY));
      if (clampedY < SNAP_TABLE_Y_THRESHOLD) clampedY = 0;
      nextCoilY = (prevState.coilY ?? 0) + (clampedY - (prevState.coilY ?? 0)) * smoothFactor;
    }
    if (typeof input.targetCoilZ === 'number') {
      let clampedZ = Math.max(-1.8, Math.min(1.8, input.targetCoilZ));
      if (Math.abs(clampedZ) < SNAP_TABLE_Z_THRESHOLD && nextCoilY < 0.35) clampedZ = 0;
      nextCoilZ = (prevState.coilZ ?? 0) + (clampedZ - (prevState.coilZ ?? 0)) * smoothFactor;
    }
    nextIsCoilLifted = nextCoilY > 0.04 || Math.abs(nextCoilZ) > 0.04;
  }

  if (params.experiment === 'permanent_magnet') {
    if (input.isDraggingMagnet && typeof input.targetMagnetX === 'number') {
      const clampedTarget = clampMagnetX(input.targetMagnetX, nextCoilX);
      const rawNextX =
        prevState.magnetX + (clampedTarget - prevState.magnetX) * smoothFactor;
      nextMagnetX = clampMagnetX(rawNextX, nextCoilX);
    } else if (input.isRunning) {
      const angularFreq = 1.65 * params.autoSpeedMultiplier;
      nextAutoPhase = prevState.autoPhase + angularFreq * dt;
      const maxRight = nextCoilX - MIN_SEPARATION_X;
      const minLeft = Math.max(TABLE_MIN_X, maxRight - 3.1);
      const center = (minLeft + maxRight) * 0.5;
      const amplitude = (maxRight - minLeft) * 0.44;
      nextMagnetX = clampMagnetX(
        center + amplitude * Math.sin(nextAutoPhase),
        nextCoilX
      );
    } else {
      nextMagnetX = clampMagnetX(prevState.magnetX, nextCoilX);
    }

    // Xử lý vị trí 3D nam châm (nhấc lên Y, dời chiều sâu Z + tự động hít/snap về bàn khi rà gần)
    if (input.isDraggingMagnet) {
      if (typeof input.targetMagnetY === 'number') {
        let clampedY = Math.max(0, Math.min(2.5, input.targetMagnetY));
        if (clampedY < SNAP_TABLE_Y_THRESHOLD) {
          clampedY = 0;
        }
        nextMagnetY = prevState.magnetY + (clampedY - prevState.magnetY) * smoothFactor;
        if (Math.abs(nextMagnetY - clampedY) < 1e-4) nextMagnetY = clampedY;
      }
      if (typeof input.targetMagnetZ === 'number') {
        let clampedZ = Math.max(-1.8, Math.min(1.8, input.targetMagnetZ));
        if (Math.abs(clampedZ) < SNAP_TABLE_Z_THRESHOLD && nextMagnetY < 0.35) {
          clampedZ = 0;
        }
        nextMagnetZ = prevState.magnetZ + (clampedZ - prevState.magnetZ) * smoothFactor;
        if (Math.abs(nextMagnetZ - clampedZ) < 1e-4) nextMagnetZ = clampedZ;
      }
      nextIsMagnetLifted = nextMagnetY > 0.04 || Math.abs(nextMagnetZ) > 0.04;
    } else if (typeof input.isMagnetLifted === 'boolean') {
      nextIsMagnetLifted = input.isMagnetLifted;
      if (!nextIsMagnetLifted) {
        // Đặt lại xuống bàn: chuyển động êm về 0
        nextMagnetY = prevState.magnetY + (0 - prevState.magnetY) * smoothFactor;
        nextMagnetZ = prevState.magnetZ + (0 - prevState.magnetZ) * smoothFactor;
        if (nextMagnetY < 0.01) nextMagnetY = 0;
        if (Math.abs(nextMagnetZ) < 0.01) nextMagnetZ = 0;
      } else if (typeof input.targetMagnetY === 'number') {
        const clampedY = Math.max(0, Math.min(2.5, input.targetMagnetY));
        nextMagnetY = prevState.magnetY + (clampedY - prevState.magnetY) * smoothFactor;
      }
    } else if (nextIsMagnetLifted && !input.isRunning) {
      if (typeof input.targetMagnetY === 'number') {
        let clampedY = Math.max(0, Math.min(2.5, input.targetMagnetY));
        if (clampedY < SNAP_TABLE_Y_THRESHOLD) clampedY = 0;
        nextMagnetY = prevState.magnetY + (clampedY - prevState.magnetY) * smoothFactor;
      }
      if (typeof input.targetMagnetZ === 'number') {
        let clampedZ = Math.max(-1.8, Math.min(1.8, input.targetMagnetZ));
        if (Math.abs(clampedZ) < SNAP_TABLE_Z_THRESHOLD && nextMagnetY < 0.35) clampedZ = 0;
        nextMagnetZ = prevState.magnetZ + (clampedZ - prevState.magnetZ) * smoothFactor;
      }
      nextIsMagnetLifted = nextMagnetY > 0.04 || Math.abs(nextMagnetZ) > 0.04;
    }

    // Xử lý góc quay nam châm trên trụ thoi (máy phát điện xoay chiều AC hoặc quay bằng tay)
    if (nextIsRotatingAC) {
      // 1 vòng = 360 độ. Tốc độ góc (độ/s) = (RPM * 360) / 60 = RPM * 6
      const rotSpeedDegPerSec = nextAcRpm * 6;
      nextMagnetAngularVelocity = (nextAcRpm * 2 * Math.PI) / 60;
      nextMagnetAngleDeg = (nextMagnetAngleDeg + rotSpeedDegPerSec * dt) % 360;
    } else if (input.isDraggingMagnetRotate && typeof input.targetMagnetAngleDeg === 'number') {
      const targetDeg = ((input.targetMagnetAngleDeg % 360) + 360) % 360;
      nextMagnetAngularVelocity = ((targetDeg - nextMagnetAngleDeg) * (Math.PI / 180)) / dt;
      nextMagnetAngleDeg = targetDeg;
    } else if (typeof input.targetMagnetAngleDeg === 'number') {
      const targetDeg = ((input.targetMagnetAngleDeg % 360) + 360) % 360;
      nextMagnetAngleDeg = targetDeg;
    }

    // Vận tốc tiến lại gần tương đối 3D giữa nam châm và cuộn dây
    const prevDist = Math.sqrt(
      Math.pow(prevState.coilX - prevState.magnetX, 2) +
      Math.pow((prevState.coilY ?? 0) - (prevState.magnetY ?? 0), 2) +
      Math.pow((prevState.coilZ ?? 0) - (prevState.magnetZ ?? 0), 2)
    );
    const nextDist = Math.sqrt(
      Math.pow(nextCoilX - nextMagnetX, 2) +
      Math.pow(nextCoilY - nextMagnetY, 2) +
      Math.pow(nextCoilZ - nextMagnetZ, 2)
    );
    nextVelocity = (prevDist - nextDist) / dt;
    if (Math.abs(nextVelocity) < 1e-3) {
      nextVelocity = 0;
    }

    nextPrimaryCurrent = 0;
    nextDIpDt = 0;
  } else {
    // Thí nghiệm 2: Nam châm điện đóng/ngắt mạch RL sơ cấp (và có thể dời vị trí trên bàn)
    if (
      input.isDraggingElectromagnet &&
      typeof input.targetElectromagnetX === 'number'
    ) {
      const clampedEm = clampMagnetX(input.targetElectromagnetX, nextCoilX);
      nextEmX = prevState.electromagnetX + (clampedEm - prevState.electromagnetX) * smoothFactor;
    }

    const prevDist = Math.abs(prevState.coilX - prevState.electromagnetX);
    const nextDist = Math.abs(nextCoilX - nextEmX);
    nextVelocity = (prevDist - nextDist) / dt;
    if (Math.abs(nextVelocity) < 1e-3) {
      nextVelocity = 0;
    }

    const iFinal = params.switchClosed
      ? Math.max(0, params.primaryVoltage) / PRIMARY_RESISTANCE
      : 0;

    if (params.switchClosed) {
      const alpha = 1 - Math.exp(-dt / TAU_PRIMARY_ON);
      nextPrimaryCurrent =
        prevState.primaryCurrent + (iFinal - prevState.primaryCurrent) * alpha;
      nextDIpDt = (nextPrimaryCurrent - prevState.primaryCurrent) / dt;
      if (Math.abs(iFinal - nextPrimaryCurrent) < 1e-4) {
        nextPrimaryCurrent = iFinal;
        nextDIpDt = 0;
      }
    } else {
      const decay = Math.exp(-dt / TAU_PRIMARY_OFF);
      nextPrimaryCurrent = prevState.primaryCurrent * decay;
      nextDIpDt = (nextPrimaryCurrent - prevState.primaryCurrent) / dt;
      if (nextPrimaryCurrent < 1e-4) {
        nextPrimaryCurrent = 0;
        nextDIpDt = 0;
      }
    }
  }

  const currentFluxPerTurn = computeCurrentFluxPerTurn(
    {
      magnetX: nextMagnetX,
      magnetY: nextMagnetY,
      magnetZ: nextMagnetZ,
      coilX: nextCoilX,
      coilY: nextCoilY,
      coilZ: nextCoilZ,
      magnetAngleDeg: nextMagnetAngleDeg,
      electromagnetX: nextEmX,
      primaryCurrent: nextPrimaryCurrent,
    },
    params
  );

  const rawDPhiDt = (currentFluxPerTurn - prevState.fluxPerTurn) / dt;
  const dPhiDt = Math.abs(rawDPhiDt) < EPSILON_FLUX_RATE ? 0 : rawDPhiDt;

  const rawDAbsPhiDt =
    (Math.abs(currentFluxPerTurn) - Math.abs(prevState.fluxPerTurn)) / dt;
  const dAbsPhiDt =
    Math.abs(rawDAbsPhiDt) < EPSILON_FLUX_RATE ? 0 : rawDAbsPhiDt;

  const emf = dPhiDt === 0 ? 0 : -params.coilTurnsN * dPhiDt;

  let secondaryCurrent = 0;
  const rTotal = Math.max(0.5, params.totalResistance);
  if (params.secondaryCircuitMode === 'rl') {
    const lSec = Math.max(0.02, params.secondaryInductance);
    const tauSec = lSec / rTotal;
    const iSteady = emf / rTotal;
    const alphaSec = 1 - Math.exp(-dt / tauSec);
    secondaryCurrent =
      prevState.secondaryCurrent + (iSteady - prevState.secondaryCurrent) * alphaSec;
  } else {
    secondaryCurrent = emf / rTotal;
  }

  if (Math.abs(secondaryCurrent) < EPSILON_CURRENT) {
    secondaryCurrent = 0;
  }

  // Hai đèn LED mắc song song ngược cực:
  // - Khi dòng điện theo chiều thuận dương I_s > 0: Đèn ĐỎ phân cực thuận và phát sáng
  // - Khi dòng điện theo chiều âm I_s < 0: Đèn XANH phân cực thuận và phát sáng
  // Khi quay AC: 2 đèn chớp luân phiên nhịp nhàng theo chu kỳ xoay chiều
  const absCurrent = Math.abs(secondaryCurrent);
  let redLedBrightness = 0;
  let greenLedBrightness = 0;
  if (absCurrent > EPSILON_CURRENT) {
    if (nextIsRotatingAC || (input.isDraggingMagnetRotate ?? false)) {
      if (secondaryCurrent > 0) {
        redLedBrightness = Math.min(1, Math.max(0.25, absCurrent * 1.5));
      } else {
        greenLedBrightness = Math.min(1, Math.max(0.25, absCurrent * 1.5));
      }
    } else {
      if (dAbsPhiDt > 0) {
        redLedBrightness = Math.min(1, Math.max(0.22, absCurrent * 1.45));
      } else if (dAbsPhiDt < 0) {
        greenLedBrightness = Math.min(1, Math.max(0.22, absCurrent * 1.45));
      } else if (secondaryCurrent > 0) {
        redLedBrightness = Math.min(1, Math.max(0.22, absCurrent * 1.45));
      } else {
        greenLedBrightness = Math.min(1, Math.max(0.22, absCurrent * 1.45));
      }
    }
  }

  const rawTargetAngle =
    params.wiringSign * GALVANOMETER_SENSITIVITY_K * secondaryCurrent;
  const needleTargetAngleDeg = Math.max(
    -GALVANOMETER_MAX_DEG,
    Math.min(GALVANOMETER_MAX_DEG, rawTargetAngle)
  );

  const omega0 = 18.0;
  const zeta = 0.88;
  const springAccel =
    omega0 * omega0 * (needleTargetAngleDeg - prevState.needleAngleDeg) -
    2 * zeta * omega0 * prevState.needleAngularVelocity;

  let nextNeedleVel = prevState.needleAngularVelocity + springAccel * dt;
  let nextNeedleAngle = prevState.needleAngleDeg + nextNeedleVel * dt;

  if (
    needleTargetAngleDeg === 0 &&
    Math.abs(nextNeedleAngle) < 0.04 &&
    Math.abs(nextNeedleVel) < 0.15
  ) {
    nextNeedleAngle = 0;
    nextNeedleVel = 0;
  }

  nextNeedleAngle = Math.max(
    -GALVANOMETER_MAX_DEG,
    Math.min(GALVANOMETER_MAX_DEG, nextNeedleAngle)
  );

  let nextParticlePhase = prevState.particlePhase;
  if (secondaryCurrent !== 0) {
    const particleSpeed = Math.max(-3.5, Math.min(3.5, secondaryCurrent * 0.9));
    nextParticlePhase = (prevState.particlePhase + particleSpeed * dt) % 1;
    if (nextParticlePhase < 0) nextParticlePhase += 1;
  }

  return {
    simTime: prevState.simTime + dt,
    magnetX: nextMagnetX,
    magnetY: nextMagnetY,
    magnetZ: nextMagnetZ,
    isMagnetLifted: nextIsMagnetLifted,
    magnetAngleDeg: nextMagnetAngleDeg,
    magnetAngularVelocity: nextMagnetAngularVelocity,
    isRotatingAC: nextIsRotatingAC,
    acRpm: nextAcRpm,
    coilX: nextCoilX,
    coilY: nextCoilY,
    coilZ: nextCoilZ,
    isCoilLifted: nextIsCoilLifted,
    electromagnetX: nextEmX,
    magnetVelocity: nextVelocity,
    autoPhase: nextAutoPhase,
    fluxPerTurn: currentFluxPerTurn,
    previousFluxPerTurn: prevState.fluxPerTurn,
    fluxLinkage: params.coilTurnsN * currentFluxPerTurn,
    dPhiDt,
    emf,
    secondaryCurrent,
    primaryCurrent: nextPrimaryCurrent,
    dIpDt: nextDIpDt,
    needleTargetAngleDeg,
    needleAngleDeg: nextNeedleAngle,
    needleAngularVelocity: nextNeedleVel,
    particlePhase: nextParticlePhase,
    dAbsPhiDt,
    redLedBrightness,
    greenLedBrightness,
  };
}

export interface PhysicalInterpretation {
  relativeDistanceLabel: 'Gần cuộn dây' | 'Trung bình' | 'Xa cuộn dây';
  motionStatusLabel: string;
  fluxMagnitudeTrend: 'Đang tăng' | 'Đang giảm' | 'Không đổi';
  algebraicFluxTrend: 'Tăng (+)' | 'Giảm (−)' | 'Không đổi (0)';
  hasInducedCurrent: boolean;
  currentDirectionLabel: string;
  needleDirectionLabel: 'Lệch phải (+)' | 'Đứng ở số 0' | 'Lệch trái (−)';
  ledStatusLabel:
    | 'Đèn ĐỎ sáng (Từ thông Φ tăng)'
    | 'Đèn XANH sáng (Từ thông Φ giảm)'
    | 'Cả 2 đèn LED đều tắt (dΦ/dt = 0)';
  lenzCoilFacePole: 'Cực Bắc cảm ứng (N)' | 'Cực Nam cảm ứng (S)' | 'Không phân cực';
  lenzForceAction:
    | 'Đẩy cản lại chuyển động lại gần'
    | 'Hút cản lại chuyển động ra xa'
    | 'Chống lại sự tăng từ thông'
    | 'Chống lại sự giảm từ thông'
    | 'Không có lực từ cảm ứng';
  shortSummaryBanner: string;
  detailedExplanation: string;
}

export function interpretPhysicsState(
  state: PhysicsState,
  params: SimulationParams
): PhysicalInterpretation {
  const sourceX =
    params.experiment === 'permanent_magnet'
      ? state.magnetX
      : state.electromagnetX;
  const dy =
    (state.coilY ?? 0) -
    (params.experiment === 'permanent_magnet' ? (state.magnetY ?? 0) : 0);
  const dz =
    (state.coilZ ?? 0) -
    (params.experiment === 'permanent_magnet' ? (state.magnetZ ?? 0) : 0);
  const dist = Math.sqrt(
    Math.pow(state.coilX - sourceX, 2) + dy * dy + dz * dz
  );
  const relativeDistanceLabel: PhysicalInterpretation['relativeDistanceLabel'] =
    dist < 1.85 ? 'Gần cuộn dây' : dist < 2.95 ? 'Trung bình' : 'Xa cuộn dây';

  const isFluxChanging = Math.abs(state.dPhiDt) > EPSILON_FLUX_RATE;
  const absFluxNow = Math.abs(state.fluxPerTurn);
  const absFluxPrev = Math.abs(state.previousFluxPerTurn);

  let fluxMagnitudeTrend: PhysicalInterpretation['fluxMagnitudeTrend'] = 'Không đổi';
  if (isFluxChanging) {
    fluxMagnitudeTrend = absFluxNow >= absFluxPrev ? 'Đang tăng' : 'Đang giảm';
  }

  let algebraicFluxTrend: PhysicalInterpretation['algebraicFluxTrend'] =
    'Không đổi (0)';
  if (state.dPhiDt > EPSILON_FLUX_RATE) {
    algebraicFluxTrend = 'Tăng (+)';
  } else if (state.dPhiDt < -EPSILON_FLUX_RATE) {
    algebraicFluxTrend = 'Giảm (−)';
  }

  const hasInducedCurrent = Math.abs(state.secondaryCurrent) > EPSILON_CURRENT;

  let ledStatusLabel: PhysicalInterpretation['ledStatusLabel'] =
    'Cả 2 đèn LED đều tắt (dΦ/dt = 0)';
  if (state.redLedBrightness > 0.01) {
    ledStatusLabel = 'Đèn ĐỎ sáng (Từ thông Φ tăng)';
  } else if (state.greenLedBrightness > 0.01) {
    ledStatusLabel = 'Đèn XANH sáng (Từ thông Φ giảm)';
  }

  let lenzCoilFacePole: PhysicalInterpretation['lenzCoilFacePole'] = 'Không phân cực';
  if (hasInducedCurrent) {
    lenzCoilFacePole =
      state.secondaryCurrent < 0 ? 'Cực Bắc cảm ứng (N)' : 'Cực Nam cảm ứng (S)';
  }

  let currentDirectionLabel = 'Không có dòng điện cảm ứng (I = 0)';
  if (hasInducedCurrent) {
    currentDirectionLabel =
      state.secondaryCurrent > 0
        ? 'Chiều dương quy ước (+): Thuận chiều kim đồng hồ (nhìn từ phía nam châm)'
        : 'Chiều âm quy ước (−): Ngược chiều kim đồng hồ (nhìn từ phía nam châm)';
  }

  let needleDirectionLabel: PhysicalInterpretation['needleDirectionLabel'] =
    'Đứng ở số 0';
  if (Math.abs(state.needleAngleDeg) >= 0.5) {
    needleDirectionLabel =
      state.needleAngleDeg > 0 ? 'Lệch phải (+)' : 'Lệch trái (−)';
  }

  let motionStatusLabel = '';
  let lenzForceAction: PhysicalInterpretation['lenzForceAction'] =
    'Không có lực từ cảm ứng';
  let shortSummaryBanner = '';
  let detailedExplanation = '';

  if (params.experiment === 'permanent_magnet') {
    const poleName = params.magnetPolarity === 1 ? 'Cực Bắc (N)' : 'Cực Nam (S)';
    if (state.magnetVelocity > 0.015) {
      motionStatusLabel = `${poleName} và cuộn dây đang tiến lại gần nhau`;
      lenzForceAction = 'Đẩy cản lại chuyển động lại gần';
      shortSummaryBanner = `${poleName} tiến lại gần · Từ thông Φ tăng · Đèn ĐỎ sáng`;
      detailedExplanation = `Khi đưa ${poleName} tiến lại gần cuộn dây, số đường sức từ xuyên qua tiết diện cuộn dây tăng lên (Φ tăng). Dòng điện cảm ứng xuất hiện làm Đèn LED ĐỎ phát sáng và kim điện kế ${needleDirectionLabel.toLowerCase()}.`;
    } else if (state.magnetVelocity < -0.015) {
      motionStatusLabel = `${poleName} và cuộn dây đang rời xa nhau`;
      lenzForceAction = 'Hút cản lại chuyển động ra xa';
      shortSummaryBanner = `${poleName} lùi ra xa · Từ thông Φ giảm · Đèn XANH sáng`;
      detailedExplanation = `Khi kéo ${poleName} lùi ra xa cuộn dây, độ lớn từ thông qua cuộn dây giảm xuống (Φ giảm). Dòng điện cảm ứng đổi chiều làm Đèn LED XANH phát sáng và kim điện kế ${needleDirectionLabel.toLowerCase()}.`;
    } else {
      motionStatusLabel = 'Nam châm và cuộn dây đang đứng yên tương đối';
      lenzForceAction = 'Không có lực từ cảm ứng';
      shortSummaryBanner =
        'Đứng yên · Từ thông không biến thiên (dΦ/dt = 0) · 2 LED tắt & Kim về 0';
      detailedExplanation = `Khoảng cách tương đối giữa nam châm và cuộn dây không đổi nên từ thông qua cuộn dây giữ nguyên (dΦ/dt = 0). Không có dòng điện cảm ứng, cả 2 đèn LED Đỏ – Xanh đều tắt và kim điện kế chỉ vạch 0.`;
    }
  } else {
    if (Math.abs(state.magnetVelocity) > 0.015 && state.primaryCurrent > 0.05) {
      motionStatusLabel =
        state.magnetVelocity > 0
          ? 'Đang dịch chuyển nam châm điện và cuộn dây lại gần nhau'
          : 'Đang dịch chuyển nam châm điện và cuộn dây ra xa nhau';
      lenzForceAction =
        state.magnetVelocity > 0
          ? 'Chống lại sự tăng từ thông'
          : 'Chống lại sự giảm từ thông';
      shortSummaryBanner = `${motionStatusLabel} · ${state.magnetVelocity > 0 ? 'Đèn ĐỎ sáng' : 'Đèn XANH sáng'}`;
      detailedExplanation = `Do nam châm điện đang có dòng điện chạy qua và khoảng cách tương đối tới cuộn dây thứ cấp thay đổi, từ thông xuyên qua cuộn thứ cấp biến thiên làm ${ledStatusLabel.toLowerCase()} và kim điện kế ${needleDirectionLabel.toLowerCase()}.`;
    } else if (params.switchClosed) {
      if (Math.abs(state.dIpDt) > 0.01) {
        motionStatusLabel = 'Vừa đóng khóa K · Dòng sơ cấp đang tăng';
        lenzForceAction = 'Chống lại sự tăng từ thông';
        shortSummaryBanner =
          'Đóng công tắc · Từ thông tăng · Đèn ĐỎ sáng & Kim lệch thoáng qua';
        detailedExplanation = `Khi vừa đóng công tắc khóa K, dòng điện trong cuộn sơ cấp tăng dần làm từ thông qua cuộn dây thứ cấp tăng lên. Dòng điện cảm ứng chạy theo chiều làm Đèn LED ĐỎ phát sáng và kim điện kế ${needleDirectionLabel.toLowerCase()}.`;
      } else {
        motionStatusLabel = 'Khóa K đang đóng · Dòng sơ cấp đã ổn định';
        lenzForceAction = 'Không có lực từ cảm ứng';
        shortSummaryBanner =
          'Dòng điện sơ cấp ổn định · Từ thông không đổi · 2 LED tắt & Kim về 0';
        detailedExplanation = `Mặc dù khóa K vẫn đóng và nam châm điện đang có từ trường mạnh, cường độ dòng điện sơ cấp đã ổn định (dIp/dt = 0). Từ thông không biến thiên nên cả 2 đèn LED đều tắt và kim điện kế trở về vạch 0.`;
      }
    } else {
      if (Math.abs(state.dIpDt) > 0.01) {
        motionStatusLabel = 'Vừa ngắt khóa K · Dòng sơ cấp đang giảm về 0';
        lenzForceAction = 'Chống lại sự giảm từ thông';
        shortSummaryBanner =
          'Ngắt công tắc · Từ thông giảm · Đèn XANH sáng & Dòng đảo chiều';
        detailedExplanation = `Khi vừa ngắt công tắc khóa K, dòng điện sơ cấp giảm nhanh về 0 làm từ thông qua cuộn thứ cấp giảm xuống. Dòng điện cảm ứng đổi chiều làm Đèn LED XANH phát sáng và kim điện kế lệch sang phía ngược lại (${needleDirectionLabel.toLowerCase()}).`;
      } else {
        motionStatusLabel = 'Khóa K đang mở · Mạch sơ cấp ngắt (Ip = 0)';
        lenzForceAction = 'Không có lực từ cảm ứng';
        shortSummaryBanner = 'Công tắc mở · Từ thông bằng 0 · 2 LED tắt & Kim ở vạch 0';
        detailedExplanation = `Công tắc mạch sơ cấp đang ngắt hoàn toàn, dòng điện sơ cấp bằng 0 và từ thông qua cuộn thứ cấp ổn định ở mức 0. Không có dòng điện cảm ứng, cả 2 đèn LED đều tắt.`;
      }
    }
  }

  return {
    relativeDistanceLabel,
    motionStatusLabel,
    fluxMagnitudeTrend,
    algebraicFluxTrend,
    hasInducedCurrent,
    currentDirectionLabel,
    needleDirectionLabel,
    ledStatusLabel,
    lenzCoilFacePole,
    lenzForceAction,
    shortSummaryBanner,
    detailedExplanation,
  };
}
