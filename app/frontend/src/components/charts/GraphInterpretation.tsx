import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
      <h4 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'var(--color-accent)' }}>{t('graphInterpretation.title')}</h4>

      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: '0.85rem', marginBottom: 6 }}>
            <strong>{t('graphInterpretation.nodeComposition')}：</strong>{t('graphInterpretation.totalNodes', { count: nodes.length })}
            {removedCount > 0 && (
              <span style={{ color: 'var(--color-accent-amber)' }}>（{t('graphInterpretation.removedNodes', { count: removedCount })}）</span>
            )}
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <span style={{ color: 'var(--color-error)' }}>{t('riskNodeTable.levels.high')} {analysis.highCount}</span>
            <span style={{ margin: '0 8px', color: 'var(--color-hairline)' }}>|</span>
            <span style={{ color: 'var(--color-limited)' }}>{t('riskNodeTable.levels.medium')} {analysis.mediumCount}</span>
            <span style={{ margin: '0 8px', color: 'var(--color-hairline)' }}>|</span>
            <span style={{ color: 'var(--color-ok)' }}>{t('riskNodeTable.levels.low')} {analysis.lowCount}</span>
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <strong>{t('graphInterpretation.relationTypes')}：</strong>plant {analysis.plantEdges} · storage {analysis.storageEdges}
          </p>
          <p style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <strong>{t('graphInterpretation.crossLevelEdges')}：</strong>{analysis.crossLevelCount} {t('graphInterpretation.edgeCount')}
          </p>
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', marginBottom: 8 }}>
            {Array.from(analysis.levelStats.entries()).sort(([a], [b]) => a - b).map(([level, s]) => (
              <div key={level} style={{ marginBottom: 2 }}>
                <strong>L{level}：</strong>{s.total} {t('result.nodes')}
                {s.high > 0 && <span style={{ color: 'var(--color-error)' }}>（{t('riskNodeTable.levels.high')}{s.high} </span>}
                {s.medium > 0 && <span style={{ color: 'var(--color-limited)' }}>{t('riskNodeTable.levels.medium')}{s.medium}</span>}
                {s.high > 0 && ')'}
                <span style={{ color: 'var(--color-unavailable)' }}> · {t('graphInterpretation.avgConnections')} {s.avgDegree} {t('graphInterpretation.edgeCount')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {analysis.hubs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.85rem', marginBottom: 8 }}>
            <strong>{t('graphInterpretation.hubAnalysis')}：</strong>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>
              {t('graphInterpretation.hubPercentage', { count: analysis.hubs.length, percentage: analysis.hubRatio })}
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
            <strong>{t('graphInterpretation.downstreamImpact')}：</strong>
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {analysis.topTargets.map(item => (
              <span key={item.name} style={{
                display: 'inline-block', padding: '3px 8px', background: 'var(--color-canvas)', borderRadius: 4,
                border: '1px solid #e0e0e0', fontSize: '0.8rem',
              }}>
                {item.name}
                <span style={{ color: 'var(--color-muted)', marginLeft: 4 }}>{t('propagation.weight')}{item.weight}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.isolatedRisk.length > 0 && (
        <div className="notice notice-warning">
          <strong>{t('graphInterpretation.notes')}：</strong>{t('graphInterpretation.isolatedRiskWarning', { nodes: analysis.isolatedRisk.map(n => n.name).join('、') })}
        </div>
      )}

      <div className="notice notice-info" style={{ marginBottom: 0 }}>
        <p style={{ fontSize: '0.85rem', marginBottom: 4 }}><strong>{t('graphInterpretation.interpretationPoints')}：</strong></p>
        <ul style={{ fontSize: '0.8rem', paddingLeft: 18, color: 'var(--color-body)' }}>
          {analysis.hubRatio && Number(analysis.hubRatio) > 40 && (
            <li>{t('graphInterpretation.pointCentralized', { percentage: analysis.hubRatio })}</li>
          )}
          {analysis.highCount > 0 && (
            <li>{t('graphInterpretation.pointHighRiskLevel', { count: analysis.highCount })}</li>
          )}
          {analysis.crossLevelCount > 50 && (
            <li>{t('graphInterpretation.pointCrossLevel', { count: analysis.crossLevelCount })}</li>
          )}
          {removedCount > 10 && (
            <li>{t('graphInterpretation.pointRemovedNodes', { removed: removedCount, total: totalNodes })}</li>
          )}
          <li>{t('graphInterpretation.pointNodeSize')}</li>
          <li>{t('graphInterpretation.pointPriority')}</li>
        </ul>
      </div>
    </div>
  );
}
