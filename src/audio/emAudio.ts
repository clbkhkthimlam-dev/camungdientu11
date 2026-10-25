/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bộ tổng hợp âm thanh thủ tục (Procedural Web Audio API Engine)
 * - Không tải file ngoài, 0 phụ thuộc, phản hồi tức thì với độ trễ < 5ms.
 * - Âm thanh dòng điện cảm ứng, tiếng gõ snap bệ bàn, tiếng đóng ngắt dao cầu, tiếng sáng LED, và âm thanh game thử thách.
 */

class EMAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Tiếng kéo nam châm riêng biệt (trầm đục, kim loại nặng trượt trên ray đồng)
  private magnetDragOsc: OscillatorNode | null = null;
  private magnetDragGain: GainNode | null = null;
  private magnetDragFilter: BiquadFilterNode | null = null;

  // Tiếng kéo cuộn dây riêng biệt (thanh nhẹ, lướt êm, tiếng dây đồng rung)
  private coilDragOsc: OscillatorNode | null = null;
  private coilDragGain: GainNode | null = null;
  private coilDragFilter: BiquadFilterNode | null = null;

  // Tiếng máy phát điện AC quay rotor
  private rotorAcOsc: OscillatorNode | null = null;
  private rotorAcGain: GainNode | null = null;
  private rotorAcFilter: BiquadFilterNode | null = null;

  private isHumming: boolean = false;

  private initContextIfNeeded(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Thiết lập các mạch tổng hợp âm thanh chuyên biệt
      this.setupHumSynthesizer();
      this.setupMotionSynthesizers();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private setupHumSynthesizer(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      this.humOsc = this.ctx.createOscillator();
      this.humOsc.type = 'sawtooth';
      this.humOsc.frequency.setValueAtTime(90, this.ctx.currentTime);

      this.humFilter = this.ctx.createBiquadFilter();
      this.humFilter.type = 'lowpass';
      this.humFilter.frequency.setValueAtTime(260, this.ctx.currentTime);
      this.humFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      this.humGain = this.ctx.createGain();
      this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.humOsc.connect(this.humFilter);
      this.humFilter.connect(this.humGain);
      this.humGain.connect(this.masterGain);

      this.humOsc.start();
      this.isHumming = true;
    } catch {
      // Bỏ qua lỗi audio
    }
  }

  private setupMotionSynthesizers(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      // 1. Mạch âm thanh kéo nam châm (trầm, nặng, từ tính)
      this.magnetDragOsc = this.ctx.createOscillator();
      this.magnetDragOsc.type = 'triangle';
      this.magnetDragOsc.frequency.setValueAtTime(110, this.ctx.currentTime);

      this.magnetDragFilter = this.ctx.createBiquadFilter();
      this.magnetDragFilter.type = 'lowpass';
      this.magnetDragFilter.frequency.setValueAtTime(280, this.ctx.currentTime);
      this.magnetDragFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.magnetDragGain = this.ctx.createGain();
      this.magnetDragGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.magnetDragOsc.connect(this.magnetDragFilter);
      this.magnetDragFilter.connect(this.magnetDragGain);
      this.magnetDragGain.connect(this.masterGain);
      this.magnetDragOsc.start();

      // 2. Mạch âm thanh kéo cuộn dây (thanh hơn, tiếng trượt bệ ống nhựa/đồng)
      this.coilDragOsc = this.ctx.createOscillator();
      this.coilDragOsc.type = 'sine';
      this.coilDragOsc.frequency.setValueAtTime(360, this.ctx.currentTime);

      this.coilDragFilter = this.ctx.createBiquadFilter();
      this.coilDragFilter.type = 'bandpass';
      this.coilDragFilter.frequency.setValueAtTime(620, this.ctx.currentTime);
      this.coilDragFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.coilDragGain = this.ctx.createGain();
      this.coilDragGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.coilDragOsc.connect(this.coilDragFilter);
      this.coilDragFilter.connect(this.coilDragGain);
      this.coilDragGain.connect(this.masterGain);
      this.coilDragOsc.start();

      // 3. Mạch âm thanh quay nam châm phát điện AC (tiếng rotor mô tơ quay rù rù đều)
      this.rotorAcOsc = this.ctx.createOscillator();
      this.rotorAcOsc.type = 'sawtooth';
      this.rotorAcOsc.frequency.setValueAtTime(75, this.ctx.currentTime);

      this.rotorAcFilter = this.ctx.createBiquadFilter();
      this.rotorAcFilter.type = 'lowpass';
      this.rotorAcFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.rotorAcFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      this.rotorAcGain = this.ctx.createGain();
      this.rotorAcGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rotorAcOsc.connect(this.rotorAcFilter);
      this.rotorAcFilter.connect(this.rotorAcGain);
      this.rotorAcGain.connect(this.masterGain);
      this.rotorAcOsc.start();
    } catch {
      // Bỏ qua lỗi audio
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.65,
        this.ctx.currentTime,
        0.04
      );
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Cập nhật âm thanh ngân cảm ứng điện từ dựa trên cường độ dòng điện $i$ và vận tốc $v$
   */
  public updateInductionHum(current: number, velocity: number): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.humGain || !this.humOsc || !this.humFilter) return;

    const absI = Math.abs(current);
    const absV = Math.abs(velocity);
    const activity = Math.min(1, absI * 0.9 + absV * 0.35);

    const now = ctx.currentTime;
    if (activity > 0.015) {
      // Tần số thay đổi từ 85Hz đến 240Hz theo cường độ
      const targetFreq = 85 + activity * 140;
      const targetGain = Math.min(0.24, activity * 0.22);
      const targetCutoff = 180 + activity * 550;

      this.humOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.humFilter.frequency.setTargetAtTime(targetCutoff, now, 0.05);
      this.humGain.gain.setTargetAtTime(targetGain, now, 0.05);
    } else {
      this.humGain.gain.setTargetAtTime(0, now, 0.06);
    }
  }

  /**
   * Âm thanh kéo dịch chuyển riêng biệt cho NAM CHÂM (trầm ấm, nặng, tiếng kim loại trượt)
   */
  public updateMagnetMotionSound(speed: number, isDragging: boolean): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.magnetDragGain || !this.magnetDragOsc || !this.magnetDragFilter) return;

    const now = ctx.currentTime;
    const absSpeed = Math.min(2.5, Math.abs(speed));
    if (isDragging && absSpeed > 0.01) {
      const pitch = 95 + absSpeed * 45;
      const gain = Math.min(0.22, 0.04 + absSpeed * 0.12);
      const cutoff = 220 + absSpeed * 280;

      this.magnetDragOsc.frequency.setTargetAtTime(pitch, now, 0.04);
      this.magnetDragFilter.frequency.setTargetAtTime(cutoff, now, 0.04);
      this.magnetDragGain.gain.setTargetAtTime(gain, now, 0.04);
    } else {
      this.magnetDragGain.gain.setTargetAtTime(0, now, 0.06);
    }
  }

  /**
   * Âm thanh kéo dịch chuyển riêng biệt cho CUỘN DÂY (thanh nhẹ, lướt êm, tiếng rít nhẹ của lõi nhựa/đồng)
   */
  public updateCoilMotionSound(speed: number, isDragging: boolean): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.coilDragGain || !this.coilDragOsc || !this.coilDragFilter) return;

    const now = ctx.currentTime;
    const absSpeed = Math.min(2.5, Math.abs(speed));
    if (isDragging && absSpeed > 0.01) {
      const pitch = 320 + absSpeed * 120;
      const gain = Math.min(0.18, 0.03 + absSpeed * 0.09);
      const cutoff = 550 + absSpeed * 350;

      this.coilDragOsc.frequency.setTargetAtTime(pitch, now, 0.04);
      this.coilDragFilter.frequency.setTargetAtTime(cutoff, now, 0.04);
      this.coilDragGain.gain.setTargetAtTime(gain, now, 0.04);
    } else {
      this.coilDragGain.gain.setTargetAtTime(0, now, 0.06);
    }
  }

  /**
   * Âm thanh máy phát điện xoay chiều AC (khi quay nam châm trên trụ thoi)
   */
  public updateRotorAcSound(rpm: number, isRotating: boolean): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.rotorAcGain || !this.rotorAcOsc || !this.rotorAcFilter) return;

    const now = ctx.currentTime;
    if (isRotating && rpm > 0) {
      const f = (rpm / 60) * 2; // Tần số đảo cực
      const pitch = Math.max(50, 45 + f * 12);
      const gain = Math.min(0.2, 0.05 + (rpm / 300) * 0.12);
      const cutoff = 160 + f * 40;

      this.rotorAcOsc.frequency.setTargetAtTime(pitch, now, 0.06);
      this.rotorAcFilter.frequency.setTargetAtTime(cutoff, now, 0.06);
      this.rotorAcGain.gain.setTargetAtTime(gain, now, 0.06);
    } else {
      this.rotorAcGain.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  /**
   * Âm thanh lẫy gõ (Snap click) khi nam châm hoặc cuộn dây khớp vào bệ bàn
   */
  public playTableSnap(): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Âm thanh bật ngắt khóa K / dao cầu cơ học
   */
  public playSwitchClick(isClosed: boolean): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isClosed ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(isClosed ? 540 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(isClosed ? 180 : 120, now + 0.06);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Tiếng chớp sáng LED khi điện áp vượt ngưỡng
   */
  public playLedPop(color: 'red' | 'green'): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = color === 'red' ? 620 : 880;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Âm thanh UI click nhẹ
   */
  public playUiTap(): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Âm thanh hoàn thành màn chơi / thử thách game (Major arpeggio chime)
   */
  public playVictoryChime(): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.09;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.24, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.5);
    });
  }

  /**
   * Âm thanh đếm bước tiến độ / combo
   */
  public playProgressDing(streak: number = 1): void {
    if (this.isMuted) return;
    const ctx = this.initContextIfNeeded();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = Math.min(1200, 440 + streak * 65);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }
}

export const soundEngine = new EMAudioEngine();
