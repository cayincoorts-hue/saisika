import { useTranslation } from 'react-i18next';
import MappingStatusBadge from './MappingStatusBadge';

interface Props {
  unmet: string[];
  canGenerate: Record<string, boolean>;
}

export default function RequiredFieldPanel({ unmet, canGenerate }: Props) {
  const { t } = useTranslation();
  const charts = [
    { key: 'risk_trend', label: t('result.riskTrend') },
    { key: 'risk_distribution', label: t('result.riskDistribution') },
    { key: 'high_risk_nodes', label: t('result.highRiskNodes') },
    { key: 'propagation_timeline', label: t('result.propagation') },
    { key: 'data_confidence', label: t('result.dataConfidence') },
  ];

  return (
    <div className="card">
      <div className="card-title">{t('mapping.realtimeFeedback')}</div>
      {unmet.length > 0 && (
        <div className="notice notice-warning" style={{ marginBottom: 12 }}>
          {t('mapping.missingRequired')}：{unmet.join('、')}
        </div>
      )}
      {charts.map(c => (
        <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.9rem' }}>
          <span>{c.label}</span>
          <MappingStatusBadge status={canGenerate[c.key] ? 'identified' : 'unrecognized'} />
        </div>
      ))}
    </div>
  );
}
