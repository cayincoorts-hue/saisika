import { useTranslation } from 'react-i18next';

export default function MappingStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const label: Record<string, string> = { identified: t('mapping.status.identified'), pending: t('mapping.status.pending'), unrecognized: t('mapping.status.unrecognized') };
  const cls: Record<string, string> = { identified: 'badge-ok', pending: 'badge-pending', unrecognized: 'badge-error' };
  return <span className={`badge ${cls[status] || 'badge-unavailable'}`}>{label[status] || status}</span>;
}
