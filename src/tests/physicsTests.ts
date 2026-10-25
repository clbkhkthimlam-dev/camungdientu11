/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bộ kiểm thử tự động 12 tiêu chí vật lí bắt buộc theo đặc tả EM_INDUCTION_3D_LAB_SPEC_V2 (Mục 10).
 */

import {
  createDefaultParams,
  createInitialPhysicsState,
  FIXED_DT,
  stepPhysics,
  synchronizeFluxState,
} from '../physics/emPhysics';

export interface PhysicsTestResult {
  id: number;
  title: string;
  passed: boolean;
  details: string;
}

export function runAllPhysicsTests(): PhysicsTestResult[] {
  const results: PhysicsTestResult[] = [];

  // 1. Đứng yên: vị trí và từ trường không đổi => suất điện động bằng 0, kim về 0
  {
    const params = createDefaultParams();
    let state = createInitialPhysicsState(params);
    state.magnetX = -1.5; // Đặt rất gần cuộn dây nhưng đứng yên
    state = synchronizeFluxState(state, params);
    for (let i = 0; i < 60; i++) {
      state = stepPhysics(state, params, {
        dt: FIXED_DT,
        isRunning: false,
        isDraggingMagnet: false,
      });
    }
    const passed = state.dPhiDt === 0 && state.emf === 0 && Math.abs(state.needleAngleDeg) < 1e-3;
    results.push({
      id: 1,
      title: '1. Trạng thái đứng yên (dΦ/dt = 0 ⇒ E = 0, kim ở 0)',
      passed,
      details: `Tại x = -1.50 (gần cuộn dây, v = 0): dΦ/dt = ${state.dPhiDt.toFixed(6)}, E = ${state.emf.toFixed(4)}, góc kim = ${state.needleAngleDeg.toFixed(2)}°`,
    });
  }

  // 2. Tiến gần: vị trí đổi lại gần => từ thông biến thiên => suất điện động khác 0
  let emfApproachN = 0;
  {
    const params = createDefaultParams();
    let state = createInitialPhysicsState(params);
    state.magnetX = -2.5;
    state = synchronizeFluxState(state, params);
    for (let i = 0; i < 15; i++) {
      state = stepPhysics(state, params, {
        dt: FIXED_DT,
        isRunning: false,
        isDraggingMagnet: true,
        targetMagnetX: -1.8,
      });
    }
    emfApproachN = state.emf;
    const passed = state.dPhiDt > 0 && state.emf < 0 && Math.abs(state.emf) > 0.05;
    results.push({
      id: 2,
      title: '2. Đưa cực N tiến lại gần cuộn dây (Φ tăng ⇒ E ≠ 0)',
      passed,
      details: `dΦ/dt = +${state.dPhiDt.toExponential(3)} > 0 ⇒ E = ${state.emf.toFixed(4)} < 0`,
    });
  }

  // 3. Ra xa: đảo chiều chuyển động trong cùng cấu hình => dấu suất điện động đảo
  {
    const params = createDefaultParams();
    let state = createInitialPhysicsState(params);
    state.magnetX = -1.8;
    state = synchronizeFluxState(state, params);
    for (let i = 0; i < 15; i++) {
      state = stepPhysics(state, params, {
        dt: FIXED_DT,
        isRunning: false,
        isDraggingMagnet: true,
        targetMagnetX: -2.5,
      });
    }
    const emfRecedeN = state.emf;
    const passed = emfApproachN < 0 && emfRecedeN > 0 && Math.sign(emfApproachN) === -Math.sign(emfRecedeN);
    results.push({
      id: 3,
      title: '3. Kéo cực N ra xa cuộn dây (đảo chiều chuyển động ⇒ đảo dấu E)',
      passed,
      details: `E(tiến gần) = ${emfApproachN.toFixed(4)} vs E(ra xa) = +${emfRecedeN.toFixed(4)}`,
    });
  }

  // 4. Đảo cực: giữ nguyên quỹ đạo/tốc độ tiến gần => dấu từ thông và suất điện động đảo
  {
    const paramsS = { ...createDefaultParams(), magnetPolarity: -1 as const };
    let state = createInitialPhysicsState(paramsS);
    state.magnetX = -2.5;
    state = synchronizeFluxState(state, paramsS);
    for (let i = 0; i < 15; i++) {
      state = stepPhysics(state, paramsS, {
        dt: FIXED_DT,
        isRunning: false,
        isDraggingMagnet: true,
        targetMagnetX: -1.8,
      });
    }
    const emfApproachS = state.emf;
    const passed = state.fluxPerTurn < 0 && emfApproachN < 0 && emfApproachS > 0;
    results.push({
      id: 4,
      title: '4. Đảo cực nam châm S hướng về cuộn dây (cùng chuyển động ⇒ đảo dấu Φ và E)',
      passed,
      details: `E(cực N tiến gần) = ${emfApproachN.toFixed(4)} vs E(cực S tiến gần) = +${emfApproachS.toFixed(4)}`,
    });
  }

  // 5. Tăng tốc độ: trong cùng vùng và cùng dạng quỹ đạo, tốc độ tăng => |E| tăng
  {
    const paramsSlow = { ...createDefaultParams(), autoSpeedMultiplier: 0.5 };
    const paramsFast = { ...createDefaultParams(), autoSpeedMultiplier: 2.0 };
    let stateSlow = createInitialPhysicsState(paramsSlow);
    let stateFast = createInitialPhysicsState(paramsFast);
    stateSlow = stepPhysics(stateSlow, paramsSlow, {
      dt: FIXED_DT,
      isRunning: true,
      isDraggingMagnet: false,
    });
    stateFast = stepPhysics(stateFast, paramsFast, {
      dt: FIXED_DT,
      isRunning: true,
      isDraggingMagnet: false,
    });
    const passed = Math.abs(stateFast.emf) > Math.abs(stateSlow.emf) * 3.5;
    results.push({
      id: 5,
      title: '5. Tăng tốc độ di chuyển (|dΦ/dt| tăng ⇒ độ lớn |E| tăng)',
      passed,
      details: `|E(nhanh 2.0x)| = ${Math.abs(stateFast.emf).toFixed(4)} > |E(chậm 0.5x)| = ${Math.abs(stateSlow.emf).toFixed(4)}`,
    });
  }

  // 6. Xa cuộn dây: cùng bước dịch chuyển Δx trong thời gian Δt, ở xa có |E| nhỏ hơn ở gần
  {
    const params = createDefaultParams();
    let stateNear = createInitialPhysicsState(params);
    stateNear.magnetX = -1.45;
    stateNear = synchronizeFluxState(stateNear, params);
    stateNear = stepPhysics(stateNear, params, {
      dt: FIXED_DT,
      isRunning: false,
      isDraggingMagnet: true,
      targetMagnetX: -1.25,
    });

    let stateFar = createInitialPhysicsState(params);
    stateFar.magnetX = -3.95;
    stateFar = synchronizeFluxState(stateFar, params);
    stateFar = stepPhysics(stateFar, params, {
      dt: FIXED_DT,
      isRunning: false,
      isDraggingMagnet: true,
      targetMagnetX: -3.75,
    });

    const passed = Math.abs(stateNear.emf) > Math.abs(stateFar.emf) * 2.5;
    results.push({
      id: 6,
      title: '6. Vùng xa cuộn dây có độ biến thiên từ thông nhỏ hơn vùng gần',
      passed,
      details: `|E(vùng gần)| = ${Math.abs(stateNear.emf).toFixed(4)} > |E(vùng xa)| = ${Math.abs(stateFar.emf).toFixed(4)}`,
    });
  }

  // 7. Đóng nam châm điện: dIp/dt > 0 => suất điện động thứ cấp xuất hiện trong quá độ
  let emfSwitchOn = 0;
  let stateAfterStabilize = createInitialPhysicsState();
  {
    const paramsEM = {
      ...createDefaultParams(),
      experiment: 'electromagnet' as const,
      switchClosed: true,
    };
    let state = createInitialPhysicsState(paramsEM);
    for (let i = 0; i < 12; i++) {
      state = stepPhysics(state, paramsEM, {
        dt: FIXED_DT,
        isRunning: true,
        isDraggingMagnet: false,
      });
    }
    emfSwitchOn = state.emf;
    const passed = state.dIpDt > 0 && state.emf < 0 && Math.abs(state.emf) > 0.1;
    results.push({
      id: 7,
      title: '7. Đóng công tắc nam châm điện (dIp/dt > 0 ⇒ xuất hiện E thứ cấp quá độ)',
      passed,
      details: `dIp/dt = +${state.dIpDt.toFixed(3)}, E_s = ${state.emf.toFixed(4)}`,
    });

    // Chạy tiếp cho đến khi dòng sơ cấp ổn định (~3 giây mô phỏng)
    for (let i = 0; i < 360; i++) {
      state = stepPhysics(state, paramsEM, {
        dt: FIXED_DT,
        isRunning: true,
        isDraggingMagnet: false,
      });
    }
    stateAfterStabilize = state;
  }

  // 8. Dòng sơ cấp ổn định: dIp/dt ≈ 0 => suất điện động thứ cấp bằng 0, kim về 0
  {
    const passed =
      stateAfterStabilize.primaryCurrent > 2.9 &&
      Math.abs(stateAfterStabilize.dIpDt) < 1e-4 &&
      stateAfterStabilize.emf === 0 &&
      Math.abs(stateAfterStabilize.needleAngleDeg) < 0.1;
    results.push({
      id: 8,
      title: '8. Dòng sơ cấp ổn định khi giữ công tắc đóng (dIp/dt = 0 ⇒ E_s = 0, kim về 0)',
      passed,
      details: `Ip = ${stateAfterStabilize.primaryCurrent.toFixed(2)}, dIp/dt = ${stateAfterStabilize.dIpDt.toFixed(5)}, E_s = ${stateAfterStabilize.emf.toFixed(4)}, kim = ${stateAfterStabilize.needleAngleDeg.toFixed(2)}°`,
    });
  }

  // 9. Ngắt nam châm điện: dIp/dt < 0 => suất điện động thứ cấp đảo dấu so với lúc đóng
  {
    const paramsOff = {
      ...createDefaultParams(),
      experiment: 'electromagnet' as const,
      switchClosed: false,
    };
    let state = stateAfterStabilize;
    for (let i = 0; i < 12; i++) {
      state = stepPhysics(state, paramsOff, {
        dt: FIXED_DT,
        isRunning: true,
        isDraggingMagnet: false,
      });
    }
    const emfSwitchOff = state.emf;
    const passed =
      state.dIpDt < 0 &&
      emfSwitchOff > 0 &&
      Math.sign(emfSwitchOff) === -Math.sign(emfSwitchOn);
    results.push({
      id: 9,
      title: '9. Ngắt công tắc nam châm điện (dIp/dt < 0 ⇒ E_s đảo dấu so với lúc đóng)',
      passed,
      details: `E_s(đóng) = ${emfSwitchOn.toFixed(4)} vs E_s(ngắt) = +${emfSwitchOff.toFixed(4)}`,
    });
  }

  // 10. Đảo dây điện kế: chỉ dấu hiển thị của kim đổi, suất điện động cuộn dây không đổi
  {
    const paramsNormal = { ...createDefaultParams(), wiringSign: 1 as const };
    const paramsReversed = { ...createDefaultParams(), wiringSign: -1 as const };
    let s1 = createInitialPhysicsState(paramsNormal);
    let s2 = createInitialPhysicsState(paramsReversed);
    s1 = stepPhysics(s1, paramsNormal, {
      dt: FIXED_DT,
      isRunning: true,
      isDraggingMagnet: false,
    });
    s2 = stepPhysics(s2, paramsReversed, {
      dt: FIXED_DT,
      isRunning: true,
      isDraggingMagnet: false,
    });
    const passed =
      s1.emf === s2.emf &&
      s1.secondaryCurrent === s2.secondaryCurrent &&
      Math.abs(s1.needleTargetAngleDeg + s2.needleTargetAngleDeg) < 1e-6 &&
      s1.needleTargetAngleDeg !== 0;
    results.push({
      id: 10,
      title: '10. Đảo hai đầu dây điện kế (E cuộn dây giữ nguyên, chiều lệch kim đảo ngược)',
      passed,
      details: `E1 = E2 = ${s1.emf.toFixed(4)}, Góc kim chuẩn = ${s1.needleTargetAngleDeg.toFixed(2)}° vs Đảo dây = ${s2.needleTargetAngleDeg.toFixed(2)}°`,
    });
  }

  // 11. Pause/resume/reset: đồng bộ Phi_previous không phát sinh đỉnh suất điện động giả
  {
    const params = createDefaultParams();
    let state = createInitialPhysicsState(params);
    state.magnetX = -1.6;
    state = synchronizeFluxState(state, params);
    state = stepPhysics(state, params, {
      dt: FIXED_DT,
      isRunning: false,
      isDraggingMagnet: false,
    });
    const passed = state.emf === 0 && state.dPhiDt === 0;
    results.push({
      id: 11,
      title: '11. Đồng bộ trạng thái khi Tạm dừng / Tiếp tục / Đặt lại (không có xung E giả)',
      passed,
      details: `Sau đồng bộ tại x = -1.60: dΦ/dt = ${state.dPhiDt}, E = ${state.emf}`,
    });
  }

  // 12. Số học an toàn: không phát sinh NaN hoặc Infinity ngay cả khi dt = 0 hoặc đầu vào bất thường
  {
    const params = createDefaultParams();
    let state = createInitialPhysicsState(params);
    state = stepPhysics(state, params, {
      dt: 0,
      isRunning: true,
      isDraggingMagnet: true,
      targetMagnetX: Number.NaN,
    });
    const allFinite =
      Number.isFinite(state.magnetX) &&
      Number.isFinite(state.fluxPerTurn) &&
      Number.isFinite(state.dPhiDt) &&
      Number.isFinite(state.emf) &&
      Number.isFinite(state.secondaryCurrent) &&
      Number.isFinite(state.needleAngleDeg);
    results.push({
      id: 12,
      title: '12. An toàn số học (Không chia cho Δt = 0, mọi đại lượng hữu hạn, không NaN/Infinity)',
      passed: allFinite,
      details: `Kiểm tra biên Δt = 0 & NaN target: finite = ${allFinite}`,
    });
  }

  return results;
}
