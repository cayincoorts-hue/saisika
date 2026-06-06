import { useTranslation } from 'react-i18next';

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

export default function NodeConnectivityTable({ nodes, highlightNodeId, onSelectNode }: Props) {
  const { t } = useTranslation();
  const sorted = [...nodes].sort((a, b) => b._degree - a._degree);

  return (
    <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{
            background: 'var(--color-surface-cream-strong)',
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            <th style={thStyle}>{t('nodeConnectivityTable.rank')}</th>
            <th style={thStyle}>{t('propagation.name')}</th>
            <th style={thStyle}>{t('propagation.tier')}</th>
            <th style={thStyle}>{t('propagation.riskLevel')}</th>
            <th style={thStyle}>{t('propagation.riskScore')}</th>
            <th style={thStyle}>{t('nodeConnectivityTable.upstream')}</th>
            <th style={thStyle}>{t('nodeConnectivityTable.downstream')}</th>
            <th style={thStyle}>{t('nodeConnectivityTable.totalConnections')}</th>
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
                      ← {t('nodeConnectivityTable.focused')}
                    </span>
                  )}
                </td>
                <td style={tdStyle}>L{n.level}</td>
                <td style={tdStyle}>{(() => { const m: Record<string, string> = { high: t('riskNodeTable.levels.high'), medium: t('riskNodeTable.levels.medium'), low: t('riskNodeTable.levels.low') }; return m[n.risk_level] || n.risk_level; })()}</td>
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
