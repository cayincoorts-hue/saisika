import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import gsap from '../../utils/animations';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function PageShell({ children, className = '', style }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add(
      { reduceMotion: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        const { reduceMotion } = ctx.conditions!;
        if (reduceMotion) {
          gsap.set(el, { autoAlpha: 1 });
          return;
        }

        // 页面入场：子元素逐个浮现
        gsap.set(el, { autoAlpha: 0 });
        gsap.to(el, {
          autoAlpha: 1,
          duration: 0.35,
          ease: "power2.out",
        });

        // 子卡片依次入场
        const cards = el.querySelectorAll<HTMLElement>(
          ".card, [data-reveal], .page-header"
        );
        if (cards.length > 0) {
          gsap.fromTo(
            cards,
            { autoAlpha: 0, y: 18 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.45,
              stagger: { each: 0.06, from: "start" },
              ease: "power2.out",
              delay: 0.1,
            }
          );
        }
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <div ref={shellRef} className={`page-shell ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
