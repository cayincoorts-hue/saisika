export default function MappingStatusBadge({ status }: { status: string }) {
  const label: Record<string, string> = { identified: '已识别', pending: '待确认', unrecognized: '未识别' };
  const cls: Record<string, string> = { identified: 'badge-ok', pending: 'badge-pending', unrecognized: 'badge-error' };
  return <span className={`badge ${cls[status] || 'badge-unavailable'}`}>{label[status] || status}</span>;
}
