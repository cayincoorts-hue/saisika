import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { translateLabel } from '../../utils/labelTranslations';
import type { ScenarioParam, ScenarioChange } from './use-scenario-compare';

interface NodeEntry {
  nodeId: string;
  params: ScenarioParam[];
  loading: boolean;
}

interface Props {
  nodes: NodeEntry[];
  changes: ScenarioChange[];
  changedNodeIds: string[];
  error: string;
  onUpdateChange: (nodeId: string, param: string, toValue: number | string) => void;
  onResetNode: (nodeId: string) => void;
  onReset: () => void;
  onRunCompare: () => void;
  onClose: () => void;
}

const PARAM_LABEL_ZH: Record<string, string> = {
  supplier_count: '供应商数量',
  inventory_strategy: '库存策略',
  replenishment_frequency: '补货频率',
  transport_path: '运输路径',
};

const PARAM_LABEL_EN: Record<string, string> = {
  supplier_count: 'Supplier Count',
  inventory_strategy: 'Inventory Strategy',
  replenishment_frequency: 'Replenishment Freq.',
  transport_path: 'Transport Path',
};

const PARAM_KEYS = ['supplier_count', 'inventory_strategy', 'replenishment_frequency', 'transport_path'] as const;

export default function ScenarioPanel({
  nodes,
  changes,
  error,
  onUpdateChange,
  onReset,
  onRunCompare,
  onClose,
}: Props) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const pl = (k: string) => isZh ? (PARAM_LABEL_ZH[k] || k) : (PARAM_LABEL_EN[k] || k);
  const to = (v: string) => isZh ? v : translateLabel(v);
  const [animating, setAnimating] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setAnimating(true)); }, []);

  const hasChanges = changes.length > 0;

  const changeMap = useMemo(() => {
    const m: Record<string, Record<string, number | string>> = {};
    for (const c of changes) {
      (m[c.node_id] ??= {})[c.param] = c.to_value;
    }
    return m;
  }, [changes]);

  return (
    <aside
      aria-label={isZh ? "场景参数编辑" : "Scenario Parameters"}
      style={{
        width: 460,
        flexShrink: 0,
        background: 'var(--color-canvas)',
        borderLeft: '1px solid var(--color-hairline)',
        display: 'flex',
        flexDirection: 'column',
        opacity: animating ? 1 : 0,
        transition: 'opacity .15s',
        overflow: 'hidden',
        maxHeight: 'calc(100vh - 80px)',
      }}
    >
      {/* Top bar: title + close */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--color-hairline)' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-muted-soft)', letterSpacing: '.5px' }}>{isZh ? "尝试更改" : "Try Change"}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
            {isZh ? '修改参数后点击"对比运行"' : 'Modify parameters, then click "Compare"'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasChanges && <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>{changes.length} {isZh ? "项" : "items"}</span>}
          <button onClick={onClose} aria-label={isZh ? "关闭" : "Close"} style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>
      </div>

      {/* Error */}
      {error && <div style={{ background: 'var(--color-error)', color: '#fff', padding: '8px 14px', fontSize: 13 }}>{error}</div>}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {nodes.map(node => {
          const nm = changeMap[node.nodeId] || {};
          const nChanged = Object.keys(nm).length;

          return (
            <div key={node.nodeId} style={{
              borderBottom: '1px solid var(--color-hairline-soft)',
              background: nChanged ? 'var(--color-surface-soft)' : 'transparent',
            }}>
              {/* Node row */}
              <div style={{
                display: 'flex', alignItems: 'center',
                padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 80, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: nChanged ? 'var(--color-primary)' : 'var(--color-muted-soft)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', fontFamily: 'var(--font-mono)' }}>{node.nodeId}</span>
                </div>

                {node.loading ? (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>{[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 28, background: 'var(--color-hairline)', borderRadius: 4, animation: 'soft-pulse 1.6s infinite' }} />)}</div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                    {PARAM_KEYS.map(k => {
                      const p = node.params.find(pp => pp.name === k);
                      const v = k in nm ? nm[k] : p?.current;
                      const changed = k in nm;

                      if (!p) return <div key={k} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: 'var(--color-muted-soft)' }}>—</div>;

                      return (
                        <label key={k} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: 'var(--color-muted-soft)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.3px' }}>{pl(k)}</div>
                          {p.type === 'enum' ? (
                            <select
                              value={String(v)}
                              onChange={e => onUpdateChange(node.nodeId, k, e.target.value)}
                              style={{
                                fontSize: 12, padding: '3px 4px', width: '100%', maxWidth: 100,
                                border: changed ? '1px solid var(--color-primary)' : '1px solid var(--color-hairline)',
                                borderRadius: 4, background: 'var(--color-canvas)',
                                color: changed ? 'var(--color-primary)' : 'var(--color-body)',
                                fontWeight: changed ? 500 : 400, outline: 'none', cursor: 'pointer', textAlign: 'center',
                              }}
                            >
                              {p.options?.map(o => <option key={o} value={o}>{to(o)}</option>)}
                            </select>
                          ) : (
                            <input
                              type="number" value={Number(v)} min={p.min} max={p.max}
                              onChange={e => onUpdateChange(node.nodeId, k, Number(e.target.value))}
                              style={{
                                fontSize: 13, fontFamily: 'var(--font-mono)', width: 56, padding: '3px 4px',
                                border: changed ? '1px solid var(--color-primary)' : '1px solid var(--color-hairline)',
                                borderRadius: 4, background: 'var(--color-canvas)',
                                color: changed ? 'var(--color-primary)' : 'var(--color-body)',
                                fontWeight: changed ? 500 : 400, outline: 'none', textAlign: 'center',
                                boxSizing: 'border-box',
                              }}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid var(--color-hairline)', padding: '10px 14px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {hasChanges && (
          <button onClick={onReset} style={{ background: 'none', border: '1px solid var(--color-hairline)', borderRadius: 4, height: 32, padding: '0 12px', fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--color-muted)', cursor: 'pointer' }}>
            {isZh ? '全部重置' : 'Reset All'}
          </button>
        )}
        <button onClick={onRunCompare} disabled={!hasChanges} style={{
          background: hasChanges ? 'var(--color-primary)' : 'var(--color-primary-disabled)',
          color: '#fff', border: 'none', borderRadius: 4, height: 32, padding: '0 18px',
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
          cursor: hasChanges ? 'pointer' : 'not-allowed', opacity: hasChanges ? 1 : .6,
        }}>
          对比运行
        </button>
      </div>
    </aside>
  );
}
