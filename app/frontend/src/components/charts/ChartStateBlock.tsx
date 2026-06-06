import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  status: 'ok' | 'limited' | 'unavailable' | 'error';
  missingReason?: string;
  children: ReactNode;
}

export default function ChartStateBlock({ status, missingReason, children }: Props) {
  const { t } = useTranslation();

  if (status === 'error') return <div className="notice notice-error">{missingReason || t('chartState.reasonError')}</div>;
  if (status === 'unavailable') return <div className="notice notice-warning">{missingReason || t('chartState.reasonUnavailable')}</div>;
  return (
    <div className="chart-reveal">
      {children}
      {status === 'limited' && <div className="notice notice-warning" style={{ marginTop: 8 }}>{missingReason || t('chartState.reasonLimited')}</div>}
    </div>
  );
}
