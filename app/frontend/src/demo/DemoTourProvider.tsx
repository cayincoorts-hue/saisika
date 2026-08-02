import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { tourSteps, TOUR_TOTAL_MS } from './tourSteps';

/**
 * 无声导览状态机 — idle | playing | paused | complete
 *
 * - 自动播放：进入某一步 → 导航到该步骤路由 → 定位 [data-tour] 目标并高亮
 * - 停留 durationMs 后自动进入下一步
 * - 用户任何交互（点击/键盘）自动暂停，避免打扰
 * - reduced-motion：滚动与动画降级为瞬间完成
 * - 目标缺失时有限重试（2 秒），仍找不到则暂停，让用户自由查看
 */

export type TourStatus = 'idle' | 'playing' | 'paused' | 'complete';

export interface DemoTourContextValue {
  status: TourStatus;
  stepIndex: number;
  totalSteps: number;
  totalMs: number;
  isReducedMotion: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  exit: () => void;
}

const DemoTourContext = createContext<DemoTourContextValue | null>(null);

export { DemoTourContext };

const MAX_TARGET_RETRIES = 10;
const TARGET_RETRY_MS = 200;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function DemoTourProvider({
  children,
  autoStart = false,
}: {
  children: React.ReactNode;
  autoStart?: boolean;
}) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TourStatus>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(prefersReducedMotion);

  const statusRef = useRef<TourStatus>('idle');
  const stepIndexRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const focusElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  // ── 工具：清除定时器 / 移除高亮 ───────────────────────────

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const removeFocus = useCallback(() => {
    if (focusElRef.current) {
      gsap.killTweensOf(focusElRef.current);
      focusElRef.current.classList.remove('tour-focus');
      focusElRef.current = null;
    }
  }, []);

  // ── 高亮目标：滚动定位 + 焦点样式 + GSAP 入场 ──────────────

  const focusTarget = useCallback(
    (selector: string) => {
      removeFocus();
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return false;
      el.scrollIntoView({ behavior: isReducedMotion ? 'auto' : 'smooth', block: 'center' });
      el.classList.add('tour-focus');
      focusElRef.current = el;
      if (!isReducedMotion) {
        // 入场淡入 + 高亮框闪烁 3 下（亮→淡→亮→淡→亮→稳）
        gsap.fromTo(
          el,
          { autoAlpha: 0.85 },
          { autoAlpha: 1, duration: 0.45, ease: 'power2.out', overwrite: 'auto' },
        );
        gsap.timeline({ repeat: 2, yoyo: false, overwrite: 'auto' })
          .to(el, { outlineColor: '#0f766e', duration: 0.12, ease: 'none' })
          .to(el, { outlineColor: 'rgba(15, 118, 110, 0.25)', duration: 0.16, ease: 'none' });
        // 3 次闪烁结束后，恢复稳定高亮色
        gsap.to(el, { outlineColor: '#0f766e', duration: 0.25, delay: 1.2, ease: 'none' });
      }
      return true;
    },
    [isReducedMotion, removeFocus],
  );

  // ── 目标查找：有限重试，找不到则暂停 ───────────────────────
  // 用函数声明实现递归（声明提升），避免 hooks 自引用 lint 问题。

  function findAndFocus(step: (typeof tourSteps)[number], attempt = 0) {
    const el = document.querySelector<HTMLElement>(step.target);
    if (el) {
      focusTarget(step.target);
      // 步骤声明的动作：派发全局事件，让目标组件自行响应（如展开）
      if (step.action === 'expand') {
        window.dispatchEvent(new CustomEvent('saiska:tour-expand'));
      }
      return;
    }
    if (attempt >= MAX_TARGET_RETRIES) {
      setStatus('paused');
      return;
    }
    const t = window.setTimeout(() => findAndFocus(step, attempt + 1), TARGET_RETRY_MS);
    timersRef.current.push(t);
  }

  // ── 状态控制 ──────────────────────────────────────────────

  const start = useCallback(() => {
    setStepIndex(0);
    setStatus('playing');
  }, []);

  const pause = useCallback(() => {
    setStatus((s) => (s === 'playing' ? 'paused' : s));
  }, []);

  const resume = useCallback(() => {
    setStatus((s) => (s === 'paused' ? 'playing' : s));
  }, []);

  const next = useCallback(() => {
    const i = stepIndexRef.current;
    if (statusRef.current === 'complete') return;
    if (i + 1 >= tourSteps.length) {
      removeFocus();
      setStatus('complete');
      return;
    }
    setStepIndex(i + 1);
  }, [removeFocus]);

  const previous = useCallback(() => {
    if (statusRef.current === 'idle' || statusRef.current === 'complete') return;
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const exit = useCallback(() => {
    clearTimers();
    removeFocus();
    setStatus('idle');
    setStepIndex(0);
  }, [clearTimers, removeFocus]);

  // ── 步骤进入：导航 + 定位目标 ──────────────────────────────
  // findAndFocus 为函数声明（声明提升），读取的是最新闭包状态，
  // 无需列入依赖数组。

  useEffect(() => {
    if (status !== 'playing' && status !== 'paused') return;
    const step = tourSteps[stepIndex];
    if (!step) return;
    navigate(step.route);
    const t = window.setTimeout(() => findAndFocus(step), 400);
    return () => {
      window.clearTimeout(t);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stepIndex, navigate, clearTimers]);

  // ── 自动推进：playing 状态按步骤时长走 ──────────────────────

  useEffect(() => {
    if (status !== 'playing') return;
    const step = tourSteps[stepIndex];
    if (!step) return;
    const t = window.setTimeout(() => next(), step.durationMs);
    return () => window.clearTimeout(t);
  }, [status, stepIndex, next]);

  // ── 用户交互自动暂停 ───────────────────────────────────────

  useEffect(() => {
    if (status !== 'playing') return;
    const onInteract = () => {
      if (statusRef.current === 'playing') setStatus('paused');
    };
    window.addEventListener('pointerdown', onInteract);
    window.addEventListener('keydown', onInteract);
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, [status]);

  // ── reduced-motion 变化监听 ───────────────────────────────

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setIsReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── 自动启动（可选）────────────────────────────────────────

  useEffect(() => {
    if (!autoStart) return;
    const t = window.setTimeout(() => start(), 1200);
    return () => window.clearTimeout(t);
  }, [autoStart, start]);

  const value = useMemo<DemoTourContextValue>(
    () => ({
      status,
      stepIndex,
      totalSteps: tourSteps.length,
      totalMs: TOUR_TOTAL_MS,
      isReducedMotion,
      start,
      pause,
      resume,
      next,
      previous,
      exit,
    }),
    [status, stepIndex, isReducedMotion, start, pause, resume, next, previous, exit],
  );

  return <DemoTourContext.Provider value={value}>{children}</DemoTourContext.Provider>;
}
