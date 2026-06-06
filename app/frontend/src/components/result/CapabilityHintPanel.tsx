import { useTranslation } from 'react-i18next';

interface Props {
  dataConfidence: any;
}

interface SupplementItem {
  missing: string;
  impact: string;
  unlocks: string;
}

export default function CapabilityHintPanel({ dataConfidence }: Props) {
  const { t } = useTranslation();

  if (!dataConfidence) return null;

  const messages: string[] = dataConfidence.messages || [];
  const supplementMap: SupplementItem[] = dataConfidence.supplement_map || [];
  const capabilities = dataConfidence.capability_status || {};

  const unavailableCharts = Object.entries(capabilities)
    .filter(([, info]: [string, any]) => !info.available)
    .map(([, info]: [string, any]) => info.label);

  if (messages.length === 0 && unavailableCharts.length === 0 && supplementMap.length === 0) return null;

  return (
    <div className="card">
      <div className="card-title">{t('capabilityHintPanel.title')}</div>

      {unavailableCharts.length > 0 && (
        <div className="notice notice-warning" style={{ marginBottom: 12 }}>
          <strong>{t('capabilityHintPanel.unavailableCharts')}：</strong>{unavailableCharts.join('、')}
        </div>
      )}

      {supplementMap.length > 0 && (
        <div style={{ marginBottom: 12, overflow: 'hidden', border: '1px solid var(--color-hairline)', borderRadius: 8 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.8fr',
            background: 'var(--color-surface-card)', borderBottom: '1px solid var(--color-hairline)',
          }}>
            {[t('dataConfidence.missingField'), t('dataConfidence.currentImpact'), t('dataConfidence.unlocks')].map(h => (
              <div key={h} style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.82rem' }}>{h}</div>
            ))}
          </div>
          {supplementMap.map((item, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.8fr',
              borderBottom: i < supplementMap.length - 1 ? '1px solid var(--color-hairline)' : 'none',
              fontSize: '0.8rem',
            }}>
              <div style={{ padding: '8px 12px', color: 'var(--color-risk-high)' }}>{item.missing}</div>
              <div style={{ padding: '8px 12px', color: 'var(--color-limited)' }}>{item.impact}</div>
              <div style={{ padding: '8px 12px', color: 'var(--color-ok)' }}>{item.unlocks}</div>
            </div>
          ))}
        </div>
      )}

      {messages.length > 0 && supplementMap.length === 0 && (
        <div className="notice notice-info">
          {messages.map((m: string, i: number) => (
            <p key={i} style={{ fontSize: '0.85rem', marginBottom: 4 }}>{m}</p>
          ))}
        </div>
      )}

      <ul style={{ fontSize: '0.85rem', color: 'var(--color-muted)', paddingLeft: 20 }}>
        <li>{t('capabilityHintPanel.hint1')}</li>
        <li>{t('capabilityHintPanel.hint2')}</li>
        <li>{t('capabilityHintPanel.hint3')}</li>
      </ul>
    </div>
  );
}
