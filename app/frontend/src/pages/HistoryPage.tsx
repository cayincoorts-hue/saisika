import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/layout/PageShell';
import TopNotice from '../components/layout/TopNotice';
import { getHistory, deleteHistory } from '../utils/api';

interface HistoryRecord {
  batch_id: string;
  generated_at: string;
  node_count: number;
  file_count: number;
  files?: string[];
}

const ANIM_STYLE = `
@keyframes hf-fade-up {
  from { opacity: 0; clip-path: inset(0 0 100% 0); }
  to   { opacity: 1; clip-path: inset(0 0 0 0); }
}
@keyframes hf-slide-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(-32px); }
}
@keyframes hf-scale-in {
  from { opacity: 0; clip-path: inset(0 0 100% 0); }
  to   { opacity: 1; clip-path: inset(0 0 0 0); }
}
.hf-enter-row {
  animation: hf-fade-up 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) backwards;
}
.hf-enter-card {
  animation: hf-scale-in 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}
.hf-enter-header {
  animation: hf-fade-up 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) backwards;
}
.hf-row-cell {
  transform-origin: center center;
  transition: transform 0.78s var(--motion-smooth),
              opacity 0.78s var(--motion-smooth),
              background 0.72s var(--motion-smooth),
              border-left-color 0.72s var(--motion-smooth),
              box-shadow 0.72s var(--motion-smooth);
}
`;

const COLS = '1.6fr 1.2fr 0.6fr 0.6fr 0.7fr';

function proximity(activeIndex: number, rowIndex: number): number {
  const dist = Math.abs(rowIndex - activeIndex);
  if (dist === 0) return 1;
  if (dist === 1) return 0.78;
  if (dist === 2) return 0.48;
  if (dist === 3) return 0.2;
  if (dist === 4) return 0.06;
  return 0.03;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());

  const listRef = useRef<HTMLDivElement>(null);
  const prevActiveRef = useRef<number | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError('');
    getHistory()
      .then(setRecords)
      .catch(err => setError(err?.detail || err?.message || '加载历史记录失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const animateRows = useCallback((clientY: number) => {
    const list = listRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>('[data-row-index]');
    if (rows.length === 0) return;

    let bestIdx = 0;
    let bestDist = Infinity;

    rows.forEach((row, i) => {
      const rect = row.getBoundingClientRect();
      const cy = rect.top + rect.height / 2;
      const d = Math.abs(clientY - cy);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });

    if (bestIdx === prevActiveRef.current) return;
    prevActiveRef.current = bestIdx;

    rows.forEach((row, i) => {
      const s = proximity(bestIdx, i);
      row.style.transform = `scaleY(${s})`;
      row.style.opacity = `${Math.max(0.06, s)}`;
      row.style.background = i === bestIdx ? 'rgba(204,120,92,0.06)' : 'transparent';
      row.style.borderLeftColor = i === bestIdx ? 'var(--color-primary)' : 'transparent';
      row.style.boxShadow = i === bestIdx ? 'inset 18px 0 28px rgba(204,120,92,0.06)' : 'none';
    });
  }, []);

  const resetRows = useCallback(() => {
    prevActiveRef.current = null;
    const list = listRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>('[data-row-index]');
    rows.forEach(row => {
      row.style.transform = 'scaleY(1)';
      row.style.opacity = '1';
      row.style.background = 'transparent';
      row.style.borderLeftColor = 'transparent';
      row.style.boxShadow = 'none';
    });
  }, []);

  const handleDelete = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确认删除批次 ${batchId} 的分析结果和上传文件？`)) return;

    setDeleting(batchId);
    setAnimatingOut(prev => new Set(prev).add(batchId));

    try {
      await deleteHistory(batchId);
      setTimeout(() => {
        setRecords(prev => prev.filter(r => r.batch_id !== batchId));
        setAnimatingOut(prev => {
          const next = new Set(prev);
          next.delete(batchId);
          return next;
        });
      }, 500);
    } catch {
      setError('删除失败，请重试');
      setAnimatingOut(prev => {
        const next = new Set(prev);
        next.delete(batchId);
        return next;
      });
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <PageShell>
      <style>{ANIM_STYLE}</style>

      <div className="page-header hf-enter-header">
        <h1>分析历史</h1>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          共 {records.length} 条记录
        </span>
      </div>

      <TopNotice type="error" message={error} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="loading-spinner" style={{ width: 24, height: 24 }} />
          <p style={{ marginTop: 12, color: 'var(--color-muted)' }}>加载中...</p>
        </div>
      ) : records.length === 0 && animatingOut.size === 0 ? (
        <div className="card hf-enter-card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--color-muted)', marginBottom: 16 }}>暂无历史分析记录</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            开始新分析
          </button>
        </div>
      ) : (
        <div className="card hf-enter-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* header */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS,
            background: 'var(--color-surface-cream-strong)',
            borderBottom: '2px solid var(--color-hairline)',
          }}>
            {['批次 ID', '分析时间', '文件数', '节点数', '操作'].map(h => (
              <div key={h} style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{h}</div>
            ))}
          </div>

          {/* rows */}
          <div
            ref={listRef}
            onMouseMove={e => animateRows(e.clientY)}
            onMouseLeave={resetRows}
          >
            {records.map((r, i) => {
              const isOut = animatingOut.has(r.batch_id);
              return (
                <div
                  key={r.batch_id}
                  data-row-index={i}
                  className="hf-enter-row hf-row-cell"
                  onClick={() => navigate(`/result/${r.batch_id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: COLS,
                    cursor: isOut ? 'default' : 'pointer',
                    borderBottom: '1px solid var(--color-hairline)',
                    borderLeft: '3px solid transparent',
                    animationDelay: `${i * 0.08}s`,
                    ...(isOut
                      ? { animation: 'hf-slide-out 0.5s cubic-bezier(0.55, 0, 1, 0.45) both', pointerEvents: 'none' as any }
                      : {}),
                  }}
                >
                  <div style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontWeight: 600, fontFamily: 'var(--font-mono)', alignSelf: 'center' }}>
                    {r.batch_id}
                  </div>
                  <div style={{ padding: '12px 16px', whiteSpace: 'nowrap', alignSelf: 'center' }}>{formatDate(r.generated_at)}</div>
                  <div style={{ padding: '12px 16px', whiteSpace: 'nowrap', alignSelf: 'center' }}>{r.file_count ?? r.files?.length ?? '—'}</div>
                  <div style={{ padding: '12px 16px', whiteSpace: 'nowrap', alignSelf: 'center' }}>{r.node_count || '—'}</div>
                  <div style={{ padding: '12px 16px', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                    <button
                      className="btn btn-outline"
                      onClick={e => handleDelete(r.batch_id, e)}
                      disabled={deleting === r.batch_id}
                      style={{
                        fontSize: '0.8rem', padding: '4px 12px',
                        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s cubic-bezier(0.22, 0.61, 0.36, 1)',
                      }}
                    >
                      {deleting === r.batch_id ? '...' : '删除'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    </PageShell>
  );
}
