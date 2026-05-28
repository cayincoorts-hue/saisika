import type { ReactNode } from 'react';

interface Props {
  status: 'ok' | 'limited' | 'unavailable' | 'error';
  missingReason?: string;
  children: ReactNode;
}

export default function ChartStateBlock({ status, missingReason, children }: Props) {
  if (status === 'error') return <div className="notice notice-error">{missingReason || '该图表生成失败'}</div>;
  if (status === 'unavailable') return <div className="notice notice-warning">{missingReason || '数据不足，无法生成此图表'}</div>;
  return (
    <div className="chart-reveal">
      {children}
      {status === 'limited' && <div className="notice notice-warning" style={{ marginTop: 8 }}>{missingReason || '数据有限，图表仅供参考'}</div>}
    </div>
  );
}
