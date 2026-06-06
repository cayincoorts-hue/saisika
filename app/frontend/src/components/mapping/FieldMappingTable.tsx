import { useTranslation } from 'react-i18next';
import MappingStatusBadge from './MappingStatusBadge';

interface FieldMapping { original_column: string; mapped_field: string; status: string; sample_values: string[]; confidence: number; }

interface Props {
  mappings: FieldMapping[];
  unmetRequirements: string[];
  canStart: boolean;
  onStart: () => void;
}

export default function FieldMappingTable({ mappings, unmetRequirements, canStart, onStart }: Props) {
  const { t } = useTranslation();
  const requiredFields = ['time', 'node_id', 'node_name', 'node_type'];

  return (
    <div>
      {unmetRequirements.length > 0 && (
        <div className="notice notice-warning">
          <strong>{t('mapping.missingRequired')}：</strong>{unmetRequirements.join('、')}
          <br />{t('mapping.mappingHint')}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ background: 'var(--color-surface-card)' }}>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('mapping.originalColumn')}</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('mapping.standardField')}</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('mapping.statusLabel')}</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>{t('mapping.sampleValues')}</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m, i) => {
            const isRequired = requiredFields.includes(m.mapped_field);
            return (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: isRequired && m.status !== 'identified' ? 'var(--color-surface-soft)' : undefined }}>
                <td style={{ padding: '8px 12px' }}>
                  {m.original_column}
                  {isRequired && <span style={{ color: 'var(--color-error)', marginLeft: 4, fontSize: '0.75rem' }}>{t('mapping.requiredFields')}</span>}
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
          {t('mapping.confirmAnalyze')}
        </button>
      </div>
    </div>
  );
}
