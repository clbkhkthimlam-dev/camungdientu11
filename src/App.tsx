/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ứng dụng mô phỏng 3D Hiện tượng Cảm ứng Điện từ (Khoa học tự nhiên Lớp 9)
 * - Bàn thí nghiệm gỗ sồi thật có 4 chân vững chãi, triệt tiêu hoàn toàn hiện tượng chớp nháy.
 * - Tất cả các thiết bị trên mặt bàn (Nam châm, Cuộn dây cảm ứng, Điện kế G, Nam châm điện, Nguồn DC, Khóa K) đều có thể nắm kéo dời qua lại.
 * - Mọi bảng phụ và thanh điều khiển đều có thể ẩn/hiện tùy ý.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  BookOpen,
  Sliders,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  ArrowUpToLine,
  ArrowDownToLine,
  Power,
  X,
  Compass,
  Tag,
  Volume2,
  VolumeX,
  Trophy,
  FileText,
  Plus,
} from 'lucide-react';
import { soundEngine } from './audio/emAudio';
import { GAME_CHALLENGES, GameChallenge } from './game/challengeSystem';
import { GameChallengePanel } from './components/GameChallengePanel';
import {
  ExperimentLogbook,
  ExperimentLogEntry,
} from './components/ExperimentLogbook';
import {
  clampCoilX,
  clampMagnetX,
  COIL_CENTER_X,
  createDefaultParams,
  createInitialPhysicsState,
  ELECTROMAGNET_DEFAULT_X,
  ExperimentId,
  FIXED_DT,
  FluxModelMode,
  interpretPhysicsState,
  MAGNET_DEFAULT_X,
  MAGNET_MAX_X,
  MAGNET_MIN_X,
  PhysicsState,
  SecondaryCircuitMode,
  SimulationParams,
  stepPhysics,
  synchronizeFluxState,
} from './physics/emPhysics';
import { EMInductionSceneController } from './scene/emScene';
import { Fallback2DView } from './components/Fallback2DView';
import { PredictionQuiz } from './components/PredictionQuiz';
import { VerificationModal } from './components/VerificationModal';
import { runAllPhysicsTests } from './tests/physicsTests';

type DrawerTab =
  | 'controls'
  | 'explanation'
  | 'predictions'
  | 'schematic2d'
  | 'logbook'
  | null;

