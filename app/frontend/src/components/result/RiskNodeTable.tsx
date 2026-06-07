import { useRef, useCallback, useState, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getScenarioParams, runScenarioCompare } from '../../utils/api';
import { translateLabel } from '../../utils/labelTranslations';
import gsap from '../../utils/animations';

interface Props {
  data: any;
  batchId: string;
  compareResult: any;
  compareLoading: boolean;
  compareError: string;
  onCompareResult: (result: any) => void;
  onBackToNormal: () => void;
}

const RC: Record<string, string> = { high: 'var(--color-risk-high)', medium: 'var(--color-risk-mid)', low: 'var(--color-risk-low)' };
const RL_EN: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const RL_ZH: Record<string, string> = { high: '高', medium: '中', low: '低' };
const RO: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PL_EN: Record<string, string> = { supplier_count: 'Supplier Count', inventory_strategy: 'Inventory Strategy', replenishment_frequency: 'Replenishment Freq.', transport_path: 'Transport Path' };
const PL_ZH: Record<string, string> = { supplier_count: '供应商数量', inventory_strategy: '库存策略', replenishment_frequency: '补货频率', transport_path: '运输路径' };
const PK = ['supplier_count', 'inventory_strategy', 'replenishment_frequency', 'transport_path'] as const;
const AB_ZH: Record<string, string> = { '补货':'rgba(46,216,163,0.1)','转单':'rgba(77,166,255,0.1)','切换供应商':'rgba(247,84,84,0.1)','调整运输路径':'rgba(155,123,255,0.1)','核查波动原因':'rgba(245,176,65,0.1)','加强监控':'rgba(77,166,255,0.08)','维持现状':'rgba(107,113,128,0.08)' };
const AB_EN: Record<string, string> = { 'Replenish':'rgba(46,216,163,0.1)','Reroute':'rgba(77,166,255,0.1)','Switch Supplier':'rgba(247,84,84,0.1)','Adjust Logistics':'rgba(155,123,255,0.1)','Investigate':'rgba(245,176,65,0.1)','Monitor':'rgba(77,166,255,0.08)','Maintain':'rgba(107,113,128,0.08)' };
const AT_ZH: Record<string, string> = { '补货':'var(--color-ok)','转单':'var(--color-accent-blue)','切换供应商':'var(--color-error)','调整运输路径':'var(--color-accent-purple)','核查波动原因':'var(--color-accent-amber)','加强监控':'var(--color-text-secondary)','维持现状':'var(--color-text-muted)' };
const AT_EN: Record<string, string> = { 'Replenish':'var(--color-ok)','Reroute':'var(--color-accent-blue)','Switch Supplier':'var(--color-error)','Adjust Logistics':'var(--color-accent-purple)','Investigate':'var(--color-accent-amber)','Monitor':'var(--color-text-secondary)','Maintain':'var(--color-text-muted)' };

const CSS = `
.cause-tag{display:inline-block;padding:2px 6px;margin:2px;border-radius:4px;font-size:0.78rem;cursor:pointer;background:#f0f0f0}
.cause-tag:hover{background:#e0e0e0}
.cdp{position:fixed;background:white;border:1px solid var(--color-hairline);border-radius:6px;padding:8px 12px;font-size:0.8rem;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:9999;max-width:320px;line-height:1.6}
@keyframes rph{0%,100%{box-shadow:0 0 0 0 rgba(198,69,69,0.5);transform:scale(1)}50%{box-shadow:0 0 8px 3px rgba(198,69,69,0.3);transform:scale(1.4)}}
@keyframes rpm{0%,100%{box-shadow:0 0 0 0 rgba(243,156,18,0.45);transform:scale(1)}50%{box-shadow:0 0 6px 2px rgba(243,156,18,0.25);transform:scale(1.25)}}
@keyframes rpl{0%,100%{box-shadow:0 0 0 0 rgba(39,174,96,0.35);transform:scale(1)}50%{box-shadow:0 0 4px 1px rgba(39,174,96,0.18);transform:scale(1.15)}}
.rdh{animation:rph 1.8s ease-in-out infinite}
.rdm{animation:rpm 2.4s ease-in-out infinite}
.rdl{animation:rpl 3s ease-in-out infinite}
`;

