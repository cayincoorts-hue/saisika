import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopNotice from '../components/layout/TopNotice';
import { getHistory, deleteHistory } from '../utils/api';

interface HistoryRecord {
  batch_id: string;
  generated_at: string;
  node_count: number;
  file_count: number;
  files?: string[];
}

const COLS = '1.4fr 1.2fr 0.6fr 0.6fr 0.5fr';

export default function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError('');
    getHistory()
      .then(setRecords)
      .catch(err => setError(err?.detail || err?.message || t('history.loadFailed')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t('history.deleteConfirm'))) return;
    setDeleting(batchId);
    try {
      await deleteHistory(batchId);
      setRecords(prev => prev.filter(r => r.batch_id !== batchId));
    } catch {
      setError(t('history.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch { return iso; }
  };

  return (
    <>
      <div className="page-header">
        <h1>{t('history.title')}</h1>
        <p>{t('history.totalRecords', { count: records.length })}</p>
      </div>

      <TopNotice type="error" message={error} />

      {loading ? (
        <div className="loading-page">
          <span className="loading-spinner loading-spinner-lg" />
          <span>{t('common.loading')}</span>
        </div>
      ) : records.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">{t('history.noHistory')}</div>
            <div className="empty-state-desc">{t('upload.dragDrop')}</div>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              {t('history.newAnalysis')}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <div className="table-header" style={{ gridTemplateColumns: COLS }}>
              {[t('history.batchId'), t('history.analysisTime'), t('history.fileCount'), t('history.nodeCount'), t('history.actions')].map(h => (
                <div key={h} className="table-header-cell">{h}</div>
              ))}
            </div>
            {records.map((r, i) => (
              <div
                key={r.batch_id}
                className="table-row stagger-item"
                onClick={() => navigate(`/result/${r.batch_id}`)}
                style={{
                  gridTemplateColumns: COLS,
                  '--item-delay': `${i * 60}ms`,
                } as React.CSSProperties}
              >
                <div className="table-cell" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {r.batch_id}
                </div>
                <div className="table-cell">{formatDate(r.generated_at)}</div>
                <div className="table-cell">{r.file_count ?? r.files?.length ?? '—'}</div>
                <div className="table-cell">{r.node_count || '—'}</div>
                <div className="table-cell">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={e => handleDelete(r.batch_id, e)}
                    disabled={deleting === r.batch_id}
                  >
                    {deleting === r.batch_id ? '...' : t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
