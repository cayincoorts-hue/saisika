interface Props {
  summary: any;
}

export default function InputSummaryCard({ summary }: Props) {
  if (!summary) return null;
  return (
    <div className="card">
      <div className="card-title">数据概况</div>
      <div className="grid-3">
        <div><strong>{summary.total_files || summary.file_count || 0}</strong><br /><small style={{ color: 'var(--color-muted)' }}>文件数</small></div>
        <div><strong>{summary.row_count || 0}</strong><br /><small style={{ color: 'var(--color-muted)' }}>数据行</small></div>
        <div><strong>{summary.node_count || 0}</strong><br /><small style={{ color: 'var(--color-muted)' }}>节点</small></div>
      </div>
    </div>
  );
}
