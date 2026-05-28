import MappingStatusBadge from './MappingStatusBadge';

interface Props {
  unmet: string[];
  canGenerate: Record<string, boolean>;
}

export default function RequiredFieldPanel({ unmet, canGenerate }: Props) {
  const charts = [
    { key: 'risk_trend', label: '风险趋势图' },
    { key: 'risk_distribution', label: '风险分布图' },
    { key: 'high_risk_nodes', label: '高风险节点表' },
    { key: 'propagation_timeline', label: '传播时序图' },
    { key: 'data_confidence', label: '数据可信度' },
  ];

  return (
    <div className="card">
      <div className="card-title">实时反馈</div>
      {unmet.length > 0 && (
        <div className="notice notice-warning" style={{ marginBottom: 12 }}>
          缺失必填字段：{unmet.join('、')}
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
