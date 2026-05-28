interface NodeInfo {
  id: string;
  name: string;
  level: number;
  risk_level: string;
  risk_score: number;
  in_degree: number;
  out_degree: number;
  _degree: number;
}

interface Props {
  nodes: NodeInfo[];
  highlightNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

const RISK_COLORS: Record<string, string> = {
  high: '#c64545',
  medium: '#e8a55a',
  low: '#5db872',
};

const RISK_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export default function NodeConnectivityTable({ nodes, highlightNodeId, onSelectNode }: Props) {
  const sorted = [...nodes].sort((a, b) => b._degree - a._degree);

  return (
    <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{
            background: 'var(--color-surface-cream-strong)',
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            <th style={thStyle}>排名</th>
            <th style={thStyle}>节点名称</th>
            <th style={thStyle}>层级</th>
            <th style={thStyle}>风险等级</th>
            <th style={thStyle}>风险评分</th>
            <th style={thStyle}>上游连接</th>
            <th style={thStyle}>下游连接</th>
            <th style={thStyle}>总连接数</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((n, i) => {
            const isSelected = highlightNodeId === n.id;
            return (
              <tr
                key={n.id}
                onClick={() => onSelectNode(isSelected ? null : n.id)}
                style={{
                  borderBottom: '1px solid var(--color-hairline)',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(204,120,92,0.08)' : i % 2 === 0 ? 'transparent' : 'rgba(230,223,216,0.25)',
                  transition: 'background 0.68s var(--motion-smooth), transform 0.68s var(--motion-smooth), box-shadow 0.68s var(--motion-smooth)',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(204,120,92,0.05)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                  e.currentTarget.style.boxShadow = 'inset 16px 0 26px rgba(204,120,92,0.05)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(230,223,216,0.25)';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <td style={tdStyle}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: RISK_COLORS[n.risk_level] || 'var(--color-unavailable)',
                    marginRight: 8,
                  }} />
                  {n.name}
                  {isSelected && (
                    <span style={{
                      marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-primary)',
                    }}>
                      ← 聚焦中
                    </span>
                  )}
                </td>
                <td style={tdStyle}>L{n.level}</td>
                <td style={tdStyle}>{RISK_LABELS[n.risk_level] || n.risk_level}</td>
                <td style={tdStyle}>{n.risk_score.toFixed(3)}</td>
                <td style={{
                  ...tdStyle,
                  color: n.in_degree > 10 ? 'var(--color-primary)' : undefined,
                }}>
                  {n.in_degree}
                </td>
                <td style={{
                  ...tdStyle,
                  color: n.out_degree > 10 ? 'var(--color-primary)' : undefined,
                }}>
                  {n.out_degree}
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{n._degree}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--color-hairline)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  whiteSpace: 'nowrap',
};
