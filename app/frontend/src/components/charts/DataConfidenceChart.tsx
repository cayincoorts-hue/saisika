import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
}

export default function DataConfidenceChart({ data }: Props) {
  const { t } = useTranslation();

  if (!data) return <div className="notice notice-warning">{t('dataConfidence.noData')}</div>;

  const coverage = data.field_coverage || {};
  const capabilities = data.capability_status || {};
  const level = data.confidence_level || 'unknown';
  const messages = data.messages || [];

  const levelLabel: Record<string, string> = { high: t('riskNodeTable.levels.high'), medium: t('riskNodeTable.levels.medium'), low: t('riskNodeTable.levels.low'), unknown: t('common.unknown') };
  const levelColor: Record<string, string> = { high: 'var(--color-ok)', medium: 'var(--color-limited)', low: 'var(--color-error)', unknown: 'var(--color-unavailable)' };

  return (
    <div>
      <div className="stagger-item" style={{ textAlign: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '2rem', fontWeight: 'bold', color: levelColor[level] }}>{levelLabel[level]}</span>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{t('dataConfidence.title')}</p>
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: 8 }}>{t('dataConfidence.coverageStatus')}</h4>
          {Object.entries(coverage).map(([key, info]: [string, any], i) => (
            <div
              key={key}
              className="stagger-item"
              style={{
                '--item-delay': `${120 + i * 55}ms`,
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: '0.85rem',
              } as CSSProperties}
            >
              <span>{info.label}</span>
              <span style={{ color: info.available ? 'var(--color-ok)' : 'var(--color-error)' }}>{info.available ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: 8 }}>{t('dataConfidence.availableCharts')}</h4>
          {Object.entries(capabilities).map(([key, info]: [string, any], i) => (
            <div
              key={key}
              className="stagger-item"
              style={{
                '--item-delay': `${180 + i * 55}ms`,
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: '0.85rem',
              } as CSSProperties}
            >
              <span>{info.label}</span>
              <span style={{ color: info.available ? 'var(--color-ok)' : 'var(--color-unavailable)' }}>{info.available ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      </div>
      {messages.length > 0 && (
        <div className="notice notice-info">
          {messages.map((m: string, i: number) => <p key={i} style={{ fontSize: '0.85rem' }}>{m}</p>)}
        </div>
      )}
    </div>
  );
}
