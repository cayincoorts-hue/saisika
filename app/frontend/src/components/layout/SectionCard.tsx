import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import gsap from '../../utils/animations';

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}

export default function SectionCard({ title, children, className = '', style, delay = 0 }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    const cleanup = mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { reduceMotion } = ctx.conditions!;
        if (reduceMotion) {
          gsap.set(el, { autoAlpha: 1 });
          return;
        }
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 24, scale: 0.98 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            delay: delay / 1000,
            duration: 0.5,
            ease: "power2.out",
          }
        );
      }
    );

    return () => {
      cleanup.revert();
      mm.revert();
    };
  }, [delay]);

  return (
    <div
      ref={cardRef}
      className={`card ${className}`.trim()}
      style={{ opacity: 0, ...style }}
    >
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  );
}
