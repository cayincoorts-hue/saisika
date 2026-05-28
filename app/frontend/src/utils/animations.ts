/**
 * GSAP 动画工具 — Saisca v1.3
 *
 * - gsap.matchMedia() 统一管理响应式和 reduced-motion
 * - 可复用动画函数，组件直接调用
 * - 所有动画自动适配无障碍偏好
 */

import gsap from "gsap";

// ── 全局默认值 ──────────────────────────────────────────────

gsap.defaults({
  duration: 0.6,
  ease: "power2.out",
});

// ── matchMedia（全局唯一实例）────────────────────────────────

let mm: gsap.MatchMedia | null = null;

function getMM(): gsap.MatchMedia {
  if (!mm) {
    mm = gsap.matchMedia();
  }
  return mm;
}

/** 销毁全局 matchMedia（组件卸载时调用） */
export function revertAll() {
  mm?.revert();
  mm = null;
}

// ── 条件常量 ─────────────────────────────────────────────────

export const MEDIA = {
  desktop: "(min-width: 800px)",
  mobile: "(max-width: 799px)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
};

// ── 卡片逐个入场 ────────────────────────────────────────────

/** 给容器内 .card 或 .reveal-card 元素依次入场 */
export function staggerCards(container: HTMLElement, extra?: gsap.TweenVars) {
  const cards = container.querySelectorAll<HTMLElement>(
    ".card, .reveal-card, [data-reveal]"
  );
  if (cards.length === 0) return;

  gsap.fromTo(
    cards,
    { autoAlpha: 0, y: 24 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.55,
      stagger: { each: 0.08, from: "start" },
      ease: "power2.out",
      ...extra,
    }
  );
}

// ── 单元素入场 ──────────────────────────────────────────────

export function fadeInUp(el: HTMLElement, delay: number = 0) {
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: 20 },
    { autoAlpha: 1, y: 0, delay, duration: 0.5, ease: "power2.out" }
  );
}

// ── 高风险脉冲 ──────────────────────────────────────────────

export function pulseRisk(
  el: HTMLElement,
  level: "high" | "medium" | "low"
) {
  const intensity = level === "high" ? 1 : level === "medium" ? 0.5 : 0;

  if (intensity === 0) return;

  gsap.to(el, {
    boxShadow: `0 0 ${8 * intensity}px rgba(198, 69, 69, ${0.4 * intensity})`,
    duration: 0.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}

// ── 数值跳动 ─────────────────────────────────────────────────

export function countUp(
  el: HTMLElement,
  from: number,
  to: number,
  decimals: number = 2
) {
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration: 0.8,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = obj.val.toFixed(decimals);
    },
  });
}

// ── 表格行悬浮 ──────────────────────────────────────────────

export function highlightRow(row: HTMLElement) {
  gsap.to(row, {
    scale: 1.01,
    backgroundColor: "rgba(198, 69, 69, 0.04)",
    borderLeftColor: "var(--color-risk-high)",
    duration: 0.3,
    ease: "power2.out",
  });
}

export function dimRow(row: HTMLElement) {
  gsap.to(row, {
    scale: 1,
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    duration: 0.3,
    ease: "power2.out",
  });
}

// ── React Hook：组件挂载时触发动画 ──────────────────────────

import { useEffect, useRef } from "react";

export function useReveal(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cleanup = getMM().add(
      {
        reduceMotion: MEDIA.reduceMotion,
      },
      (ctx) => {
        const { reduceMotion } = ctx.conditions!;
        if (reduceMotion) {
          gsap.set(el, { autoAlpha: 1 });
          return;
        }
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 20 },
          {
            autoAlpha: 1,
            y: 0,
            delay,
            duration: 0.5,
            ease: "power2.out",
          }
        );
      }
    );

    return () => cleanup.revert();
  }, [delay]);

  return ref;
}

export default gsap;
