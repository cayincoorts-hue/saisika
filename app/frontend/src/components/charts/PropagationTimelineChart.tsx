import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import ReactECharts from 'echarts-for-react';
import ChartStateBlock from './ChartStateBlock';
import GraphInterpretation from './GraphInterpretation';

interface Props {
  data: any;
}

interface GraphNode {
  id: string;
  name: string;
  level: number;
  risk_level: string;
  risk_score: number;
  in_degree: number;
  out_degree: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation_type: string;
  context: string;
  weight: number;
}

const RISK_COLORS: Record<string, string> = {
  high: '#c64545',
  medium: '#e8a55a',
  low: '#5db872',
};

const RISK_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

type SortKey = 'name' | 'level' | 'risk_level' | 'risk_score' | 'degree' | 'importance';

export default function PropagationTimelineChart({ data }: Props) {
  const [minDegree, setMinDegree] = useState(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('importance');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  if (!data || (data.status !== 'ok' && data.status !== 'limited')) {
    return <ChartStateBlock status={data?.status || 'unavailable'} missingReason={data?.missing_reason}><div /></ChartStateBlock>;
  }

  const rawNodes: GraphNode[] = data.nodes || [];
  const rawEdges: any[] = data.edges || [];

  // 聚合边
  const aggregatedEdges = useMemo(() => {
    const map = new Map<string, GraphLink>();
    for (const e of rawEdges) {
      const key = `${e.source}::${e.target}`;
      const existing = map.get(key);
      if (existing) {
        existing.weight += 1;
      } else {
        map.set(key, {
          source: e.source,
          target: e.target,
          relation_type: e.relation_type || 'unknown',
          context: e.context || '',
          weight: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [rawEdges]);

  // 处理节点
  const processedNodes = useMemo(() => {
    const deg = new Map<string, number>();
    const upstreamMap = new Map<string, GraphLink[]>();
    const downstreamMap = new Map<string, GraphLink[]>();

    for (const e of aggregatedEdges) {
      const s = e.source as string;
      const t = e.target as string;
      deg.set(s, (deg.get(s) || 0) + 1);
      deg.set(t, (deg.get(t) || 0) + 1);

      if (!downstreamMap.has(s)) downstreamMap.set(s, []);
      downstreamMap.get(s)!.push(e);
      if (!upstreamMap.has(t)) upstreamMap.set(t, []);
      upstreamMap.get(t)!.push(e);
    }

    return rawNodes.map(n => ({
      ...n,
      _degree: deg.get(n.id) || 0,
      _upstream: upstreamMap.get(n.id) || [],
      _downstream: downstreamMap.get(n.id) || [],
      importance: (deg.get(n.id) || 0) * n.risk_score,
    }));
  }, [rawNodes, aggregatedEdges]);

  // 过滤 + 搜索 + 排序
  const displayNodes = useMemo(() => {
    let list = processedNodes.filter(n => {
      if (n._degree < minDegree) return false;
      if (riskFilter !== 'all' && n.risk_level !== riskFilter) return false;
      if (search && !n.name.toLowerCase().includes(search.toLowerCase()) && !n.id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    const keyMap: Record<SortKey, (n: typeof list[0]) => number | string> = {
      name: n => n.name,
      level: n => n.level,
      risk_level: n => n.risk_level,
      risk_score: n => n.risk_score,
      degree: n => n._degree,
      importance: n => n.importance,
    };

    list.sort((a, b) => {
      const va = keyMap[sortKey](a);
      const vb = keyMap[sortKey](b);
      const cmp = typeof va === 'string' ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [processedNodes, minDegree, riskFilter, search, sortKey, sortAsc]);

  // 选中节点的详情数据
  const selectedData = useMemo(() => {
    if (!selectedNode) return null;
    const node = processedNodes.find(n => n.id === selectedNode);
    if (!node) return null;
    return node;
  }, [selectedNode, processedNodes]);

  // 选中节点的关联节点列表
  const neighborNodes = useMemo(() => {
    if (!selectedData) return [];
    const neighborIds = new Set<string>();
    neighborIds.add(selectedData.id);
    for (const e of selectedData._upstream) neighborIds.add(e.source as string);
    for (const e of selectedData._downstream) neighborIds.add(e.target as string);
    return processedNodes.filter(n => neighborIds.has(n.id));
  }, [selectedData, processedNodes]);

  // 选中节点的 ego network 图 (ECharts)
  const egoOption = useMemo(() => {
    if (!selectedData) return null;

    const centerNode = {
      id: selectedData.id,
      name: selectedData.name,
      x: 400, y: 275,
      fixed: true,
      symbolSize: 30,
      itemStyle: { color: RISK_COLORS[selectedData.risk_level] || 'var(--color-unavailable)' },
      label: { show: true, fontSize: 10, fontWeight: 'bold' as const },
      risk_level: selectedData.risk_level,
      risk_score: selectedData.risk_score,
      _degree: selectedData._degree,
    };

    // 上游节点（放左边）
    const upstreamSet = new Set(selectedData._upstream.map(e => e.source as string));
    const upNodes = neighborNodes.filter(n => upstreamSet.has(n.id) && n.id !== selectedData.id);
    const upChartNodes = upNodes.map((n, i) => ({
      id: n.id,
      name: n.name,
      x: 100,
      y: 50 + (500 / (upNodes.length + 1)) * (i + 1),
      fixed: true,
      symbolSize: Math.max(8, 12 + n._degree * 0.1),
      itemStyle: { color: RISK_COLORS[n.risk_level] || 'var(--color-unavailable)' },
      label: { show: true, fontSize: 8, position: 'left' as const },
      risk_level: n.risk_level,
      risk_score: n.risk_score,
      _degree: n._degree,
    }));

    // 下游节点（放右边）
    const downstreamSet = new Set(selectedData._downstream.map(e => e.target as string));
    const downNodes = neighborNodes.filter(n => downstreamSet.has(n.id) && n.id !== selectedData.id);
    const downChartNodes = downNodes.map((n, i) => ({
      id: n.id,
      name: n.name,
      x: 700,
      y: 50 + (500 / (downNodes.length + 1)) * (i + 1),
      fixed: true,
      symbolSize: Math.max(8, 12 + n._degree * 0.1),
      itemStyle: { color: RISK_COLORS[n.risk_level] || 'var(--color-unavailable)' },
      label: { show: true, fontSize: 8, position: 'right' as const },
      risk_level: n.risk_level,
      risk_score: n.risk_score,
      _degree: n._degree,
    }));

    // 连线
    const lines: any[] = [];
    for (const e of selectedData._upstream) {
      const src = upChartNodes.find(n => n.id === e.source);
      if (src) {
        lines.push({
          coords: [[src.x, src.y], [centerNode.x, centerNode.y]],
          _weight: e.weight,
          _type: e.relation_type,
          _context: e.context,
        });
      }
    }
    for (const e of selectedData._downstream) {
      const tgt = downChartNodes.find(n => n.id === e.target);
      if (tgt) {
        lines.push({
          coords: [[centerNode.x, centerNode.y], [tgt.x, tgt.y]],
          _weight: e.weight,
          _type: e.relation_type,
          _context: e.context,
        });
      }
    }

    return {
      tooltip: {
        formatter: (params: any) => {
          const d = params.data;
          if (params.seriesType === 'scatter' && d.name) {
            return `${d.name}<br/>风险：${RISK_LABELS[d.risk_level] || d.risk_level} (${d.risk_score?.toFixed(3)})<br/>连接数：${d._degree}`;
          }
          if (params.seriesType === 'lines') {
            return `关系类型：${params.data._type}<br/>权重：${params.data._weight}`;
          }
          return '';
        },
      },
      animation: true,
      animationDuration: 1350,
      animationEasing: 'cubicOut',
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { type: 'value', show: false, min: 0, max: 800 },
      yAxis: { type: 'value', show: false, min: 0, max: 550 },
      series: [
        {
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          data: lines,
          lineStyle: { color: 'rgba(149,165,166,0.4)', width: 1, curveness: 0.2 },
          effect: { show: true, period: 6, trailLength: 0.18, symbolSize: 2 },
          animationDelay: 260,
          silent: true,
          z: 1,
        },
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          encode: { x: 'x', y: 'y' },
          symbolSize: (_v: any, p: any) => p.data?.symbolSize || 10,
          data: [centerNode],
          label: { show: true, fontSize: 10, fontWeight: 'bold' },
          animationDelay: 120,
          z: 3,
        },
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          encode: { x: 'x', y: 'y' },
          symbolSize: (_v: any, p: any) => p.data?.symbolSize || 10,
          data: [...upChartNodes, ...downChartNodes],
          label: { show: true, fontSize: 8 },
          animationDelay: (idx: number) => 220 + idx * 28,
          z: 2,
        },
      ],
    };
  }, [selectedData, neighborNodes]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ color: 'var(--color-hairline)', fontSize: '0.7rem' }}> ↕</span>;
    return <span style={{ fontSize: '0.7rem' }}>{sortAsc ? ' ↑' : ' ↓'}</span>;
  };

  const degreeOptions = [
    { value: 0, label: `全部（${rawNodes.length}）` },
    { value: 1, label: '有连接' },
    { value: 60, label: '≥60' },
    { value: 100, label: '≥100' },
  ];

  return (
    <ChartStateBlock status={data.status} missingReason={data.missing_reason}>
      {/* 顶部控制栏 */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>节点数：</span>
        {degreeOptions.map(opt => (
          <button
            key={opt.value}
            className={`btn ${minDegree === opt.value ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => { setMinDegree(opt.value); setSelectedNode(null); }}
          >
            {opt.label}
          </button>
        ))}
        <span style={{ color: 'var(--color-hairline)', margin: '0 4px' }}>|</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>风险：</span>
        {['all', 'high', 'medium', 'low'].map(rf => (
          <button
            key={rf}
            className={`btn ${riskFilter === rf ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => { setRiskFilter(rf); setSelectedNode(null); }}
          >
            {{ all: '全部', high: '高', medium: '中', low: '低' }[rf]}
          </button>
        ))}
        <input
          type="text"
          placeholder="搜索节点名称或ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto', padding: '4px 12px', fontSize: '0.85rem',
            border: '1px solid var(--color-border)', borderRadius: 6, width: 200,
          }}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-unavailable)' }}>
          {displayNodes.length} 个节点
        </span>
      </div>

      {/* 节点表格 */}
      <div style={{ overflowX: 'auto', maxHeight: 500, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-card)', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={thStyle} onClick={() => handleSort('name')}>节点名称<SortArrow col="name" /></th>
              <th style={thStyle} onClick={() => handleSort('level')}>层级<SortArrow col="level" /></th>
              <th style={thStyle} onClick={() => handleSort('risk_level')}>风险等级<SortArrow col="risk_level" /></th>
              <th style={thStyle} onClick={() => handleSort('risk_score')}>风险评分<SortArrow col="risk_score" /></th>
              <th style={thStyle} onClick={() => handleSort('degree')}>上游</th>
              <th style={thStyle} onClick={() => handleSort('degree')}>下游</th>
              <th style={thStyle} onClick={() => handleSort('degree')}>总连接<SortArrow col="degree" /></th>
              <th style={thStyle} onClick={() => handleSort('importance')}>重要性<SortArrow col="importance" /></th>
            </tr>
          </thead>
          <tbody>
            {displayNodes.map(n => {
              const isSelected = selectedNode === n.id;
              const upCount = n._upstream.length;
              const downCount = n._downstream.length;
              return (
                <tr
                  key={n.id}
                  onClick={() => setSelectedNode(isSelected ? null : n.id)}
                  style={{
                    borderBottom: '1px solid var(--color-hairline)',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(52,152,219,0.08)' : n.risk_level === 'high' ? 'rgba(231,76,60,0.03)' : undefined,
                    transition: 'background 0.65s var(--motion-smooth), transform 0.65s var(--motion-smooth), box-shadow 0.65s var(--motion-smooth)',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-soft)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = n.risk_level === 'high' ? 'rgba(231,76,60,0.03)' : '';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <span style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: RISK_COLORS[n.risk_level] || 'var(--color-unavailable)', marginRight: 6,
                    }} />
                    {n.name}
                  </td>
                  <td style={tdStyle}>L{n.level}</td>
                  <td style={tdStyle}>{RISK_LABELS[n.risk_level] || n.risk_level}</td>
                  <td style={tdStyle}>{n.risk_score.toFixed(3)}</td>
                  <td style={{ ...tdStyle, color: upCount > 10 ? 'var(--color-accent)' : undefined }}>{upCount}</td>
                  <td style={{ ...tdStyle, color: downCount > 10 ? 'var(--color-accent)' : undefined }}>{downCount}</td>
                  <td style={{ ...tdStyle, fontWeight: n._degree > 40 ? 'bold' : undefined }}>{n._degree}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{n.importance.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 展开：节点详情 */}
      {selectedData && egoOption && (
        <div className="stagger-item" style={{
          '--item-delay': '90ms',
          marginTop: 16, border: '2px solid var(--color-accent)', borderRadius: 8, padding: 16,
          background: 'var(--color-canvas)',
        } as CSSProperties}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: '1rem', margin: 0 }}>
              📋 {selectedData.name}
              <span style={{
                display: 'inline-block', marginLeft: 8, padding: '2px 8px', borderRadius: 4,
                background: RISK_COLORS[selectedData.risk_level], color: 'var(--color-on-primary)', fontSize: '0.75rem',
              }}>
                {RISK_LABELS[selectedData.risk_level]}风险
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginLeft: 8 }}>
                评分 {selectedData.risk_score.toFixed(3)} · 连接 {selectedData._degree} · L{selectedData.level}
              </span>
            </h4>
            <button className="btn btn-outline" style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                    onClick={() => setSelectedNode(null)}>关闭</button>
          </div>

          <div className="grid-2">
            {/* 上游关系列表 */}
            <div>
              <h5 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-error)' }}>
                上游供应（{selectedData._upstream.length} 个来源）
              </h5>
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-soft)' }}>
                      <th style={smTh}>来源节点</th>
                      <th style={smTh}>关系类型</th>
                      <th style={smTh}>权重</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedData._upstream.slice(0, 30).map((e, i) => {
                      const srcNode = processedNodes.find(n => n.id === e.source);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #fde8e8', cursor: 'pointer' }}
                            onClick={() => setSelectedNode(e.source as string)}>
                          <td style={smTd}>
                            <span style={{
                              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                              background: RISK_COLORS[srcNode?.risk_level || 'low'], marginRight: 4,
                            }} />
                            {srcNode?.name || (e.source as string)}
                          </td>
                          <td style={smTd}>{e.relation_type}</td>
                          <td style={smTd}>{e.weight}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 下游关系列表 */}
            <div>
              <h5 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-accent-teal)' }}>
                下游流向（{selectedData._downstream.length} 个目标）
              </h5>
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-soft)' }}>
                      <th style={smTh}>目标节点</th>
                      <th style={smTh}>关系类型</th>
                      <th style={smTh}>权重</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedData._downstream.slice(0, 30).map((e, i) => {
                      const tgtNode = processedNodes.find(n => n.id === e.target);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #d6e8fc', cursor: 'pointer' }}
                            onClick={() => setSelectedNode(e.target as string)}>
                          <td style={smTd}>
                            <span style={{
                              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                              background: RISK_COLORS[tgtNode?.risk_level || 'low'], marginRight: 4,
                            }} />
                            {tgtNode?.name || (e.target as string)}
                          </td>
                          <td style={smTd}>{e.relation_type}</td>
                          <td style={smTd}>{e.weight}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 局部关系图 */}
          <div style={{ marginTop: 16 }}>
            <h5 style={{ fontSize: '0.9rem', marginBottom: 8 }}>
              局部关系图（{selectedData.name} 的一度关系网络）
              <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginLeft: 8 }}>
                左=上游供应 · 中=当前节点 · 右=下游流向
              </span>
            </h5>
            <div style={{ height: 400, border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
              <ReactECharts key={selectedData.id} option={egoOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      <GraphInterpretation
        nodes={processedNodes.filter(n => n._degree >= minDegree)}
        edges={aggregatedEdges}
        removedCount={rawNodes.length - displayNodes.length}
        totalNodes={rawNodes.length}
      />
    </ChartStateBlock>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontWeight: 600,
  fontSize: '0.8rem', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: '0.8rem',
};

const smTh: React.CSSProperties = {
  padding: '4px 8px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem',
};

const smTd: React.CSSProperties = {
  padding: '3px 8px', fontSize: '0.75rem',
};
