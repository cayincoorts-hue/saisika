interface Props {
  dataConfidence: any;
}

interface SupplementItem {
  missing: string;
  impact: string;
  unlocks: string;
}

export default function CapabilityHintPanel({ dataConfidence }: Props) {
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
      <div className="card-title">数据能力提示</div>

      {unavailableCharts.length > 0 && (
        <div className="notice notice-warning" style={{ marginBottom: 12 }}>
          <strong>当前无法生成的图表：</strong>{unavailableCharts.join('、')}
        </div>
      )}

      {supplementMap.length > 0 && (
        <div style={{ marginBottom: 12, overflow: 'hidden', border: '1px solid var(--color-hairline)', borderRadius: 8 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.8fr',
            background: 'var(--color-surface-card)', borderBottom: '1px solid var(--color-hairline)',
          }}>
            {['缺少字段', '当前影响', '补充后可解锁'].map(h => (
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
        <li>补充更多字段可提升分析可信度</li>
        <li>补充节点关系字段可生成传播路径图</li>
        <li>补充业务说明可帮助系统更准确理解数据</li>
      </ul>
    </div>
  );
}
