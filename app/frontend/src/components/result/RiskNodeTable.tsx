import { useRef, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import gsap from '../../utils/animations';

interface Props {
  data: any;
}

const RISK_COLORS: Record<string, string> = {
  high: 'var(--color-risk-high)',
  medium: 'var(--color-risk-mid)',
  low: 'var(--color-risk-low)',
};

const RISK_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const COLS = '1fr 0.9fr 0.6fr 0.7fr 2.2fr 2fr';

const ANIM_STYLE = `
.hf-rnt-row {
  transform-origin: center center;
}
.cause-tag {
  display: inline-block;
  padding: 2px 6px;
  margin: 2px;
  border-radius: 4px;
  font-size: 0.78rem;
  cursor: pointer;
  background: #f0f0f0;
  transition: background 0.2s;
}
.cause-tag:hover { background: #e0e0e0; }
.cause-detail-popover {
  position: fixed;
  background: white;
  border: 1px solid var(--color-hairline);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.8rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  z-index: 9999;
  max-width: 320px;
  line-height: 1.6;
}
@keyframes riskDotPulseHigh {
  0%, 100% { box-shadow: 0 0 0 0 rgba(198,69,69,0.5); transform: scale(1); }
  50% {  box-shadow: 0 0 8px 3px rgba(198,69,69,0.3); transform: scale(1.4); }
}
@keyframes riskDotPulseMedium {
  0%, 100% { box-shadow: 0 0 0 0 rgba(243,156,18,0.45); transform: scale(1); }
  50% {  box-shadow: 0 0 6px 2px rgba(243,156,18,0.25); transform: scale(1.25); }
}
@keyframes riskDotPulseLow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(39,174,96,0.35); transform: scale(1); }
  50% {  box-shadow: 0 0 4px 1px rgba(39,174,96,0.18); transform: scale(1.15); }
}
.risk-dot-high    { animation: riskDotPulseHigh 1.8s ease-in-out infinite; }
.risk-dot-medium  { animation: riskDotPulseMedium 2.4s ease-in-out infinite; }
.risk-dot-low     { animation: riskDotPulseLow 3s ease-in-out infinite; }
`;

export default function RiskNodeTable({ data }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevActiveRef = useRef<number | null>(null);
  const activeTweensRef = useRef<gsap.core.Tween[]>([]);
  const [activeCause, setActiveCause] = useState<{ row: number; causeIdx: number; x: number; y: number } | null>(null);

  // 清理动画
  useEffect(() => {
    return () => {
      activeTweensRef.current.forEach((t) => t.kill());
    };
  }, []);

  const animateRows = useCallback((clientY: number) => {
    const list = listRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>('[data-rn-index]');
    if (rows.length === 0) return;

    let bestIdx = 0;
    let bestDist = Infinity;
    rows.forEach((row, i) => {
      const rect = row.getBoundingClientRect();
      const cy = rect.top + rect.height / 2;
      const d = Math.abs(clientY - cy);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });

    if (bestIdx === prevActiveRef.current) return;
    prevActiveRef.current = bestIdx;

    // 停止所有活跃的动画
    activeTweensRef.current.forEach((t) => t.kill());
    activeTweensRef.current = [];

    rows.forEach((row, i) => {
      const dist = Math.abs(bestIdx - i);
      const scale = dist === 0 ? 1 : dist === 1 ? 0.97 : dist === 2 ? 0.94 : 0.9;
      const opacity = dist === 0 ? 1 : dist === 1 ? 0.72 : dist === 2 ? 0.45 : 0.2;
      const isActive = i === bestIdx;

      const tween = gsap.to(row, {
        scaleY: scale,
        autoAlpha: opacity,
        backgroundColor: isActive ? 'rgba(198,69,69,0.05)' : 'transparent',
        borderLeftColor: isActive ? 'var(--color-risk-high)' : 'transparent',
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      activeTweensRef.current.push(tween);
    });
  }, []);

  const resetRows = useCallback(() => {
    prevActiveRef.current = null;
    activeTweensRef.current.forEach((t) => t.kill());
    activeTweensRef.current = [];
    const list = listRef.current;
    if (!list) return;
    const rows = list.querySelectorAll<HTMLElement>('[data-rn-index]');
    rows.forEach((row) => {
      gsap.to(row, {
        scaleY: 1,
        autoAlpha: 1,
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  }, []);

  if (!data || data.status === 'unavailable' || data.status === 'error') {
    return (
      <div className="card" style={{} as CSSProperties}>
        <div className="card-title">高风险节点</div>
        <div className={`notice notice-${data?.status === 'error' ? 'error' : 'warning'}`}>
          {data?.missing_reason || '暂无高风险节点数据'}
        </div>
      </div>
    );
  }

  const nodes = data.rows || data.nodes || [];

  return (
    <div className="card" style={{ position: 'relative' } as CSSProperties}>
      <style>{ANIM_STYLE}</style>
      <div className="card-title">
        高风险节点
        {data.status === 'limited' && (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-limited)', marginLeft: 8 }}>（数据受限）</span>
        )}
      </div>
      {nodes.length === 0 ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>未检测到中高风险节点</p>
      ) : (
        <div style={{ overflow: 'hidden', border: '1px solid var(--color-hairline)', borderRadius: 8 }}>
          {/* header */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS,
            background: 'var(--color-surface-card)',
            borderBottom: '2px solid var(--color-hairline)',
          }}>
            {['节点ID', '动作类型', '风险等级', '风险评分', '主要原因', '建议动作'].map(h => (
              <div key={h} style={{ padding: '8px 12px', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{h}</div>
            ))}
          </div>

          {/* rows */}
          <div
            ref={listRef}
            onMouseMove={e => animateRows(e.clientY)}
            onMouseLeave={() => { resetRows(); }}
          >
            {nodes.map((n: any, i: number) => (
              <div
                key={i}
                data-rn-index={i}
                className="hf-rnt-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  borderBottom: '1px solid var(--color-hairline)',
                  borderLeft: '3px solid transparent',
                }}
              >
                <div style={{ padding: '8px 12px', whiteSpace: 'nowrap', alignSelf: 'center', fontWeight: 500 }}>
                  {n.node_name || n.node_id}
                </div>
                <div style={{ padding: '8px 12px', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: '0.78rem',
                    background: ({ '补货': '#fdebd0', '转单': '#d5f5e3', '切换供应商': '#fadbd8', '调整运输路径': '#d6eaf8', '核查波动原因': '#fef9e7', '加强监控': '#eaf2f8', '维持现状': '#ecf0f1' } as Record<string, string>)[n.action_type] || '#ecf0f1',
                  }}>
                    {n.action_type || '—'}
                  </span>
                </div>
                <div style={{ padding: '8px 12px', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                  <span
                    className={`risk-dot-${n.risk_level || 'low'}`}
                    style={{
                      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                      background: RISK_COLORS[n.risk_level] || 'var(--color-unavailable)',
                      marginRight: 6,
                    }}
                  />
                  {RISK_LABELS[n.risk_level] || n.risk_level}
                </div>
                <div style={{ padding: '8px 12px', whiteSpace: 'nowrap', alignSelf: 'center', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {(n.risk_score ?? 0).toFixed(3)}
                </div>
                <div style={{ padding: '8px 12px', fontSize: '0.8rem', alignSelf: 'center', position: 'relative' }}>
                  {(n.risk_causes || []).map((cause: string, ci: number) => {
                    const detail = n.risk_causes_detail?.[ci];
                    return (
                      <span key={ci}>
                        <span
                          className="cause-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeCause?.row === i && activeCause?.causeIdx === ci) {
                              setActiveCause(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveCause({ row: i, causeIdx: ci, x: rect.left, y: rect.bottom });
                            }
                          }}
                        >
                          {cause}
                        </span>
                        {activeCause?.row === i && activeCause?.causeIdx === ci && detail && (
                          <span className="cause-tag-active" />
                        )}
                      </span>
                    );
                  })}
                  {(!n.risk_causes || n.risk_causes.length === 0) && '—'}
                </div>
                <div style={{ padding: '8px 12px', fontSize: '0.8rem', alignSelf: 'center' }}>
                  {n.recommended_action || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.status === 'limited' && data.missing_reason && (
        <div className="notice notice-warning" style={{ marginTop: 12 }}>{data.missing_reason}</div>
      )}

      {/* Portal 弹窗：渲染到 body 级别，不受表格滚动/层级限制 */}
      {activeCause && nodes[activeCause.row]?.risk_causes_detail?.[activeCause.causeIdx] &&
        createPortal(
          <div
            className="cause-detail-popover"
            style={{
              top: Math.min(activeCause.y + 6, window.innerHeight - 140),
              left: Math.min(activeCause.x, window.innerWidth - 330),
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div>触发指标：{nodes[activeCause.row].risk_causes_detail[activeCause.causeIdx].triggered_by}</div>
            <div>实际值：{nodes[activeCause.row].risk_causes_detail[activeCause.causeIdx].actual_value}</div>
            <div>阈值：{nodes[activeCause.row].risk_causes_detail[activeCause.causeIdx].threshold}</div>
            {nodes[activeCause.row].risk_causes_detail[activeCause.causeIdx].excess_ratio && (
              <div style={{ color: 'var(--color-risk-high)', fontWeight: 600 }}>
                超出阈值 {nodes[activeCause.row].risk_causes_detail[activeCause.causeIdx].excess_ratio}%
              </div>
            )}
          </div>,
          document.body
        )}

      {/* 点击弹窗外部关闭 — 用 mousedown 避免和 click 事件冒泡冲突 */}
      {activeCause &&
        createPortal(
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onMouseDown={() => setActiveCause(null)}
          />,
          document.body
        )}
    </div>
  );
}
