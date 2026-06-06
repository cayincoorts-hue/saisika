import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  batchId: string;
  hasResults: boolean;
}

export default function DownloadPanel({ batchId, hasResults }: Props) {
  const { t } = useTranslation();

  return (
    <div className="card reveal-card" style={{ '--reveal-delay': '860ms' } as CSSProperties}>
      <div className="card-title">{t('download.title')}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a
          href={`/api/results/${batchId}`}
          className={`btn ${hasResults ? 'btn-primary' : 'btn-outline'}`}
          style={{ textDecoration: 'none', display: 'inline-block', pointerEvents: hasResults ? 'auto' : 'none', opacity: hasResults ? 1 : 0.5 }}
          download
        >
          {t('download.downloadJson')}
        </a>
        <button className="btn btn-outline" disabled>
          {t('download.downloadReport')}
        </button>
        <button className="btn btn-outline" disabled>
          {t('download.exportExcel')}
        </button>
      </div>
    </div>
  );
}