export default function App() {
  const [params, setParams] = useState<SimulationParams>(() => createDefaultParams());
  const [uiPhysicsState, setUiPhysicsState] = useState<PhysicsState>(() =>
    createInitialPhysicsState(createDefaultParams())
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Ngăn kéo thông tin phụ (Mặc định đóng = null để sân khấu 3D tràn 100% màn hình)
  const [activeDrawer, setActiveDrawer] = useState<DrawerTab>(null);

  // Các lớp hiển thị có thể bật/tắt độc lập
  const [showFieldLines, setShowFieldLines] = useState<boolean>(true);
  const [showCurrentParticles, setShowCurrentParticles] = useState<boolean>(true);
  const [show3DLabels, setShow3DLabels] = useState<boolean>(true);
  const [showTopTelemetry, setShowTopTelemetry] = useState<boolean>(true);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  // Chế độ xoay Điện kế G 360° hoặc Tự động quay đối diện hướng xem
  const [galvAutoFaceCamera, setGalvAutoFaceCamera] = useState<boolean>(false);
  const [galvAngleDeg, setGalvAngleDeg] = useState<number>(-24);

  const [webglFailed, setWebglFailed] = useState<boolean>(false);
  const [isSoftwareGl, setIsSoftwareGl] = useState<boolean>(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState<boolean>(false);

  const [isExpandedMode, setIsExpandedMode] = useState<boolean>(false);
  const [fullscreenNote, setFullscreenNote] = useState<string>('Chế độ chuẩn');

  // Hiển thị FPS thời gian thực ở góc trái trên
  const [fpsStats, setFpsStats] = useState<{ fps: number; ms: string }>({
    fps: 60,
    ms: '16.6',
  });

  // Âm thanh vật lý chân thực (Web Audio API)
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.getMuted());
  const handleToggleMute = useCallback(() => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  }, []);

  // Chế độ Trò chơi & Thử thách Vật lý
  const [isGameMode, setIsGameMode] = useState<boolean>(false);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [starsByLevel, setStarsByLevel] = useState<Record<number, number>>({});
  const [isLevelComplete, setIsLevelComplete] = useState<boolean>(false);
  const [challengeProgress, setChallengeProgress] = useState<{
    progress: number;
    displayValue: string;
  }>({ progress: 0, displayValue: '0%' });

  const isGameModeRef = useRef<boolean>(isGameMode);
  isGameModeRef.current = isGameMode;
  const currentLevelIndexRef = useRef<number>(currentLevelIndex);
  currentLevelIndexRef.current = currentLevelIndex;
  const isLevelCompleteRef = useRef<boolean>(isLevelComplete);
  isLevelCompleteRef.current = isLevelComplete;
  const acStreakRef = useRef<number>(0);
  const lastCurrentSignRef = useRef<number>(0);
  const lastRedBrightnessRef = useRef<number>(0);
  const lastGreenBrightnessRef = useRef<number>(0);

  // Bảng Nhật Ký Thí Nghiệm Ảo (Virtual Experiment Logbook)
  const [logEntries, setLogEntries] = useState<ExperimentLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('em_induction_log_entries');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Bỏ qua lỗi
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('em_induction_log_entries', JSON.stringify(logEntries));
    } catch {
      // Bỏ qua lỗi
    }
  }, [logEntries]);

  const appShellRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneControllerRef = useRef<EMInductionSceneController | null>(null);

  const paramsRef = useRef<SimulationParams>(params);
  paramsRef.current = params;

  const physicsStateRef = useRef<PhysicsState>(uiPhysicsState);
  const isRunningRef = useRef<boolean>(isRunning);
  isRunningRef.current = isRunning;

  const isDraggingMagnetRef = useRef<boolean>(false);
  const targetMagnetXRef = useRef<number>(MAGNET_DEFAULT_X);
  const targetMagnetYRef = useRef<number>(0);
  const targetMagnetZRef = useRef<number>(0);

  const isDraggingCoilRef = useRef<boolean>(false);
  const targetCoilXRef = useRef<number>(COIL_CENTER_X);
  const targetCoilYRef = useRef<number>(0);
  const targetCoilZRef = useRef<number>(0);

  const isDraggingEmRef = useRef<boolean>(false);
  const targetEmXRef = useRef<number>(ELECTROMAGNET_DEFAULT_X);

  const sliderReleaseTimeoutRef = useRef<number | null>(null);

  const scriptedMotionRef = useRef<{
    active: boolean;
    targetX: number;
    speed: number;
  }>({ active: false, targetX: MAGNET_DEFAULT_X, speed: 1.6 });

  const testSummary = useMemo(() => {
    const res = runAllPhysicsTests();
    const passed = res.filter((r) => r.passed).length;
    return `${passed}/${res.length}`;
  }, []);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    sceneControllerRef.current?.setVisualOptions({
      showFieldLines,
      showCurrentParticles,
      show3DLabels,
      reducedMotion: Boolean(prefersReduced),
      galvAutoFaceCamera,
      galvManualAngleDeg: galvAngleDeg,
    });
  }, [
    showFieldLines,
    showCurrentParticles,
    show3DLabels,
    galvAutoFaceCamera,
    galvAngleDeg,
  ]);

  // Khởi tạo Three.js Scene một lần duy nhất trong container ổn định
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    let controller: EMInductionSceneController | null = null;
    try {
      controller = new EMInductionSceneController(container, {
        onMagnetDragStart: () => {
          if (sliderReleaseTimeoutRef.current !== null) {
            window.clearTimeout(sliderReleaseTimeoutRef.current);
            sliderReleaseTimeoutRef.current = null;
          }
          isDraggingMagnetRef.current = true;
          scriptedMotionRef.current.active = false;
          setIsRunning(false);
          isRunningRef.current = false;
          targetMagnetXRef.current = physicsStateRef.current.magnetX;
          targetMagnetYRef.current = physicsStateRef.current.magnetY ?? 0;
          targetMagnetZRef.current = physicsStateRef.current.magnetZ ?? 0;
        },
        onMagnetDragMove: (newX: number, newY?: number, newZ?: number) => {
          targetMagnetXRef.current = clampMagnetX(
            newX,
            physicsStateRef.current.coilX
          );
          if (typeof newY === 'number') {
            targetMagnetYRef.current = newY;
          }
          if (typeof newZ === 'number') {
            targetMagnetZRef.current = newZ;
          }
        },
        onMagnetDragEnd: () => {
          isDraggingMagnetRef.current = false;
          targetMagnetXRef.current = physicsStateRef.current.magnetX;
          targetMagnetYRef.current = physicsStateRef.current.magnetY ?? 0;
          targetMagnetZRef.current = physicsStateRef.current.magnetZ ?? 0;
        },
        onCoilDragStart: () => {
          if (sliderReleaseTimeoutRef.current !== null) {
            window.clearTimeout(sliderReleaseTimeoutRef.current);
            sliderReleaseTimeoutRef.current = null;
          }
          isDraggingCoilRef.current = true;
          scriptedMotionRef.current.active = false;
          setIsRunning(false);
          isRunningRef.current = false;
          targetCoilXRef.current = physicsStateRef.current.coilX;
          targetCoilYRef.current = physicsStateRef.current.coilY ?? 0;
          targetCoilZRef.current = physicsStateRef.current.coilZ ?? 0;
        },
        onCoilDragMove: (newCoilX: number, newCoilY?: number, newCoilZ?: number) => {
          const leftSource =
            paramsRef.current.experiment === 'permanent_magnet'
              ? physicsStateRef.current.magnetX
              : physicsStateRef.current.electromagnetX;
          targetCoilXRef.current = clampCoilX(newCoilX, leftSource);
          if (typeof newCoilY === 'number') {
            targetCoilYRef.current = newCoilY;
          }
          if (typeof newCoilZ === 'number') {
            targetCoilZRef.current = newCoilZ;
          }
        },
        onCoilDragEnd: () => {
          isDraggingCoilRef.current = false;
          targetCoilXRef.current = physicsStateRef.current.coilX;
          targetCoilYRef.current = physicsStateRef.current.coilY ?? 0;
          targetCoilZRef.current = physicsStateRef.current.coilZ ?? 0;
        },
        onElectromagnetDragStart: () => {
          isDraggingEmRef.current = true;
          targetEmXRef.current = physicsStateRef.current.electromagnetX;
        },
        onElectromagnetDragMove: (newEmX: number) => {
          targetEmXRef.current = clampMagnetX(
            newEmX,
            physicsStateRef.current.coilX
          );
        },
        onElectromagnetDragEnd: () => {
          isDraggingEmRef.current = false;
          targetEmXRef.current = physicsStateRef.current.electromagnetX;
        },
        onToggleSwitchClick: () => {
          const nextState = !paramsRef.current.switchClosed;
          soundEngine.playSwitchClick(nextState);
          setParams((prev) => {
            const next = { ...prev, switchClosed: nextState };
            paramsRef.current = next;
            return next;
          });
        },
        onTableSnap: () => {
          soundEngine.playTableSnap();
        },
        onGalvanometerRotate: (angleDeg: number, autoFace: boolean) => {
          setGalvAutoFaceCamera(autoFace);
          setGalvAngleDeg(angleDeg);
        },
      });
      sceneControllerRef.current = controller;
      setIsSoftwareGl(controller.getIsSoftwareGl());
    } catch {
      setWebglFailed(true);
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          controller?.resize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    const canvasEl = controller.getRenderer().domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    canvasEl.addEventListener('webglcontextlost', handleContextLost);

    let frameId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let lastUiSyncTime = 0;
    let frameCount = 0;
    let fpsLastTime = performance.now();
    const isSoft = controller.getIsSoftwareGl();

    const afterDraw = (cb: () => void) => {
      const gl = controller?.getRenderer().getContext() as WebGL2RenderingContext | undefined;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      const now = performance.now();
      let frameElapsed = (now - lastTime) / 1000;
      lastTime = now;

      if (frameElapsed > 0.08 || frameElapsed <= 0) {
        frameElapsed = FIXED_DT;
      }

      accumulator += frameElapsed;
      const currentParams = paramsRef.current;

      while (accumulator >= FIXED_DT) {
        let draggingMagnet = isDraggingMagnetRef.current;
        let dragTargetMagnet = targetMagnetXRef.current;

        if (
          scriptedMotionRef.current.active &&
          currentParams.experiment === 'permanent_magnet'
        ) {
          draggingMagnet = true;
          const curX = physicsStateRef.current.magnetX;
          const goalX = clampMagnetX(
            scriptedMotionRef.current.targetX,
            physicsStateRef.current.coilX
          );
          const diff = goalX - curX;
          const maxStep = scriptedMotionRef.current.speed * FIXED_DT;
          if (Math.abs(diff) <= maxStep) {
            dragTargetMagnet = goalX;
            scriptedMotionRef.current.active = false;
            isDraggingMagnetRef.current = false;
          } else {
            dragTargetMagnet = curX + Math.sign(diff) * maxStep;
          }
          targetMagnetXRef.current = dragTargetMagnet;
        }

        physicsStateRef.current = stepPhysics(
          physicsStateRef.current,
          currentParams,
          {
            dt: FIXED_DT,
            isRunning:
              currentParams.experiment === 'electromagnet'
                ? true
                : isRunningRef.current,
            isDraggingMagnet: draggingMagnet,
            targetMagnetX: dragTargetMagnet,
            targetMagnetY: targetMagnetYRef.current,
            targetMagnetZ: targetMagnetZRef.current,
            isDraggingCoil: isDraggingCoilRef.current,
            targetCoilX: targetCoilXRef.current,
            targetCoilY: targetCoilYRef.current,
            targetCoilZ: targetCoilZRef.current,
            isDraggingElectromagnet: isDraggingEmRef.current,
            targetElectromagnetX: targetEmXRef.current,
          }
        );
        accumulator -= FIXED_DT;
      }

      controller?.syncFromPhysics(physicsStateRef.current, currentParams);

      // Cập nhật âm thanh ngân điện từ chân thực theo dòng điện & vận tốc
      soundEngine.updateInductionHum(
        physicsStateRef.current.secondaryCurrent,
        physicsStateRef.current.magnetVelocity
      );

      // Âm thanh chớp sáng LED khi vượt ngưỡng
      const curRed = physicsStateRef.current.redLedBrightness ?? 0;
      const curGreen = physicsStateRef.current.greenLedBrightness ?? 0;
      if (curRed > 0.4 && lastRedBrightnessRef.current <= 0.1) {
        soundEngine.playLedPop('red');
      }
      if (curGreen > 0.4 && lastGreenBrightnessRef.current <= 0.1) {
        soundEngine.playLedPop('green');
      }
      lastRedBrightnessRef.current = curRed;
      lastGreenBrightnessRef.current = curGreen;

      // Đo lường và cập nhật FPS thời gian thực (chu kỳ 250ms)
      frameCount++;
      const elapsedSinceFps = now - fpsLastTime;
      if (elapsedSinceFps >= 250) {
        const computedFps = Math.round((frameCount * 1000) / elapsedSinceFps);
        const avgMs = (elapsedSinceFps / frameCount).toFixed(1);
        setFpsStats({
          fps: Math.min(120, Math.max(1, computedFps)),
          ms: avgMs,
        });
        frameCount = 0;
        fpsLastTime = now;
      }

      // Theo dõi tiến độ Chế độ Trò chơi & Thử thách
      if (isGameModeRef.current) {
        // Đếm chuỗi nhịp đổi chiều dòng điện xoay chiều AC
        const iSec = physicsStateRef.current.secondaryCurrent;
        if (Math.abs(iSec) > 0.035) {
          const currentSign = Math.sign(iSec);
          if (
            lastCurrentSignRef.current !== 0 &&
            currentSign !== lastCurrentSignRef.current
          ) {
            acStreakRef.current += 1;
            soundEngine.playProgressDing(acStreakRef.current);
          }
          lastCurrentSignRef.current = currentSign;
        }

        const activeLvl = GAME_CHALLENGES[currentLevelIndexRef.current];
        if (activeLvl) {
          const checkRes = activeLvl.checkProgress(
            physicsStateRef.current,
            currentParams,
            { acStreak: acStreakRef.current }
          );
          setChallengeProgress({
            progress: checkRes.progress,
            displayValue: checkRes.displayValue,
          });

          if (checkRes.isComplete && !isLevelCompleteRef.current) {
            isLevelCompleteRef.current = true;
            setIsLevelComplete(true);
            soundEngine.playVictoryChime();
            setStarsByLevel((prev) => ({
              ...prev,
              [currentLevelIndexRef.current]: 3,
            }));
          }
        }
      }

      if (now - lastUiSyncTime > 42) {
        lastUiSyncTime = now;
        setUiPhysicsState({ ...physicsStateRef.current });
      }

      if (isSoft) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const handleVisibilityChange = () => {
      lastTime = performance.now();
      accumulator = 0;
      physicsStateRef.current = synchronizeFluxState(
        physicsStateRef.current,
        paramsRef.current
      );
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (sliderReleaseTimeoutRef.current !== null) {
        window.clearTimeout(sliderReleaseTimeoutRef.current);
      }
      resizeObserver.disconnect();
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      controller?.dispose();
      sceneControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement;
      if (!fsEl && isExpandedMode && fullscreenNote.includes('Toàn màn hình trình duyệt')) {
        setIsExpandedMode(false);
        setFullscreenNote('Chế độ chuẩn');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isExpandedMode, fullscreenNote]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.key === 'ArrowRight' && paramsRef.current.experiment === 'permanent_magnet') {
        e.preventDefault();
        setIsRunning(false);
        isRunningRef.current = false;
        scriptedMotionRef.current = {
          active: true,
          targetX: clampMagnetX(
            physicsStateRef.current.magnetX + 0.35,
            physicsStateRef.current.coilX
          ),
          speed: 1.9,
        };
      } else if (
        e.key === 'ArrowLeft' &&
        paramsRef.current.experiment === 'permanent_magnet'
      ) {
        e.preventDefault();
        setIsRunning(false);
        isRunningRef.current = false;
        scriptedMotionRef.current = {
          active: true,
          targetX: clampMagnetX(
            physicsStateRef.current.magnetX - 0.35,
            physicsStateRef.current.coilX
          ),
          speed: 1.9,
        };
      } else if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape' && activeDrawer !== null) {
        setActiveDrawer(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeDrawer]);

  const handleSwitchExperiment = useCallback((exp: ExperimentId) => {
    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = false;
    isDraggingCoilRef.current = false;
    isDraggingEmRef.current = false;
    setIsRunning(false);
    isRunningRef.current = false;

    setParams((prev) => {
      const next: SimulationParams = {
        ...prev,
        experiment: exp,
        switchClosed: false,
      };
      paramsRef.current = next;
      const freshState = createInitialPhysicsState(next);
      physicsStateRef.current = freshState;
      targetMagnetXRef.current = freshState.magnetX;
      targetCoilXRef.current = freshState.coilX;
      targetEmXRef.current = freshState.electromagnetX;
      setUiPhysicsState(freshState);
      return next;
    });
  }, []);

  const handleToggleRun = useCallback(() => {
    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = false;
    isDraggingCoilRef.current = false;
    setIsRunning((prev) => {
      const next = !prev;
      isRunningRef.current = next;
      physicsStateRef.current = synchronizeFluxState(
        physicsStateRef.current,
        paramsRef.current
      );
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = false;
    isDraggingCoilRef.current = false;
    isDraggingEmRef.current = false;
    setIsRunning(false);
    isRunningRef.current = false;

    setParams((prev) => {
      const next: SimulationParams = {
        ...prev,
        switchClosed: false,
      };
      paramsRef.current = next;
      const resetState = createInitialPhysicsState(next);
      physicsStateRef.current = resetState;
      targetMagnetXRef.current = resetState.magnetX;
      targetMagnetYRef.current = 0;
      targetMagnetZRef.current = 0;
      targetCoilXRef.current = resetState.coilX;
      targetEmXRef.current = resetState.electromagnetX;
      setUiPhysicsState(resetState);
      return next;
    });
    sceneControllerRef.current?.resetCameraView();
  }, []);

  const handleSelectGameLevel = useCallback(
    (index: number) => {
      soundEngine.playUiTap();
      setCurrentLevelIndex(index);
      currentLevelIndexRef.current = index;
      setIsLevelComplete(false);
      isLevelCompleteRef.current = false;
      acStreakRef.current = 0;
      lastCurrentSignRef.current = 0;
      setChallengeProgress({ progress: 0, displayValue: '0%' });
      const lvl = GAME_CHALLENGES[index];
      if (lvl && lvl.targetExperiment !== 'any') {
        handleSwitchExperiment(lvl.targetExperiment);
      }
    },
    [handleSwitchExperiment]
  );

  const handleNextGameLevel = useCallback(() => {
    soundEngine.playUiTap();
    if (currentLevelIndex < GAME_CHALLENGES.length - 1) {
      handleSelectGameLevel(currentLevelIndex + 1);
    }
  }, [currentLevelIndex, handleSelectGameLevel]);

  const handleResetGameLevel = useCallback(() => {
    soundEngine.playUiTap();
    setIsLevelComplete(false);
    isLevelCompleteRef.current = false;
    acStreakRef.current = 0;
    lastCurrentSignRef.current = 0;
    setChallengeProgress({ progress: 0, displayValue: '0%' });
    handleReset();
  }, [handleReset]);

  const handleToggleGameMode = useCallback(() => {
    soundEngine.playUiTap();
    setIsGameMode((prev) => {
      const next = !prev;
      isGameModeRef.current = next;
      if (next) {
        setIsLevelComplete(false);
        isLevelCompleteRef.current = false;
        acStreakRef.current = 0;
        lastCurrentSignRef.current = 0;
        setChallengeProgress({ progress: 0, displayValue: '0%' });
      }
      return next;
    });
  }, []);

  const handleFlipPolarity = useCallback(() => {
    setParams((prev) => {
      const next: SimulationParams = {
        ...prev,
        magnetPolarity: prev.magnetPolarity === 1 ? -1 : 1,
      };
      paramsRef.current = next;
      if (!isRunningRef.current && !isDraggingMagnetRef.current) {
        physicsStateRef.current = synchronizeFluxState(
          physicsStateRef.current,
          next
        );
        setUiPhysicsState({ ...physicsStateRef.current });
      }
      return next;
    });
  }, []);

  const handleAddLogSnapshot = useCallback((customNote?: string) => {
    soundEngine.playProgressDing(logEntries.length + 1);
    const curState = physicsStateRef.current;
    const curParams = paramsRef.current;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const activeLed: 'red' | 'green' | 'none' =
      (curState.redLedBrightness ?? 0) > 0.05
        ? 'red'
        : (curState.greenLedBrightness ?? 0) > 0.05
          ? 'green'
          : 'none';

    setLogEntries((prev) => {
      const nextTrial = prev.length + 1;
      const autoNote =
        customNote ||
        (Math.abs(curState.magnetVelocity) > 0.75
          ? 'Kéo rất nhanh'
          : Math.abs(curState.magnetVelocity) > 0.2
            ? 'Kéo tốc độ vừa'
            : (curState.magnetY ?? 0) > 0.08
              ? 'Nhấc lơ lửng 3D'
              : 'Đo tĩnh / chậm');

      const newEntry: ExperimentLogEntry = {
        id: 'trial_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        trialNumber: nextTrial,
        timeStr,
        experimentName:
          curParams.experiment === 'permanent_magnet'
            ? 'Nam châm vĩnh cửu (TN1)'
            : 'Nam châm điện (TN2)',
        velocity: curState.magnetVelocity ?? 0,
        fluxMWb: curState.fluxPerTurn * 1000,
        dPhiDtMWb: curState.dPhiDt * 1000,
        emf: curState.emf,
        currentMA: curState.secondaryCurrent * 1000,
        needleAngle: curState.needleAngleDeg,
        activeLed,
        elevationY:
          curParams.experiment === 'permanent_magnet'
            ? curState.magnetY ?? 0
            : curState.coilY ?? 0,
        turnsN: curParams.coilTurnsN,
        userNote: autoNote,
      };
      return [...prev, newEntry];
    });
  }, [logEntries.length]);

  const handleUpdateLogNote = useCallback((id: string, newNote: string) => {
    setLogEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, userNote: newNote } : e))
    );
  }, []);

  const handleDeleteLogEntry = useCallback((id: string) => {
    setLogEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleClearAllLogs = useCallback(() => {
    setLogEntries([]);
  }, []);

  const handleToggleLiftMagnet = useCallback(() => {
    const isCurrentlyLifted = (uiPhysicsState.magnetY ?? 0) > 0.04;
    const targetY = isCurrentlyLifted ? 0 : 1.35;
    const targetZ = isCurrentlyLifted ? 0 : (physicsStateRef.current.magnetZ ?? 0);

    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = true;
    targetMagnetYRef.current = targetY;
    targetMagnetZRef.current = targetZ;

    if (sceneControllerRef.current) {
      if (isCurrentlyLifted) {
        sceneControllerRef.current.placeMagnetOnTable();
      } else {
        sceneControllerRef.current.liftMagnet(targetY);
      }
    }

    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingMagnetRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 180);
  }, [uiPhysicsState.magnetY]);

  const handlePlaceMagnetOnTable = useCallback(() => {
    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = true;
    targetMagnetYRef.current = 0;
    targetMagnetZRef.current = 0;
    if (sceneControllerRef.current) {
      sceneControllerRef.current.placeMagnetOnTable();
    }
    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingMagnetRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 180);
  }, []);

  const handleMagnetElevationChange = useCallback((newY: number) => {
    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = true;
    targetMagnetYRef.current = newY;
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setMagnet3DPosition(
        physicsStateRef.current.magnetX,
        newY,
        physicsStateRef.current.magnetZ ?? 0
      );
    }
    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingMagnetRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 160);
  }, []);

  const handleMagnetDepthChange = useCallback((newZ: number) => {
    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = true;
    targetMagnetZRef.current = newZ;
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setMagnet3DPosition(
        physicsStateRef.current.magnetX,
        physicsStateRef.current.magnetY ?? 0,
        newZ
      );
    }
    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingMagnetRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 160);
  }, []);

  const handleToggleLiftCoil = useCallback(() => {
    const isCurrentlyLifted = (uiPhysicsState.coilY ?? 0) > 0.04;
    const targetY = isCurrentlyLifted ? 0 : 1.35;
    const targetZ = isCurrentlyLifted ? 0 : (physicsStateRef.current.coilZ ?? 0);

    scriptedMotionRef.current.active = false;
    isDraggingCoilRef.current = true;
    targetCoilYRef.current = targetY;
    targetCoilZRef.current = targetZ;

    if (sceneControllerRef.current) {
      if (isCurrentlyLifted) {
        sceneControllerRef.current.placeCoilOnTable();
      } else {
        sceneControllerRef.current.liftCoil(targetY);
      }
    }

    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingCoilRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 180);
  }, [uiPhysicsState.coilY]);

  const handlePlaceCoilOnTable = useCallback(() => {
    scriptedMotionRef.current.active = false;
    isDraggingCoilRef.current = true;
    targetCoilYRef.current = 0;
    targetCoilZRef.current = 0;
    if (sceneControllerRef.current) {
      sceneControllerRef.current.placeCoilOnTable();
    }
    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingCoilRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 180);
  }, []);

  const handlePlaceBothOnTable = useCallback(() => {
    scriptedMotionRef.current.active = false;
    isDraggingMagnetRef.current = true;
    isDraggingCoilRef.current = true;
    targetMagnetYRef.current = 0;
    targetMagnetZRef.current = 0;
    targetCoilYRef.current = 0;
    targetCoilZRef.current = 0;
    if (sceneControllerRef.current) {
      sceneControllerRef.current.placeMagnetOnTable();
      sceneControllerRef.current.placeCoilOnTable();
    }
    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingMagnetRef.current = false;
      isDraggingCoilRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 180);
  }, []);

  const handleCoilElevationChange = useCallback((newY: number) => {
    scriptedMotionRef.current.active = false;
    isDraggingCoilRef.current = true;
    targetCoilYRef.current = newY;
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setCoil3DPosition(
        physicsStateRef.current.coilX,
        newY,
        physicsStateRef.current.coilZ ?? 0
      );
    }
    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingCoilRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 160);
  }, []);

  const handleCoilDepthChange = useCallback((newZ: number) => {
    scriptedMotionRef.current.active = false;
    isDraggingCoilRef.current = true;
    targetCoilZRef.current = newZ;
    if (sceneControllerRef.current) {
      sceneControllerRef.current.setCoil3DPosition(
        physicsStateRef.current.coilX,
        physicsStateRef.current.coilY ?? 0,
        newZ
      );
    }
    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingCoilRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 160);
  }, []);

  const handleCoilSliderChange = useCallback((newX: number) => {
    const leftLimit =
      paramsRef.current.experiment === 'permanent_magnet'
        ? physicsStateRef.current.magnetX
        : physicsStateRef.current.electromagnetX;
    const clamped = clampCoilX(newX, leftLimit);
    scriptedMotionRef.current.active = false;
    setIsRunning(false);
    isRunningRef.current = false;
    isDraggingCoilRef.current = true;
    targetCoilXRef.current = clamped;

    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingCoilRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 140);
  }, []);

  const handleMagnetSliderChange = useCallback((newX: number) => {
    const clamped = clampMagnetX(newX, physicsStateRef.current.coilX);
    scriptedMotionRef.current.active = false;
    setIsRunning(false);
    isRunningRef.current = false;
    isDraggingMagnetRef.current = true;
    targetMagnetXRef.current = clamped;

    if (sliderReleaseTimeoutRef.current !== null) {
      window.clearTimeout(sliderReleaseTimeoutRef.current);
    }
    sliderReleaseTimeoutRef.current = window.setTimeout(() => {
      isDraggingMagnetRef.current = false;
      sliderReleaseTimeoutRef.current = null;
    }, 140);
  }, []);

  const handleQuickMoveMagnet = useCallback((direction: 'closer' | 'farther') => {
    setIsRunning(false);
    isRunningRef.current = false;
    const coilX = physicsStateRef.current.coilX;
    const target = direction === 'closer' ? coilX - 1.15 : -4.05;
    scriptedMotionRef.current = {
      active: true,
      targetX: target,
      speed: 1.75 * paramsRef.current.autoSpeedMultiplier,
    };
  }, []);

  const handleToggleElectromagnetSwitch = useCallback(() => {
    setParams((prev) => {
      const next = { ...prev, switchClosed: !prev.switchClosed };
      paramsRef.current = next;
      return next;
    });
  }, []);

  const handleTriggerQuizScenario = useCallback(
    (scenario: 'approach_n' | 'recede_n' | 'hold_still' | 'switch_off_em') => {
      if (scenario === 'approach_n') {
        const nextParams: SimulationParams = {
          ...paramsRef.current,
          experiment: 'permanent_magnet',
          magnetPolarity: 1,
        };
        setParams(nextParams);
        paramsRef.current = nextParams;
        setIsRunning(false);
        isRunningRef.current = false;
        physicsStateRef.current.coilX = COIL_CENTER_X;
        physicsStateRef.current.magnetX = -3.65;
        physicsStateRef.current = synchronizeFluxState(
          physicsStateRef.current,
          nextParams
        );
        scriptedMotionRef.current = {
          active: true,
          targetX: -1.18,
          speed: 1.85,
        };
      } else if (scenario === 'recede_n') {
        const nextParams: SimulationParams = {
          ...paramsRef.current,
          experiment: 'permanent_magnet',
          magnetPolarity: 1,
        };
        setParams(nextParams);
        paramsRef.current = nextParams;
        setIsRunning(false);
        isRunningRef.current = false;
        physicsStateRef.current.coilX = COIL_CENTER_X;
        physicsStateRef.current.magnetX = -1.18;
        physicsStateRef.current = synchronizeFluxState(
          physicsStateRef.current,
          nextParams
        );
        scriptedMotionRef.current = {
          active: true,
          targetX: -3.75,
          speed: 1.85,
        };
      } else if (scenario === 'hold_still') {
        const nextParams: SimulationParams = {
          ...paramsRef.current,
          experiment: 'permanent_magnet',
        };
        setParams(nextParams);
        paramsRef.current = nextParams;
        scriptedMotionRef.current.active = false;
        isDraggingMagnetRef.current = false;
        setIsRunning(false);
        isRunningRef.current = false;
        physicsStateRef.current.coilX = COIL_CENTER_X;
        physicsStateRef.current.magnetX = -1.22;
        physicsStateRef.current = synchronizeFluxState(
          physicsStateRef.current,
          nextParams
        );
        setUiPhysicsState({ ...physicsStateRef.current });
      } else if (scenario === 'switch_off_em') {
        const nextParams: SimulationParams = {
          ...paramsRef.current,
          experiment: 'electromagnet',
          switchClosed: false,
        };
        setParams(nextParams);
        paramsRef.current = nextParams;
        physicsStateRef.current.primaryCurrent = 3.0;
        physicsStateRef.current = synchronizeFluxState(
          physicsStateRef.current,
          nextParams
        );
      }
    },
    []
  );

  const handleToggleExpandMode = useCallback(async () => {
    const el = appShellRef.current;
    if (!isExpandedMode) {
      if (el && typeof el.requestFullscreen === 'function') {
        try {
          await el.requestFullscreen();
          setIsExpandedMode(true);
          setFullscreenNote('Đang ở Chế độ Toàn màn hình trình duyệt (OS Fullscreen)');
          return;
        } catch {
          // Fallback cho iPhone Safari
        }
      }
      setIsExpandedMode(true);
      setFullscreenNote(
        'Đang ở Chế độ Tập trung mở rộng (Tối đa hóa khung 3D 100dvh)'
      );
    } else {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        try {
          await document.exitFullscreen();
        } catch {
          // Bỏ qua
        }
      }
      setIsExpandedMode(false);
      setFullscreenNote('Chế độ chuẩn');
    }
  }, [isExpandedMode]);

  const toggleDrawerTab = useCallback((tab: Exclude<DrawerTab, null>) => {
    setActiveDrawer((prev) => (prev === tab ? null : tab));
  }, []);

  const interpretation = useMemo(
    () => interpretPhysicsState(uiPhysicsState, params),
    [uiPhysicsState, params]
  );

  const isExp1 = params.experiment === 'permanent_magnet';

  return (
    <div
      ref={appShellRef}
      className={
        isExpandedMode
          ? 'focus-mode-shell bg-slate-950 text-slate-100 flex flex-col overflow-hidden'
          : 'app-dvh-shell h-dvh bg-slate-950 text-slate-100 flex flex-col overflow-hidden'
      }
    >
      {/* 1. Thanh tiêu đề & Icon thu nhỏ tối đa (Ultra-Compact Single Row Header) */}
      <header className="flex items-center justify-between gap-1.5 px-2 sm:px-3 py-1 border-b border-slate-800/90 bg-slate-950 shrink-0 z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            className="text-xs font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 pr-1"
            title="Đặt lại thí nghiệm"
          >
            EM 3D Lab
          </a>

          {/* Chuyển nhanh Thí nghiệm 1 / 2 gọn nhẹ */}
          <div className="inline-flex items-center bg-slate-900 p-0.5 rounded-md border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => handleSwitchExperiment('permanent_magnet')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isExp1
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TN1: Nam châm
            </button>
            <button
              type="button"
              onClick={() => handleSwitchExperiment('electromagnet')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                !isExp1
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TN2: Nam châm điện
            </button>
          </div>
        </div>

        {/* Cụm nút icon thu gọn tối đa ở góc phải trên */}
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setShowTopTelemetry((prev) => !prev)}
            title={
              showTopTelemetry
                ? 'Ẩn thanh chữ & thông số phía trên'
                : 'Hiện thanh chữ & thông số phía trên'
            }
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
              showTopTelemetry
                ? 'bg-sky-950/80 border-sky-600/70 text-sky-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showTopTelemetry ? (
              <ChevronUp className="w-3 h-3 text-sky-400" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">Thông số</span>
          </button>

          <button
            type="button"
            onClick={() => setShow3DLabels((prev) => !prev)}
            title="Ẩn / Hiện chữ hướng dẫn nổi trong 3D"
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
              show3DLabels
                ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span className="hidden md:inline">Nhãn 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFieldLines((prev) => !prev)}
            title="Ẩn / Hiện đường sức từ"
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
              showFieldLines
                ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {showFieldLines ? (
              <Eye className="w-3 h-3 text-emerald-400" />
            ) : (
              <EyeOff className="w-3 h-3" />
            )}
            <span className="hidden lg:inline">Từ trường</span>
          </button>

          {isExp1 && (
            <button
              type="button"
              onClick={handleToggleLiftMagnet}
              title={
                (uiPhysicsState.magnetY ?? 0) > 0.04
                  ? 'Hạ nam châm xuống bàn (Đặt lại trên ray)'
                  : 'Nhấc nam châm lên không gian 3D để xem toàn diện đường sức từ xanh lá'
              }
              className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
                (uiPhysicsState.magnetY ?? 0) > 0.04
                  ? 'bg-amber-950/80 border-amber-500/80 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {(uiPhysicsState.magnetY ?? 0) > 0.04 ? (
                <>
                  <ArrowDownToLine className="w-3 h-3 text-amber-400" />
                  <span className="hidden md:inline">Hạ bàn</span>
                </>
              ) : (
                <>
                  <ArrowUpToLine className="w-3 h-3 text-amber-400" />
                  <span className="hidden md:inline">Nhấc 3D</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleDrawerTab('explanation')}
            title="Giải thích hiện tượng"
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
              activeDrawer === 'explanation'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden md:inline">Giải thích</span>
          </button>

          <button
            type="button"
            onClick={() => toggleDrawerTab('controls')}
            title="Cài đặt thông số"
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
              activeDrawer === 'controls'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden md:inline">Tùy chọn</span>
          </button>

          <button
            type="button"
            onClick={() => toggleDrawerTab('predictions')}
            title="Câu hỏi dự đoán"
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
              activeDrawer === 'predictions'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span className="hidden lg:inline">Câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={() => toggleDrawerTab('logbook')}
            title="Mở Bảng Nhật Ký & So Sánh Thí Nghiệm"
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ${
              activeDrawer === 'logbook'
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3 text-amber-400" />
            <span>Nhật ký</span>
            {logEntries.length > 0 && (
              <span className="px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-bold">
                {logEntries.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleGameMode}
            title={isGameMode ? 'Rời chế độ thử thách' : 'Vào Chế độ Trò chơi Thử thách'}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
              isGameMode
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 border-amber-500/40 text-amber-300 hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{isGameMode ? 'Đang chơi' : '🎮 Thử thách'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? 'Bật âm thanh mô phỏng' : 'Tắt âm thanh'}
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] cursor-pointer shrink-0"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsVerificationOpen(true)}
            title="Kiểm thử mô hình vật lí"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-mono cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{testSummary}</span>
          </button>

          <button
            type="button"
            onClick={() => handleReset()}
            title="Đặt lại vị trí dụng cụ & góc nhìn chuẩn"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] cursor-pointer shrink-0"
          >
            <Compass className="w-3 h-3 text-sky-400" />
          </button>

          <button
            type="button"
            onClick={handleToggleExpandMode}
            title={isExpandedMode ? 'Thu nhỏ' : 'Toàn màn hình'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExpandedMode ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">
              {isExpandedMode ? 'Thu nhỏ' : 'Toàn màn hình'}
            </span>
          </button>
        </div>
      </header>

      {/* 2. VÙNG SÂN KHẤU 3D TRÀN MÀN HÌNH */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-slate-950">
        <div
          ref={canvasMountRef}
          className={`w-full h-full ${
            webglFailed || activeDrawer === 'schematic2d' ? 'hidden' : 'block'
          }`}
        />

        {/* Hiển thị FPS và thời gian khung hình thời gian thực ở góc trái trên */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950/85 border border-slate-800 text-[10px] font-mono shadow-md pointer-events-none">
          <span
            className={`w-2 h-2 rounded-full ${
              fpsStats.fps >= 55
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                : fpsStats.fps >= 30
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
            }`}
          />
          <span className="font-bold text-slate-200">{fpsStats.fps} FPS</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{fpsStats.ms}ms</span>
        </div>

        {/* Giao diện Hệ thống Chế độ Trò chơi Thử thách */}
        {isGameMode && (
          <GameChallengePanel
            currentLevelIndex={currentLevelIndex}
            onSelectLevel={handleSelectGameLevel}
            progress={challengeProgress.progress}
            displayValue={challengeProgress.displayValue}
            isComplete={isLevelComplete}
            starsByLevel={starsByLevel}
            onNextLevel={handleNextGameLevel}
            onResetLevel={handleResetGameLevel}
            onExitGameMode={handleToggleGameMode}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {(webglFailed || activeDrawer === 'schematic2d') && (
          <div className="absolute inset-0 w-full h-full z-10">
            <Fallback2DView
              state={uiPhysicsState}
              params={params}
              interpretation={interpretation}
              isWebGLFallback={webglFailed}
              onMagnetSliderChange={handleMagnetSliderChange}
              onToggleSwitch={handleToggleElectromagnetSwitch}
            />
          </div>
        )}

        {/* Thanh thông số & Đèn LED song song ngược cực ở mép trên (chỉ hiện khi không ở trong chế độ Game) */}
        {!isGameMode && (showTopTelemetry ? (
          <div className="absolute top-1.5 left-28 right-2 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none z-10">
            <div className="bg-slate-950/90 border border-slate-800/90 px-2.5 py-1 rounded-lg text-[11px] text-slate-200 pointer-events-auto flex flex-wrap items-center gap-x-2.5 gap-y-0.5 shadow-md">
              <span className="font-semibold text-sky-400">
                {interpretation.shortSummaryBanner}
              </span>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-slate-300">
                Φ={(uiPhysicsState.fluxPerTurn * 1000).toFixed(2)} · dΦ/dt=
                {(uiPhysicsState.dPhiDt * 1000).toFixed(2)} ·{' '}
                <strong className="text-amber-300">
                  E=
                  {uiPhysicsState.emf >= 0
                    ? `+${uiPhysicsState.emf.toFixed(2)}`
                    : uiPhysicsState.emf.toFixed(2)}
                </strong>
              </span>
              {isExp1 && (uiPhysicsState.magnetY ?? 0) > 0.04 && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    3D: Y={(uiPhysicsState.magnetY ?? 0).toFixed(2)}m · Z=
                    {(uiPhysicsState.magnetZ ?? 0).toFixed(2)}m (Lơ lửng)
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              {/* Trạng thái 2 Đèn LED mắc song song ngược cực */}
              <div className="bg-slate-950/90 border border-slate-800/90 px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-2.5 shadow-md">
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full inline-block transition-all ${
                      uiPhysicsState.redLedBrightness > 0.01
                        ? 'bg-red-500 shadow-[0_0_10px_#ef4444] scale-110'
                        : 'bg-red-950 border border-red-800/60'
                    }`}
                  />
                  <span
                    className={
                      uiPhysicsState.redLedBrightness > 0.01
                        ? 'text-red-400 font-bold'
                        : 'text-slate-500'
                    }
                  >
                    LED Đỏ (Φ↑)
                  </span>
                </span>

                <span className="inline-flex items-center gap-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full inline-block transition-all ${
                      uiPhysicsState.greenLedBrightness > 0.01
                        ? 'bg-emerald-400 shadow-[0_0_10px_#10b981] scale-110'
                        : 'bg-emerald-950 border border-emerald-800/60'
                    }`}
                  />
                  <span
                    className={
                      uiPhysicsState.greenLedBrightness > 0.01
                        ? 'text-emerald-300 font-bold'
                        : 'text-slate-500'
                    }
                  >
                    LED Xanh (Φ↓)
                  </span>
                </span>

                <span className="text-slate-700">|</span>

                <span
                  className={`font-bold ${
                    Math.abs(uiPhysicsState.needleAngleDeg) < 0.5
                      ? 'text-slate-300'
                      : uiPhysicsState.needleAngleDeg > 0
                        ? 'text-rose-400'
                        : 'text-sky-400'
                  }`}
                >
                  G:{' '}
                  {uiPhysicsState.needleAngleDeg > 0.4
                    ? `+${uiPhysicsState.needleAngleDeg.toFixed(1)}°`
                    : uiPhysicsState.needleAngleDeg < -0.4
                      ? `${uiPhysicsState.needleAngleDeg.toFixed(1)}°`
                      : '0.0°'}
                </span>

                <span className="text-slate-700">|</span>

                <button
                  type="button"
                  onClick={() => setGalvAutoFaceCamera((prev) => !prev)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold border transition-colors cursor-pointer ${
                    galvAutoFaceCamera
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Tự động xoay mặt đồng hồ điện kế G đối diện hướng nhìn của bạn"
                >
                  {galvAutoFaceCamera ? 'G: Tự quay (BẬT)' : 'G: Tự quay'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGalvAutoFaceCamera(false);
                    setGalvAngleDeg((prev) => {
                      const next = prev + 45;
                      return next > 180 ? next - 360 : next;
                    });
                  }}
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-sans font-semibold text-slate-200 hover:text-amber-300 inline-flex items-center gap-0.5 cursor-pointer"
                  title="Xoay đồng hồ điện kế G 360° (hoặc kéo núm vàng trên đỉnh đồng hồ 3D)"
                >
                  <RefreshCw className="w-2.5 h-2.5 text-amber-400" />
                  <span>Xoay 360°</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleAddLogSnapshot()}
                className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-md transition-all"
                title="Lưu ngay thông số hiện tại vào Bảng Nhật ký Thí nghiệm để so sánh"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Ghi nhật ký</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTopTelemetry(false)}
                className="bg-slate-950/90 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer shadow-md"
                title="Ẩn dòng chữ và thông số phía trên để xem trọn mô phỏng"
              >
                <ChevronUp className="w-3 h-3 text-sky-400" />
                <span>Ẩn chữ</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute top-1.5 left-28 z-10 pointer-events-auto">
            <button
              type="button"
              onClick={() => setShowTopTelemetry(true)}
              className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-300 hover:text-white inline-flex items-center gap-1 cursor-pointer shadow"
            >
              <ChevronDown className="w-3 h-3 text-sky-400" />
              <span>Hiện thông số & LED</span>
            </button>
          </div>
        ))}

        {/* NGĂN KÉO TRƯỢT CHO CÁC CHỨC NĂNG BỔ TRỢ */}
        {activeDrawer !== null && activeDrawer !== 'schematic2d' && (
          <aside
            className={`absolute right-2.5 top-10 bottom-16 z-20 ${
              activeDrawer === 'logbook'
                ? 'w-[calc(100vw-20px)] md:w-[780px] max-w-[95vw]'
                : 'w-[calc(100vw-20px)] sm:w-[390px]'
            } bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto`}
            aria-label="Bảng thông tin và cài đặt thí nghiệm"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveDrawer('logbook')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 shrink-0 ${
                    activeDrawer === 'logbook'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Nhật ký</span>
                  {logEntries.length > 0 && (
                    <span className="text-[9px] px-1 rounded-full bg-amber-400 text-slate-950 font-bold">
                      {logEntries.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawer('explanation')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
                    activeDrawer === 'explanation'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Giải thích
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawer('controls')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
                    activeDrawer === 'controls'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cài đặt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawer('predictions')}
                  className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
                    activeDrawer === 'predictions'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dự đoán (4)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Đóng</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {activeDrawer === 'explanation' && (
                <>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
                    <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Giải thích hiện tượng tức thời (Faraday–Lenz)</span>
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {interpretation.detailedExplanation}
                    </p>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                    <h4 className="font-semibold text-slate-100">
                      Trạng thái Vật lí & Bộ 2 Đèn LED Ngược Cực
                    </h4>
                    <div className="divide-y divide-slate-800/80">
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-400">2 LED song song ngược cực:</span>
                        <span className="font-semibold text-amber-300 text-right">
                          {interpretation.ledStatusLabel}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-400">Trạng thái:</span>
                        <span className="font-semibold text-slate-100 text-right">
                          {interpretation.motionStatusLabel}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-400">Độ lớn từ thông |Φ|:</span>
                        <span className="font-semibold text-slate-100">
                          {interpretation.fluxMagnitudeTrend}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-400">Từ thông đại số (+X):</span>
                        <span className="font-mono font-semibold text-sky-400">
                          {interpretation.algebraicFluxTrend}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-400">Cực cảm ứng mặt trái cuộn dây:</span>
                        <span className="font-semibold text-slate-100">
                          {interpretation.lenzCoilFacePole}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-400">Tác dụng từ (Định luật Lenz):</span>
                        <span className="font-medium text-amber-300 text-right">
                          {interpretation.lenzForceAction}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-400">Chiều dòng điện quy ước:</span>
                        <span className="font-medium text-slate-200 text-right">
                          {interpretation.currentDirectionLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeDrawer === 'controls' && (
                <div className="space-y-3 text-xs">
                  {/* Điều khiển xoay 360° & Tự động hướng mặt Điện kế G về phía người xem */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-amber-300 text-xs">
                        Đồng hồ Điện kế kim G (Xoay 360°)
                      </h4>
                      <span className="font-mono text-[11px] text-slate-300">
                        Góc: {galvAngleDeg}°
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGalvAutoFaceCamera((prev) => !prev)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer flex items-center justify-between ${
                        galvAutoFaceCamera
                          ? 'bg-amber-950/80 border-amber-500 text-amber-100'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>Tự động quay đối diện hướng xem</span>
                      <span className="font-mono">
                        {galvAutoFaceCamera ? 'ĐANG BẬT' : 'TẮT'}
                      </span>
                    </button>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Xoay 360° thủ công (-180° .. +180°):</span>
                        <span className="text-amber-300 font-mono">{galvAngleDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={galvAngleDeg}
                        onChange={(e) => {
                          setGalvAutoFaceCamera(false);
                          setGalvAngleDeg(parseInt(e.target.value, 10));
                        }}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[
                          { label: '-90°', val: -90 },
                          { label: 'Chuẩn (-24°)', val: -24 },
                          { label: '0° Thẳng', val: 0 },
                          { label: '+90°', val: 90 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setGalvAutoFaceCamera(false);
                              setGalvAngleDeg(preset.val);
                            }}
                            className="px-1.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isExp1 ? (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                      <h4 className="font-semibold text-slate-100 text-xs">
                        Thông số Nam châm vĩnh cửu (TN1)
                      </h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Tốc độ chạy tự động:</span>
                          <span className="font-mono text-sky-400">
                            {params.autoSpeedMultiplier.toFixed(1)}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={2.2}
                          step={0.2}
                          value={params.autoSpeedMultiplier}
                          onChange={(e) =>
                            setParams((prev) => ({
                              ...prev,
                              autoSpeedMultiplier: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-sky-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                      <h4 className="font-semibold text-slate-100 text-xs">
                        Thông số Nam châm điện (TN2)
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setParams((prev) => ({
                              ...prev,
                              hasIronCore: !prev.hasIronCore,
                            }))
                          }
                          className={`px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer ${
                            params.hasIronCore
                              ? 'bg-sky-950 border-sky-500 text-sky-100'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          Lõi sắt từ: {params.hasIronCore ? 'CÓ' : 'KHÔNG'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setParams((prev) => ({
                              ...prev,
                              batteryPolarity: prev.batteryPolarity === 1 ? -1 : 1,
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-slate-100 cursor-pointer"
                        >
                          Cực nguồn DC: {params.batteryPolarity === 1 ? '+ / −' : '− / +'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                    <h4 className="font-semibold text-slate-100 text-xs">
                      Ẩn / Hiện các lớp hiển thị
                    </h4>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowFieldLines((prev) => !prev)}
                        className={`px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer flex items-center justify-between ${
                          showFieldLines
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>Đường sức từ</span>
                        <span className="font-mono">{showFieldLines ? 'HIỆN' : 'ẨN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCurrentParticles((prev) => !prev)}
                        className={`px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer flex items-center justify-between ${
                          showCurrentParticles
                            ? 'bg-amber-950/70 border-amber-500 text-amber-100'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>Hạt dòng điện</span>
                        <span className="font-mono">
                          {showCurrentParticles ? 'HIỆN' : 'ẨN'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShow3DLabels((prev) => !prev)}
                        className={`px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer flex items-center justify-between ${
                          show3DLabels
                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-100'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>Nhãn chỉ dẫn 3D</span>
                        <span className="font-mono">{show3DLabels ? 'HIỆN' : 'ẨN'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTopTelemetry((prev) => !prev)}
                        className={`px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer flex items-center justify-between ${
                          showTopTelemetry
                            ? 'bg-sky-950/80 border-sky-500 text-sky-100'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span>Thanh thông số trên</span>
                        <span className="font-mono">
                          {showTopTelemetry ? 'HIỆN' : 'ẨN'}
                        </span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setParams((prev) => ({
                            ...prev,
                            wiringSign: prev.wiringSign === 1 ? -1 : 1,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-slate-200 cursor-pointer flex items-center justify-between"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowLeftRight className="w-3 h-3 text-sky-400" />
                          <span>Đấu dây hai cọc Điện kế G:</span>
                        </span>
                        <span className="font-mono text-sky-300">
                          {params.wiringSign === 1 ? 'Chuẩn (+)' : 'Đảo hai đầu dây (−)'}
                        </span>
                      </button>

                      <div className="grid grid-cols-1 gap-2 pt-1">
                        <label className="flex flex-col gap-1 text-slate-400">
                          <span>Hàm từ thông (TN1):</span>
                          <select
                            value={params.fluxModel}
                            onChange={(e) =>
                              setParams((prev) => ({
                                ...prev,
                                fluxModel: e.target.value as FluxModelMode,
                              }))
                            }
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 font-medium"
                          >
                            <option value="qualitative">
                              Chế độ A: Định tính chuẩn hóa (Mặc định)
                            </option>
                            <option value="dipole">
                              Chế độ B: Xấp xỉ lưỡng cực từ dọc trục
                            </option>
                          </select>
                        </label>

                        <label className="flex flex-col gap-1 text-slate-400">
                          <span>Mô hình mạch thứ cấp:</span>
                          <select
                            value={params.secondaryCircuitMode}
                            onChange={(e) =>
                              setParams((prev) => ({
                                ...prev,
                                secondaryCircuitMode: e.target
                                  .value as SecondaryCircuitMode,
                              }))
                            }
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-200 font-medium"
                          >
                            <option value="resistive">
                              Thuần trở lớp học (I = E / R)
                            </option>
                            <option value="rl">Mạch RL thứ cấp có độ tự cảm</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDrawer === 'predictions' && (
                <PredictionQuiz
                  state={uiPhysicsState}
                  params={params}
                  onTriggerScenario={handleTriggerQuizScenario}
                />
              )}

              {activeDrawer === 'logbook' && (
                <div className="h-full flex flex-col -m-3">
                  <ExperimentLogbook
                    entries={logEntries}
                    onAddCurrentSnapshot={() => handleAddLogSnapshot()}
                    onUpdateNote={handleUpdateLogNote}
                    onDeleteEntry={handleDeleteLogEntry}
                    onClearAll={handleClearAllLogs}
                    onClose={() => setActiveDrawer(null)}
                    currentPreview={{
                      velocity: uiPhysicsState.magnetVelocity ?? 0,
                      fluxMWb: uiPhysicsState.fluxPerTurn * 1000,
                      dPhiDtMWb: uiPhysicsState.dPhiDt * 1000,
                      emf: uiPhysicsState.emf,
                      currentMA: uiPhysicsState.secondaryCurrent * 1000,
                      needleAngle: uiPhysicsState.needleAngleDeg,
                      activeLed:
                        (uiPhysicsState.redLedBrightness ?? 0) > 0.05
                          ? 'red'
                          : (uiPhysicsState.greenLedBrightness ?? 0) > 0.05
                            ? 'green'
                            : 'none',
                      elevationY:
                        params.experiment === 'permanent_magnet'
                          ? uiPhysicsState.magnetY ?? 0
                          : uiPhysicsState.coilY ?? 0,
                    }}
                  />
                </div>
              )}
            </div>
          </aside>
        )}

        {/* 3. THANH ĐIỀU KHIỂN DƯỚI ĐÁY THU GỌN TỐI ĐA (COMPACT COLLAPSIBLE BOTTOM DOCK) */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-3xl pointer-events-auto">
          <div className="flex justify-center mb-0.5">
            <button
              type="button"
              onClick={() => setIsDockCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-t-lg bg-slate-900/95 border border-b-0 border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer shadow"
            >
              {isDockCollapsed ? (
                <>
                  <ChevronUp className="w-3 h-3 text-sky-400" />
                  <span>Hiện điều khiển (H)</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 text-sky-400" />
                  <span>Ẩn điều khiển (H)</span>
                </>
              )}
            </button>
          </div>

          {!isDockCollapsed && (
            <div className="bg-slate-900/95 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-2xl space-y-1.5">
              {isExp1 ? (
                <div className="space-y-1.5">
                  {/* Điều khiển 3D Nam châm vĩnh cửu */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleToggleLiftMagnet}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          (uiPhysicsState.magnetY ?? 0) > 0.04
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                        }`}
                        title="Nhấc nam châm lên không gian 3D để xem toàn diện đường sức từ hoặc hạ lại xuống bàn"
                      >
                        {(uiPhysicsState.magnetY ?? 0) > 0.04 ? (
                          <>
                            <ArrowDownToLine className="w-3.5 h-3.5 text-white" />
                            <span>Hạ nam châm xuống bàn</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpToLine className="w-3.5 h-3.5 text-amber-400" />
                            <span>Nhấc nam châm lên 3D</span>
                          </>
                        )}
                      </button>

                      {(uiPhysicsState.magnetY ?? 0) > 0.04 ? (
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                          Nam châm 3D: Y={(uiPhysicsState.magnetY ?? 0).toFixed(2)}m · Z={(uiPhysicsState.magnetZ ?? 0).toFixed(2)}m
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          (Nắm vòng vàng trên nam châm để nhấc 3D · Rà gần bàn tự hít)
                        </span>
                      )}
                    </div>

                    {(uiPhysicsState.magnetY ?? 0) > 0.04 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-300 font-medium">Y:</span>
                          <input
                            type="range"
                            min={0}
                            max={2.5}
                            step={0.05}
                            value={uiPhysicsState.magnetY ?? 0}
                            onChange={(e) =>
                              handleMagnetElevationChange(parseFloat(e.target.value))
                            }
                            className="w-18 sm:w-24 h-1.5 accent-amber-500 cursor-pointer"
                            title="Độ cao nhấc nam châm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-300 font-medium">Z:</span>
                          <input
                            type="range"
                            min={-1.5}
                            max={1.5}
                            step={0.05}
                            value={uiPhysicsState.magnetZ ?? 0}
                            onChange={(e) =>
                              handleMagnetDepthChange(parseFloat(e.target.value))
                            }
                            className="w-16 sm:w-20 h-1.5 accent-sky-500 cursor-pointer"
                            title="Độ sâu trục Z nam châm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Điều khiển 3D Cuộn dây cảm ứng (Ống dây) */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleToggleLiftCoil}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          (uiPhysicsState.coilY ?? 0) > 0.04
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                        }`}
                        title="Nhấc ống dây lên không gian 3D để quan sát từ thông xuyên qua tiết diện ống dây"
                      >
                        {(uiPhysicsState.coilY ?? 0) > 0.04 ? (
                          <>
                            <ArrowDownToLine className="w-3.5 h-3.5 text-white" />
                            <span>Hạ ống dây xuống bệ</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpToLine className="w-3.5 h-3.5 text-amber-400" />
                            <span>Nhấc ống dây lên 3D</span>
                          </>
                        )}
                      </button>

                      {(uiPhysicsState.coilY ?? 0) > 0.04 ? (
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                          Ống dây 3D: Y={(uiPhysicsState.coilY ?? 0).toFixed(2)}m · Z={(uiPhysicsState.coilZ ?? 0).toFixed(2)}m
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          (Nắm núm vàng trên ống dây để nhấc 3D · Dây tự co giãn)
                        </span>
                      )}

                      {((uiPhysicsState.magnetY ?? 0) > 0.04 || (uiPhysicsState.coilY ?? 0) > 0.04) && (
                        <button
                          type="button"
                          onClick={handlePlaceBothOnTable}
                          className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 font-bold text-[10px] cursor-pointer inline-flex items-center gap-1"
                          title="Hạ đồng thời cả nam châm và ống dây gắn vào đúng bệ trên bàn"
                        >
                          <span>✨ Đặt cả 2 về bệ bàn</span>
                        </button>
                      )}
                    </div>

                    {(uiPhysicsState.coilY ?? 0) > 0.04 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-300 font-medium">Y:</span>
                          <input
                            type="range"
                            min={0}
                            max={2.5}
                            step={0.05}
                            value={uiPhysicsState.coilY ?? 0}
                            onChange={(e) =>
                              handleCoilElevationChange(parseFloat(e.target.value))
                            }
                            className="w-18 sm:w-24 h-1.5 accent-amber-500 cursor-pointer"
                            title="Độ cao nhấc ống dây"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-300 font-medium">Z:</span>
                          <input
                            type="range"
                            min={-1.5}
                            max={1.5}
                            step={0.05}
                            value={uiPhysicsState.coilZ ?? 0}
                            onChange={(e) =>
                              handleCoilDepthChange(parseFloat(e.target.value))
                            }
                            className="w-16 sm:w-20 h-1.5 accent-sky-500 cursor-pointer"
                            title="Độ sâu trục Z ống dây"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thanh trượt kéo vị trí ngang X trên bàn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-2 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800">
                      <span className="text-[11px] font-semibold text-sky-400 whitespace-nowrap">
                        ◄ Nam châm X:
                      </span>
                      <input
                        type="range"
                        min={MAGNET_MIN_X}
                        max={Math.min(MAGNET_MAX_X, uiPhysicsState.coilX - 1.1)}
                        step={0.015}
                        value={uiPhysicsState.magnetX}
                        onChange={(e) =>
                          handleMagnetSliderChange(parseFloat(e.target.value))
                        }
                        className="w-full h-1.5 accent-sky-500 cursor-pointer"
                        aria-label="Thanh trượt kéo vị trí nam châm"
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800">
                      <span className="text-[11px] font-semibold text-amber-400 whitespace-nowrap">
                        ◄ Ống dây X:
                      </span>
                      <input
                        type="range"
                        min={uiPhysicsState.magnetX + 1.1}
                        max={2.4}
                        step={0.015}
                        value={uiPhysicsState.coilX}
                        onChange={(e) =>
                          handleCoilSliderChange(parseFloat(e.target.value))
                        }
                        className="w-full h-1.5 accent-amber-500 cursor-pointer"
                        aria-label="Thanh trượt kéo vị trí ống dây"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-amber-400">
                      Mạch sơ cấp:
                    </span>
                    <span className="font-mono text-slate-200">
                      Ip={uiPhysicsState.primaryCurrent.toFixed(2)}A · dIp/dt=
                      {uiPhysicsState.dIpDt >= 0
                        ? `+${uiPhysicsState.dIpDt.toFixed(2)}`
                        : uiPhysicsState.dIpDt.toFixed(2)}
                      A/s
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setParams((prev) => ({
                        ...prev,
                        hasIronCore: !prev.hasIronCore,
                      }))
                    }
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
                  >
                    Lõi sắt: {params.hasIronCore ? 'Đang đặt' : 'Đã rút'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  {isExp1 ? (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleRun}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold min-h-[30px] transition-colors cursor-pointer ${
                          isRunning
                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <Pause className="w-3 h-3" />
                            <span>Tạm dừng</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            <span>Tự động</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickMoveMagnet('closer')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-semibold min-h-[30px] cursor-pointer"
                        title="Kéo nam châm lại gần cuộn dây (Từ thông tăng -> Đèn Đỏ sáng)"
                      >
                        Kéo tới (Đỏ) →
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickMoveMagnet('farther')}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-semibold min-h-[30px] cursor-pointer"
                        title="Kéo nam châm lùi ra xa cuộn dây (Từ thông giảm -> Đèn Xanh sáng)"
                      >
                        ← Kéo lui (Xanh)
                      </button>

                      <button
                        type="button"
                        onClick={handleFlipPolarity}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-semibold min-h-[30px] cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-sky-400" />
                        <span>
                          Đảo cực ({params.magnetPolarity === 1 ? 'N gần' : 'S gần'})
                        </span>
                      </button>

                      {(uiPhysicsState.magnetY ?? 0) > 0.04 && (
                        <button
                          type="button"
                          onClick={handlePlaceMagnetOnTable}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold min-h-[30px] cursor-pointer shadow-sm"
                          title="Hạ và đặt lại nam châm về bệ đỡ trên bàn"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>Đặt lại lên bàn</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleToggleElectromagnetSwitch}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold min-h-[30px] transition-colors cursor-pointer ${
                        params.switchClosed
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>
                        {params.switchClosed
                          ? 'Ngắt Khóa K (Φ giảm · Đèn Xanh)'
                          : 'Đóng Khóa K (Φ tăng · Đèn Đỏ)'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold min-h-[30px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleGameMode}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold min-h-[30px] transition-all cursor-pointer ${
                      isGameMode
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md'
                        : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>{isGameMode ? 'Rời thử thách' : '🎮 Chế độ Trò chơi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleDrawerTab('logbook')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold min-h-[30px] transition-all cursor-pointer ${
                      activeDrawer === 'logbook'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nhật ký</span>
                    {logEntries.length > 0 && (
                      <span className="px-1 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                        {logEntries.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span className="hidden sm:inline">
                    Mọi thiết bị (Nam châm, Cuộn dây, Bộ 2 LED, Điện kế) đều nắm kéo dời được trên bàn
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <VerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        isSoftwareGl={isSoftwareGl}
        fullscreenSupportStatus={fullscreenNote}
      />
    </div>
  );
}
