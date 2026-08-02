import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { tourSteps } from '../../demo/tourSteps';
import { useDemoTour } from '../../demo/useDemoTour';

/**
 * 导览讲解条 — 显示当前步骤的讲解文字。
 * - aria-live="polite"：屏幕阅读器可朗读
 * - GSAP 淡入淡出切换
 */
export default function TourCaption() {
  const { t } = useTranslation();
  const { status, stepIndex } = useDemoTour();
  const ref = useRef<HTMLDivElement>(null);
  const prevKeyRef = useRef<string>('');

  const step = tourSteps[stepIndex];
  const caption = step ? t(step.captionKey) : '';

  useEffect(() => {
    const el = ref.current;
    if (!el || !caption) return;
    if (prevKeyRef.current !== caption) {
      prevKeyRef.current = caption;
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' },
      );
    }
  }, [caption]);

  if (status === 'idle' || status === 'complete') return null;

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '88px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        maxWidth: '640px',
        width: 'calc(100% - 48px)',
        padding: '14px 20px',
        borderRadius: '12px',
        background: 'rgba(15, 118, 110, 0.95)',
        color: '#fff',
        fontSize: '15px',
        lineHeight: 1.6,
        boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
        textAlign: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      {caption}
    </div>
  );
}
