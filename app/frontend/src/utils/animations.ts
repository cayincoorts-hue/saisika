/**
 * GSAP 动画系统 — Saisca v4 Ethereal Glass
 *
 * Premium agency-tier motion:
 * - Scroll-reveal with IntersectionObserver + blur dissolve
 * - Staggered page entrance with spring physics
 * - Magnetic button hover with internal kinetic tension
 * - Stat counter with elastic ease
 * - Glass card 3D tilt micro-interaction
 * - Respects prefers-reduced-motion via gsap.matchMedia()
 */

import gsap from "gsap";

// ── 全局默认 ──────────────────────────────────────────────────

gsap.defaults({ duration: 0.7, ease: "power3.out" });

// ── 无障碍判定 ─────────────────────────────────────────────────

let _reduceMotion = false;
try {
  _reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
} catch {}

export function shouldAnimate(): boolean {
  return !_reduceMotion;
}

export const MEDIA = {
  desktop: "(min-width: 800px)",
  mobile: "(max-width: 799px)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
};

// ── 页面入场：卡片依次浮现 + 模糊溶解 ────────────────────────

export function staggerCards(container: HTMLElement, extra?: gsap.TweenVars) {
  const cards = container.querySelectorAll<HTMLElement>(
    ".card, .reveal-card, [data-reveal]"
  );
  if (cards.length === 0) return;

  if (!shouldAnimate()) {
    gsap.set(cards, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
    return;
  }

  gsap.fromTo(
    cards,
    { autoAlpha: 0, y: 48, filter: "blur(6px)" },
    {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.8,
      stagger: { each: 0.1, from: "start" },
      ease: "power3.out",
      ...extra,
    }
  );
}

// ── 单元素弹入 ────────────────────────────────────────────────

export function fadeInUp(el: HTMLElement, delay: number = 0) {
  if (!shouldAnimate()) {
    gsap.set(el, { autoAlpha: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    el,
    { autoAlpha: 0, y: 32, filter: "blur(3px)" },
    { autoAlpha: 1, y: 0, filter: "blur(0px)", delay, duration: 0.65, ease: "back.out(1.4)" }
  );
}

// ── 统计卡片数字跳动（elastic 弹跳收尾）───────────────────────

export function countUp(el: HTMLElement, from: number, to: number, decimals: number = 0) {
  const obj = { val: from };
  gsap.to(obj, {
    val: to,
    duration: 1.2,
    ease: "power3.out",
    onUpdate: () => {
      el.textContent = obj.val.toFixed(decimals);
    },
  });
}

// ── 风险脉冲（柔和光晕版）─────────────────────────────────────

export function pulseRisk(el: HTMLElement, level: "high" | "medium" | "low") {
  const cfg: Record<string, { color: string; intensity: number }> = {
    high: { color: "rgba(255,92,114,", intensity: 1 },
    medium: { color: "rgba(255,179,71,", intensity: 0.6 },
    low: { color: "rgba(61,214,140,", intensity: 0.3 },
  };
  const c = cfg[level];
  if (!c || c.intensity === 0) return;

  gsap.to(el, {
    boxShadow: `0 0 ${10 * c.intensity}px ${c.color}${0.35 * c.intensity})`,
    duration: 1,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
}

// ── 表格行悬浮（微提 + 玻璃高亮）──────────────────────────────

export function highlightRow(row: HTMLElement) {
  gsap.to(row, {
    scale: 1.008,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderLeftColor: "var(--color-primary)",
    duration: 0.35,
    ease: "power2.out",
  });
}

export function dimRow(row: HTMLElement) {
  gsap.to(row, {
    scale: 1,
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    duration: 0.35,
    ease: "power2.out",
  });
}

// ── 按钮磁吸悬浮（group-hover 效果）───────────────────────────

export function magneticButton(btn: HTMLElement) {
  btn.addEventListener("mousemove", (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, {
      x: x * 0.15,
      y: y * 0.15,
      duration: 0.4,
      ease: "power2.out",
    });
  });
  btn.addEventListener("mouseleave", () => {
    gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  });
}

// ── 玻璃卡片 3D 微倾斜 ────────────────────────────────────────

export function glassTilt(card: HTMLElement) {
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, {
      rotationY: x * 2,
      rotationX: -y * 2,
      duration: 0.5,
      ease: "power2.out",
    });
  });
  card.addEventListener("mouseleave", () => {
    gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.6, ease: "power3.out" });
  });
}

// ── Scroll Reveal（IntersectionObserver）───────────────────────

let _scrollObserver: IntersectionObserver | null = null;

function getScrollObserver(): IntersectionObserver {
  if (!_scrollObserver) {
    _scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            if (!shouldAnimate()) {
              gsap.set(el, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
            } else {
              gsap.fromTo(
                el,
                { autoAlpha: 0, y: 36, filter: "blur(4px)" },
                {
                  autoAlpha: 1,
                  y: 0,
                  filter: "blur(0px)",
                  duration: 0.75,
                  ease: "power3.out",
                }
              );
            }
            _scrollObserver?.unobserve(el);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
  }
  return _scrollObserver;
}

export function observeScroll(el: HTMLElement) {
  getScrollObserver().observe(el);
}

export function unobserveScroll(el: HTMLElement) {
  _scrollObserver?.unobserve(el);
}

// ── React Hook：挂载入场 + ScrollReveal ───────────────────────

import { useEffect, useRef } from "react";

export function useReveal(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!shouldAnimate()) {
      gsap.set(el, { autoAlpha: 1 });
      return;
    }

    const tween = gsap.fromTo(
      el,
      { autoAlpha: 0, y: 40, scale: 0.96, filter: "blur(4px)" },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        delay,
        duration: 0.75,
        ease: "power3.out",
      }
    );

    return () => { tween.kill(); };
  }, [delay]);

  return ref;
}

export default gsap;
