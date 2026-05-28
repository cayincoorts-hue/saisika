import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import gsap, { shouldAnimate } from '../../utils/animations';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function PageShell({ children, className = '', style }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = shellRef.current;
    if (!el || !shouldAnimate()) return;

    // 卡片依次入场：更明显的位移 + 缩放
    const cards = el.querySelectorAll<HTMLElement>(
      ".card, [data-reveal], .page-header"
    );

    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 36, scale: 0.96 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.55,
          stagger: { each: 0.07, from: "start" },
          ease: "power3.out",
        }
      );
    }
  }, []);

  return (
    <div ref={shellRef} className={`page-shell ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
