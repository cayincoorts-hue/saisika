import { useTranslation } from 'react-i18next';

interface Props {
  summary: any;
}

export default function InputSummaryCard({ summary }: Props) {
  const { t } = useTranslation();
  if (!summary) return null;
  return (
    <div className="card">
      <div className="card-title">{t('confirm.fileSummary')}</div>
      <div className="grid-3">
        <div><strong>{summary.total_files || summary.file_count || 0}</strong><br /><small style={{ color: 'var(--color-muted)' }}>{t('result.files')}</small></div>
        <div><strong>{summary.row_count || 0}</strong><br /><small style={{ color: 'var(--color-muted)' }}>{t('result.dataRows')}</small></div>
        <div><strong>{summary.node_count || 0}</strong><br /><small style={{ color: 'var(--color-muted)' }}>{t('result.nodes')}</small></div>
      </div>
    </div>
  );
}