const thS: React.CSSProperties = { padding:'10px 8px',fontWeight:600,fontSize:13,color:'var(--color-ink)',textAlign:'left',whiteSpace:'nowrap',borderBottom:'2px solid var(--color-hairline)' };
const tdS: React.CSSProperties = { padding:'9px 8px',fontSize:13,color:'var(--color-body)',whiteSpace:'nowrap' };
const isS = (ch: boolean): React.CSSProperties => ({ fontSize:12,fontFamily:'var(--font-body)',padding:'3px 5px',border:ch?'1px solid var(--color-primary)':'1px solid var(--color-hairline)',borderRadius:4,background:ch?'rgba(204,120,92,0.06)':'var(--color-canvas)',color:ch?'var(--color-primary)':'var(--color-body)',fontWeight:ch?500:400,outline:'none',textAlign:'center',boxSizing:'border-box' });

export default function RiskNodeTable({ data, batchId, onCompareResult, onBackToNormal }: Props) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const rl = (l: string) => isZh ? (RL_ZH[l] || l) : (RL_EN[l] || l);
  const pl = (k: string) => isZh ? (PL_ZH[k] || k) : (PL_EN[k] || k);
  const abBg = (a: string) => AB_ZH[a] || AB_EN[a] || 'rgba(107,113,128,0.06)';
  const atColor = (a: string) => AT_ZH[a] || AT_EN[a] || 'var(--color-text-muted)';
  const tl = (s: string) => isZh ? s : translateLabel(s);
  const listRef = useRef<HTMLTableSectionElement>(null);
  const prevActiveRef = useRef<number | null>(null);
  const tweensRef = useRef<gsap.core.Tween[]>([]);
  const [pop, setPop] = useState<{ row: number; ci: number; x: number; y: number } | null>(null);

  // ── Editing state (LOCAL — not from parent) ──
  const [isEditing, setIsEditing] = useState(false);
  const [nodeParams, setNodeParams] = useState<Record<string, any[]>>({});
  const [paramsLoading, setParamsLoading] = useState(false);
  const [changes, setChanges] = useState<Array<{node_id: string; param: string; to_value: number | string}>>([]);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  // Filter state
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [showLow, setShowLow] = useState(false);

  useEffect(() => { return () => tweensRef.current.forEach(t => t.kill()); }, []);

  const anim = useCallback((y: number) => {
    if (isEditing || !listRef.current) return;
    const rows = listRef.current.querySelectorAll<HTMLElement>('[data-rn]');
    if (!rows.length) return;
    let best = 0, bestD = Infinity;
    rows.forEach((r, i) => { const d = Math.abs(y - (r.getBoundingClientRect().top + r.offsetHeight/2)); if (d < bestD) { bestD = d; best = i; } });
    if (best === (prevActiveRef.current ?? -1)) return;
    prevActiveRef.current = best;
    tweensRef.current.forEach(t => t.kill()); tweensRef.current = [];
    rows.forEach((r, i) => {
      const d = Math.abs(best - i);
      tweensRef.current.push(gsap.to(r, { scaleY: d===0?1.01:d===1?0.97:d===2?0.94:0.9, autoAlpha: d===0?1:d===1?0.72:d===2?0.45:0.2, backgroundColor: d===0?'rgba(198,69,69,0.05)':'transparent', borderLeftColor: d===0?'var(--color-risk-high)':'transparent', duration:0.35, ease:'power2.out', overwrite:'auto' }));
    });
  }, [isEditing]);

  const resetAnim = useCallback(() => {
    prevActiveRef.current = null; tweensRef.current.forEach(t => t.kill()); tweensRef.current = [];
    listRef.current?.querySelectorAll<HTMLElement>('[data-rn]').forEach(r => { gsap.to(r, { scaleY:1, autoAlpha:1, backgroundColor:'transparent', borderLeftColor:'transparent', duration:0.3, ease:'power2.out', overwrite:'auto' }); });
  }, []);

  const sorted = useMemo(() => [...(data?.rows || data?.nodes || [])].sort((a: any, b: any) => (RO[a.risk_level]??3) - (RO[b.risk_level]??3)), [data]);
  const allIds = useMemo(() => sorted.map((r: any) => r.node_id), [sorted]);
  const hasLow = useMemo(() => sorted.some((r: any) => r.risk_level === 'low'), [sorted]);

  const visible = useMemo(() => sorted.filter((r: any) => {
    if (filterLevel !== 'all' && r.risk_level !== filterLevel) return false;
    if (!showLow && r.risk_level === 'low' && filterLevel === 'all') return false;
    return true;
  }), [sorted, filterLevel, showLow]);

  const chMap = useMemo(() => {
    const m: Record<string, Record<string, number|string>> = {};
    for (const c of changes) (m[c.node_id] ??= {})[c.param] = c.to_value;
    return m;
  }, [changes]);

  const getP = (nid: string, k: string) => (nodeParams[nid] || []).find((p: any) => p.name === k) || null;
  const getV = (nid: string, k: string) => { const ch = chMap[nid]; if (ch && k in ch) return ch[k]; const p = getP(nid, k); return p ? p.current : null; };
  const isC = (nid: string, k: string) => !!(chMap[nid] && k in chMap[nid]);
  const nc = (nid: string) => { const ch = chMap[nid]; return ch ? Object.keys(ch).length : 0; };

  /** Open editing mode — load all node params in parallel */
  const startEdit = async () => {
    setIsEditing(true);
    setParamsLoading(true);
    setError('');

    // Fire all requests concurrently, not one-by-one
    const results = await Promise.all(
      allIds.map(nid =>
        getScenarioParams(nid, batchId)
          .then(d => ({ nid, params: d.params || [] }))
          .catch(() => ({ nid, params: [] }))
      )
    );

    const all: Record<string, any[]> = {};
    for (const { nid, params } of results) all[nid] = params;
    setNodeParams(all);
    setParamsLoading(false);
  };

  const stopEdit = () => {
    setIsEditing(false);
    setNodeParams({});
    setParamsLoading(false);
    setChanges([]);
    setError('');
    setRunning(false);
    onBackToNormal();
  };

  const upd = (nid: string, pk: string, v: number|string) => {
    setChanges(prev => [...prev.filter(c => !(c.node_id===nid && c.param===pk)), { node_id: nid, param: pk, to_value: v }]);
  };

  const resetAll = () => setChanges([]);

  const run = async () => {
    if (!changes.length) return;
    setRunning(true); setError('');
    try {
      const r = await runScenarioCompare(batchId, changes);
      onCompareResult(r);
    } catch (e: any) {
      setError(e?.detail || e?.message || (isZh ? '对比计算失败' : 'Comparison failed'));
    } finally {
      setRunning(false);
    }
  };

  if (!data || data.status === 'unavailable' || data.status === 'error')
    return <div className="card"><div className="card-title">{isZh ? '所有节点' : 'All Nodes'}</div><div className={`notice notice-${data?.status==='error'?'error':'warning'}`}>{data?.missing_reason || (isZh ? '暂无节点数据' : 'No data available')}</div></div>;

  return (
    <div className="card" style={{ position:'relative' }}>
      <style>{CSS}</style>

      {/* Header bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div className="card-title" style={{ marginBottom:0 }}>{isZh ? '所有节点' : 'All Nodes'}</div>
          <div style={{ display:'flex', gap:4 }}>
            {(['all','high','medium','low'] as const).map(lv => (
              <button key={lv} onClick={() => { setFilterLevel(lv); if (lv!=='all') setShowLow(false); }}
                style={{ padding:'2px 10px', borderRadius:'var(--rounded-pill)', border:'1px solid var(--color-hairline)', background: filterLevel===lv?'var(--color-primary)':'transparent', color: filterLevel===lv?'#fff':'var(--color-muted)', fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:'var(--font-body)' }}>
                {lv==='all'?(isZh?'全部':'All'):rl(lv)}
              </button>
            ))}
          </div>
          {!showLow && hasLow && filterLevel==='all' && (
            <button onClick={() => setShowLow(true)} style={{ background:'none',border:'none',color:'var(--color-primary)',fontSize:12,cursor:'pointer' }}>{isZh ? '显示低风险节点' : 'Show Low-Risk Nodes'}</button>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {isEditing ? (
            <>
              {changes.length > 0 && <button onClick={resetAll} style={{ background:'none',border:'1px solid var(--color-hairline)',borderRadius:4,height:30,padding:'0 12px',fontSize:12,color:'var(--color-muted)',cursor:'pointer' }}>{isZh ? '全部重置' : 'Reset All'}</button>}
              {changes.length > 0 && <button onClick={run} disabled={running} style={{ background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:4,height:30,padding:'0 16px',fontSize:13,fontWeight:500,cursor:'pointer' }}>{running ? (isZh ? '计算中...' : 'Calculating...') : (isZh ? '对比运行' : 'Compare')}</button>}
              <button onClick={stopEdit} style={{ background:'none',border:'none',color:'var(--color-muted)',fontSize:18,cursor:'pointer',padding:'0 4px',lineHeight:1 }}>×</button>
            </>
          ) : (
            <button onClick={startEdit} style={{ height:36,padding:'0 22px',borderRadius:'var(--rounded-pill)',border:'none',background:'var(--color-primary)',fontFamily:'var(--font-body)',fontSize:14,fontWeight:600,color:'#fff',cursor:'pointer' }}>{isZh ? '尝试更改' : 'Try Change'}</button>
          )}
        </div>
      </div>

      {error && <div style={{ background:'var(--color-error)',color:'#fff',padding:'8px 14px',borderRadius:4,fontSize:13,marginBottom:8 }}>{error}</div>}
      {paramsLoading && isEditing && (
        <div style={{
          background: 'var(--color-surface-cream-strong)',
          borderRadius: 6,
          padding: '14px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span className="loading-spinner" style={{ width: 18, height: 18, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{isZh ? '正在加载参数' : 'Loading parameters...'}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
              {isZh ? `正在同时获取 ${allIds.length} 个节点的可调参数，请稍候...` : `Fetching adjustable parameters for ${allIds.length} nodes, please wait...`}
            </div>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p style={{ color:'var(--color-muted)',fontSize:'0.9rem' }}>{isZh ? '暂无节点数据' : 'No data available'}</p>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontFamily:'var(--font-body)',fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--color-surface-card)' }}>
                <th style={thS}>{isZh ? '节点ID' : 'Node ID'}</th>
                <th style={thS}>{isZh ? '类型' : 'Type'}</th>
                <th style={thS}>{isZh ? '风险' : 'Risk'}</th>
                <th style={thS}>{isZh ? '评分' : 'Score'}</th>
                <th style={thS}>{isZh ? '风险原因' : 'Risk Causes'}</th>
                <th style={thS}>{isZh ? '建议动作' : 'Action'}</th>
              </tr>
            </thead>
            <tbody ref={listRef} onMouseMove={e => anim(e.clientY)} onMouseLeave={resetAnim}>
              {visible.map((n: any, i: number) => {
                const cnt = nc(n.node_id);
                const rowBg = cnt>0&&isEditing ? 'var(--color-surface-soft)' : undefined;
                const rowBorder = cnt>0&&isEditing ? '4px solid var(--color-primary)' : '4px solid transparent';
                return (
                  <Fragment key={n.node_id || i}>
                    {/* Main data row */}
                    <tr data-rn="" style={{ borderBottom: isEditing ? 'none' : '1px solid var(--color-hairline)', borderLeft: rowBorder, background: rowBg }}>
                      <td style={tdS}>{n.node_name || n.node_id}</td>
                      <td style={tdS}><span style={{ display:'inline-block',padding:'2px 8px',borderRadius:4,fontSize:12,background: abBg(n.action_type)||'rgba(107,113,128,0.06)',color: atColor(n.action_type) }}>{tl(n.action_type)||'—'}</span></td>
                      <td style={tdS}><span className={`rd${n.risk_level?.[0]||'l'}`} style={{ display:'inline-block',width:10,height:10,borderRadius:'50%',background: RC[n.risk_level]||'var(--color-unavailable)',marginRight:6 }} />{rl(n.risk_level)||n.risk_level}</td>
                      <td style={{ ...tdS,fontWeight:600,fontFamily:'var(--font-mono)' }}>{(n.risk_score??0).toFixed(3)}</td>
                      <td style={tdS}>
                        {(n.risk_causes||[]).map((cause:string,ci:number) => (
                          <span key={ci} className="cause-tag" onClick={e=>{ e.stopPropagation(); const r=e.currentTarget.getBoundingClientRect(); setPop(prev=>prev?.row===i&&prev?.ci===ci?null:{row:i,ci,x:r.left,y:r.bottom}); }}>{tl(cause)}</span>
                        ))}
                        {(!n.risk_causes||n.risk_causes.length===0)&&'—'}
                      </td>
                      <td style={tdS}>{n.recommended_action||'—'}</td>
                    </tr>
                    {/* Parameter row — shown only in editing mode */}
                    {isEditing && (
                      <tr data-rn="" style={{ borderBottom:'1px solid var(--color-hairline)', background: rowBg, borderLeft: rowBorder }}>
                        <td colSpan={6} style={{ padding:'0' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:0, padding:'6px 10px', fontSize:12 }}>
                            <span style={{ color:'var(--color-muted-soft)', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginRight:16, flexShrink:0 }}>参数调整</span>
                            {PK.map(k => {
                              const p = getP(n.node_id, k); const ch = isC(n.node_id, k); const v = getV(n.node_id, k);
                              return (
                                <label key={k} style={{ display:'flex', alignItems:'center', gap:6, marginRight:20 }}>
                                  <span style={{ fontSize:11, color: ch?'var(--color-primary)':'var(--color-muted)', fontWeight: ch?500:400, whiteSpace:'nowrap' }}>{pl(k)}</span>
                                  {!p ? <span style={{ color:'var(--color-muted-soft)' }}>—</span> : p.type==='enum' ?
                                    <select value={String(v)} onChange={e => upd(n.node_id,k,e.target.value)} style={{...isS(ch),cursor:'pointer',maxWidth:120}}>{(p.options||[]).map((o:string)=><option key={o} value={o}>{o}</option>)}</select>
                                    : <input type="number" value={Number(v)} min={p.min} max={p.max} onChange={e => upd(n.node_id,k,Number(e.target.value))} style={{...isS(ch),fontFamily:'var(--font-mono)',width:56}} />
                                  }
                                </label>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!showLow && hasLow && filterLevel==='all' && visible.length < sorted.length && (
        <div style={{ textAlign:'center',padding:'8px 0',color:'var(--color-muted)',fontSize:12 }}>{isZh ? `已隐藏 ${sorted.length - visible.length} 个低风险节点` : `${sorted.length - visible.length} low-risk nodes hidden`}</div>
      )}

      {pop && visible[pop.row]?.risk_causes_detail?.[pop.ci] &&
        createPortal(<div className="cdp" style={{ top:Math.min(pop.y+6,window.innerHeight-140), left:Math.min(pop.x,window.innerWidth-330) }} onMouseDown={e=>e.stopPropagation()}>
          <div>触发指标：{visible[pop.row].risk_causes_detail[pop.ci].triggered_by}</div>
          <div>实际值：{visible[pop.row].risk_causes_detail[pop.ci].actual_value}</div>
          <div>阈值：{visible[pop.row].risk_causes_detail[pop.ci].threshold}</div>
          {visible[pop.row].risk_causes_detail[pop.ci].excess_ratio && <div style={{ color:'var(--color-risk-high)',fontWeight:600 }}>超出阈值 {visible[pop.row].risk_causes_detail[pop.ci].excess_ratio}%</div>}
        </div>, document.body)}
      {pop && createPortal(<div style={{ position:'fixed',inset:0,zIndex:9998 }} onMouseDown={()=>setPop(null)} />, document.body)}
    </div>
  );
}
