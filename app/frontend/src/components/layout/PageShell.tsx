import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function PageShell({ children, className = '', style }: Props) {
  return <div className={`page-shell page-enter ${className}`.trim()} style={style}>{children}</div>;
}
