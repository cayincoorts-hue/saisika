import type { ReactNode } from 'react';
import { useReveal } from '../../utils/animations';

interface Props {
  title?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** 导览定位标记：渲染为 data-tour="..." */
  dataTour?: string;
}

export default function SectionCard({ title, children, className = '', delay = 0, dataTour }: Props) {
  const cardRef = useReveal(delay / 1000);

  return (
    <div ref={cardRef} className={`card ${className}`.trim()} {...(dataTour ? { 'data-tour': dataTour } : {})}>
      {title && (
        <div className="card-header">
          <span className="card-title">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
