import MappingStatusBadge from './MappingStatusBadge';

interface FieldMapping { original_column: string; mapped_field: string; status: string; sample_values: string[]; confidence: number; }

interface Props {
  mappings: FieldMapping[];
  unmetRequirements: string[];
  canStart: boolean;
  onStart: () => void;
}

export default function FieldMappingTable({ mappings, unmetRequirements, canStart, onStart }: Props) {
  const requiredFields = ['time', 'node_id', 'node_name', 'node_type'];

  return (
    <div>
      {unmetRequirements.length > 0 && (
        <div className="notice notice-warning">
          <strong>缺失关键字段：</strong>{unmetRequirements.join('、')}
          <br />请确认字段映射后再开始分析。
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: 'var(--color-surface-card)' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>原始列名</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>识别结果</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>状态</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>样例值</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m, i) => {
            const isRequired = requiredFields.includes(m.mapped_field);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: isRequired && m.status !== 'identified' ? 'var(--color-surface-soft)' : undefined }}>
                <td style={{ padding: '8px 12px' }}>
                  {m.original_column}
                  {isRequired && <span style={{ color: 'var(--color-error)', marginLeft: 4, fontSize: '0.75rem' }}>必填</span>}
                </td>
                <td style={{ padding: '8px 12px' }}>{m.mapped_field || '—'}</td>
                <td style={{ padding: '8px 12px' }}><MappingStatusBadge status={m.status} /></td>
                <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--color-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.sample_values?.slice(0, 3).join(', ') || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button className="btn btn-primary" disabled={!canStart} onClick={onStart}>
          确认并开始分析
        </button>
      </div>
    </div>
  );
}
