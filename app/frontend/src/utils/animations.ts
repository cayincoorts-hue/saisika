/**
 * GSAP 动画系统 — Saisca v5 Minimalist
 *
 * Ultra-subtle motion: invisible but present.
 * Scroll-reveal with IntersectionObserver, micro hover effects.
 */

import gsap from "gsap";

gsap.defaults({ duration: 0.6, ease: "power2.out" });

let _reduceMotion = false;
try { _reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch {}
export function shouldAnimate(): boolean { return !_reduceMotion; }

// ── 页面入场：卡片依次淡入 ──────────────────────────────────

export function staggerCards(container: HTMLElement, extra?: gsap.TweenVars) {
  const cards = container.querySelectorAll<HTMLElement>(".card, .reveal-card, [data-reveal]");
  if (cards.length === 0) return;
  if (!shouldAnimate()) { gsap.set(cards, { autoAlpha: 1, y: 0 }); return; }
  gsap.fromTo(cards, { autoAlpha: 0, y: 16 }, {
    autoAlpha: 1, y: 0, duration: 0.6,
    stagger: { each: 0.08, from: "start" },
    ease: "power2.out", ...extra,
  });
}

export function fadeInUp(el: HTMLElement, delay: number = 0) {
  if (!shouldAnimate()) { gsap.set(el, { autoAlpha: 1, y: 0 }); return; }
  gsap.fromTo(el, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, delay, duration: 0.5, ease: "power2.out" });
}

// ── 数字跳动 ────────────────────────────────────────────────

export function countUp(el: HTMLElement, from: number, to: number, decimals: number = 0) {
  const obj = { val: from };
  gsap.to(obj, { val: to, duration: 0.8, ease: "power2.out", onUpdate: () => { el.textContent = obj.val.toFixed(decimals); } });
}

// ── 表格行悬浮 ──────────────────────────────────────────────

export function highlightRow(row: HTMLElement) {
  gsap.to(row, { backgroundColor: "var(--color-bg-soft)", borderLeftColor: "var(--color-text-strong)", duration: 0.2, ease: "power2.out" });
}
export function dimRow(row: HTMLElement) {
  gsap.to(row, { backgroundColor: "transparent", borderLeftColor: "transparent", duration: 0.3, ease: "power2.out" });
}

// ── 风险脉冲（极简）─────────────────────────────────────────

export function pulseRisk(_el: HTMLElement, _level: "high" | "medium" | "low") {}

// ── Scroll Reveal ───────────────────────────────────────────

let _observer: IntersectionObserver | null = null;
function getObserver(): IntersectionObserver {
  if (!_observer) {
    _observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          if (!shouldAnimate()) { gsap.set(el, { autoAlpha: 1, y: 0 }); }
          else { gsap.fromTo(el, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }); }
          _observer?.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });
  }
  return _observer;
}
export function observeScroll(el: HTMLElement) { getObserver().observe(el); }
export function unobserveScroll(el: HTMLElement) { _observer?.unobserve(el); }

// ── React Hook ──────────────────────────────────────────────

import { useEffect, useRef } from "react";
export function useReveal(delay: number = 0) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!shouldAnimate()) { gsap.set(el, { autoAlpha: 1 }); return; }
    const tween = gsap.fromTo(el, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, delay, duration: 0.6, ease: "power2.out" });
    return () => { tween.kill(); };
  }, [delay]);
  return ref;
}

export default gsap;
