import type { CSSProperties, ReactNode } from 'react';

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}

export default function SectionCard({ title, children, className = '', style, delay = 0 }: Props) {
  return (
    <div
      className={`card reveal-card ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms`, ...style } as CSSProperties}
    >
      {title && <div className="card-title">{title}</div>}
      {children}
    </div>
  );
}
