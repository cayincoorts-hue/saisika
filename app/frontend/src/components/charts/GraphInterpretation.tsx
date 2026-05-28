import { useMemo } from 'react';

interface GraphNode {
  id: string;
  name: string;
  level: number;
  risk_level: string;
  risk_score: number;
  _degree: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation_type: string;
  weight: number;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphLink[];
  removedCount: number;
  totalNodes: number;
}

export default function GraphInterpretation({ nodes, edges, removedCount, totalNodes }: Props) {
  const analysis = useMemo(() => {
    if (!nodes.length) return null;

    const highRisk = nodes.filter(n => n.risk_level === 'high');
    const mediumRisk = nodes.filter(n => n.risk_level === 'medium');
    const lowRisk = nodes.filter(n => n.risk_level === 'low');

    // 层级统计
    const levelStats = new Map<number, { total: number; high: number; medium: number; avgDegree: number }>();
    for (const n of nodes) {
      const s = levelStats.get(n.level) || { total: 0, high: 0, medium: 0, avgDegree: 0 };
      s.total++;
      if (n.risk_level === 'high') s.high++;
      if (n.risk_level === 'medium') s.medium++;
      s.avgDegree += n._degree;
      levelStats.set(n.level, s);
    }
    for (const [, s] of levelStats) {
      s.avgDegree = Math.round(s.avgDegree / s.total);
    }

    // 枢纽节点（高连接数）
    const hubs = [...nodes].sort((a, b) => b._degree - a._degree).slice(0, 5);
    const totalDegree = nodes.reduce((s, n) => s + n._degree, 0);
    const hubDegree = hubs.reduce((s, n) => s + n._degree, 0);

    // 跨层级风险传播：高风险节点向其他层级发出的边
    const highRiskIds = new Set(highRisk.map(n => n.id));
    const crossLevelEdges = edges.filter(e => {
      const s = typeof e.source === 'string' ? e.source : (e.source as any)?.id;
      const t = typeof e.target === 'string' ? e.target : (e.target as any)?.id;
      return highRiskIds.has(s) && !highRiskIds.has(t);
    });

    // 被高风险节点连接最多的节点
    const targetCount = new Map<string, number>();
    for (const e of crossLevelEdges) {
      const t = typeof e.target === 'string' ? e.target : (e.target as any)?.id;
      targetCount.set(t, (targetCount.get(t) || 0) + e.weight);
    }
    const topTargets = [...targetCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, w]) => {
        const node = nodes.find(n => n.id === id);
        return { name: node?.name || id, weight: w, risk_level: node?.risk_level || 'unknown' };
      });

    // 跨层级边数量
    const plantEdges = edges.filter(e => e.relation_type === 'plant_relation').length;
    const storageEdges = edges.filter(e => e.relation_type === 'storage_relation').length;

    // 孤立风险节点
    const isolatedRisk = nodes.filter(n =>
      (n.risk_level === 'high' || n.risk_level === 'medium') && n._degree < 5
    );

    return {
      highCount: highRisk.length,
      mediumCount: mediumRisk.length,
      lowCount: lowRisk.length,
      hubs,
      hubDegree,
      totalDegree,
      hubRatio: ((hubDegree / Math.max(1, totalDegree)) * 100).toFixed(0),
      levelStats,
      crossLevelCount: crossLevelEdges.length,
      topTargets,
      plantEdges,
      storageEdges,
      isolatedRisk,
    };
  }, [nodes, edges]);

  if (!analysis) return null;

  return (
    <div style={{ marginTop: 16, background: 'var(--color-surface-card)', borderRadius: 8, padding: 16 }}>
      <h4 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'var(--color-accent)' }}>网络结构解读</h4>

      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: '0.85rem', marginBottom: 6 }}>
            <strong>节点构成：</strong>共 {nodes.length} 个节点
            {removedCount > 0 && (
              <span style={{ color: 'var(--color-accent-amber)' }}>（已排除 {removedCount} 个无连接低风险节点）</span>
            )}
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--color-error)' }}>高风险 {analysis.highCount}</span>
            <span style={{ margin: '0 8px', color: 'var(--color-hairline)' }}>|</span>
            <span style={{ color: 'var(--color-limited)' }}>中风险 {analysis.mediumCount}</span>
            <span style={{ margin: '0 8px', color: 'var(--color-hairline)' }}>|</span>
            <span style={{ color: 'var(--color-ok)' }}>低风险 {analysis.lowCount}</span>
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <strong>关系类型：</strong>plant {analysis.plantEdges} · storage {analysis.storageEdges}
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <strong>跨层级风险传播边：</strong>{analysis.crossLevelCount} 条
          </p>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', marginBottom: 8 }}>
            {Array.from(analysis.levelStats.entries()).sort(([a], [b]) => a - b).map(([level, s]) => (
              <div key={level} style={{ marginBottom: 2 }}>
                <strong>L{level}：</strong>{s.total} 节点
                {s.high > 0 && <span style={{ color: 'var(--color-error)' }}>（高{s.high} </span>}
                {s.medium > 0 && <span style={{ color: 'var(--color-limited)' }}>中{s.medium}</span>}
                {s.high > 0 && ')'}
                <span style={{ color: 'var(--color-unavailable)' }}> · 平均连接 {s.avgDegree} 条</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {analysis.hubs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>
            <strong>核心枢纽节点 Top 5：</strong>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
              这 {analysis.hubs.length} 个节点占网络总连接的 {analysis.hubRatio}%
            </span>
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {analysis.hubs.map((n, i) => (
              <span key={n.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', background: 'var(--color-canvas)', borderRadius: 4,
                border: `2px solid ${i < 2 ? 'var(--color-error)' : i < 4 ? 'var(--color-limited)' : 'var(--color-accent-teal)'}`,
                fontSize: '0.8rem',
              }}>
                <strong>#{i + 1}</strong> {n.name}
                <span style={{ color: 'var(--color-muted)' }}>度{n._degree}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.topTargets.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>
            <strong>受高风险节点影响最大的下游：</strong>
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {analysis.topTargets.map(t => (
              <span key={t.name} style={{
                display: 'inline-block', padding: '3px 8px', background: 'var(--color-canvas)', borderRadius: 4,
                border: '1px solid #e0e0e0', fontSize: '0.8rem',
              }}>
                {t.name}
                <span style={{ color: 'var(--color-muted)', marginLeft: 4 }}>权重{t.weight}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.isolatedRisk.length > 0 && (
        <div className="notice notice-warning">
          <strong>注意：</strong>以下中高风险节点连接数极低（&lt;5），可能是数据缺失或孤立风险点：
          {analysis.isolatedRisk.map(n => n.name).join('、')}
        </div>
      )}

      <div className="notice notice-info" style={{ marginBottom: 0 }}>
        <p style={{ fontSize: '0.85rem', marginBottom: 4 }}><strong>解读要点：</strong></p>
        <ul style={{ fontSize: '0.8rem', paddingLeft: 18, color: 'var(--color-body)' }}>
          {analysis.hubRatio && Number(analysis.hubRatio) > 40 && (
            <li>网络呈中心化结构：Top 5 枢纽节点集中了 {analysis.hubRatio}% 的连接，这些节点是供应链关键瓶颈，建议优先保障其稳定性。</li>
          )}
          {analysis.highCount > 0 && (
            <li>当前 {analysis.highCount} 个高风险节点全部位于 Level 1，是供应链运营层的核心环节，风险集中在运营执行层而非战略层。</li>
          )}
          {analysis.crossLevelCount > 50 && (
            <li>高风险节点向其他层级发出 {analysis.crossLevelCount} 条传播边，风险可能通过 storage 和 plant 关系向上游/下游扩散。</li>
          )}
          {removedCount > 10 && (
            <li>原始数据中 {removedCount}/{totalNodes} 个节点无有效连接（度数不足），已自动过滤。如需查看，点击"全部节点"按钮。</li>
          )}
          <li>节点圆越大 = 连接越多 = 网络中越重要；红色 = 高风险，黄色 = 中风险。</li>
          <li>优先级排序表按"重要性 = 连接数 × 风险评分"降序排列，建议按此顺序逐一排查。</li>
        </ul>
      </div>
    </div>
  );
}
