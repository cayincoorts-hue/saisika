import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 静态 2D 网络图降级方案
 *
 * 当 WebGL 不可用 / 用户偏好减少动效 / 小屏时，替代 3D 力导向图。
 * 使用确定性力导向布局（斥力 + 弹簧），一次计算完成，无动画、无 WebGL。
 * 视觉语言与 3D 图一致：节点按层级着色、大小按连接度，边按权重。
 */

export interface StaticGraphNode {
  id: string;
  name: string;
  level: number;
  risk_level: string;
  risk_score: number;
  in_degree: number;
  out_degree: number;
  _degree: number;
}

export interface StaticGraphLink {
  source: string;
  target: string;
  relation_type: string;
  weight: number;
}

interface Props {
  nodes: StaticGraphNode[];
  edges: StaticGraphLink[];
  highlightNodeId?: string | null;
  onNodeClick?: (nodeId: string | null) => void;
  width?: number;
  height?: number;
}

const LEVEL_COLORS = ['#5db8a6', '#cc785c', '#e8a55a', '#8e8b82'];

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  degree: number;
  risk_level: string;
}

/** 确定性力导向布局：迭代 120 轮，斥力 + 弹簧，无随机性 */
function computeLayout(nodes: StaticGraphNode[], edges: StaticGraphLink[]): LayoutNode[] {
  const connectedIds = new Set<string>();
  edges.forEach((e) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });
  const visible = nodes.filter((n) => connectedIds.has(n.id));

  const positions = new Map<string, { x: number; y: number }>();
  const degree = new Map<string, number>();

  // 初始位置：环形（确定性）
  const n = visible.length;
  visible.forEach((node, i) => {
    const angle = (i / Math.max(1, n)) * Math.PI * 2;
    positions.set(node.id, { x: Math.cos(angle) * 180, y: Math.sin(angle) * 120 });
    degree.set(node.id, node._degree || 0);
  });

  const k = 90; // 理想边长
  const iterations = 120;
  const maxDegree = Math.max(1, ...Array.from(degree.values()));

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();
    visible.forEach((node) => forces.set(node.id, { fx: 0, fy: 0 }));

    // 斥力（所有节点对）
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = positions.get(visible[i].id)!;
        const b = positions.get(visible[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fa = forces.get(visible[i].id)!;
        const fb = forces.get(visible[j].id)!;
        fa.fx += fx; fa.fy += fy;
        fb.fx -= fx; fb.fy -= fy;
      }
    }

    // 弹簧（边）
    edges.forEach((e) => {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = (dist - k) * 0.12;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fa = forces.get(e.source)!;
      const fb = forces.get(e.target)!;
      fa.fx += fx; fa.fy += fy;
      fb.fx -= fx; fb.fy -= fy;
    });

    // 应用力 + 冷却
    const cooling = 1 - iter / iterations;
    visible.forEach((node) => {
      const p = positions.get(node.id)!;
      const f = forces.get(node.id)!;
      p.x += f.fx * 0.08 * cooling;
      p.y += f.fy * 0.08 * cooling;
    });
  }

  // 归一化到画布
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  visible.forEach((node) => {
    const p = positions.get(node.id)!;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  });
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const scale = Math.min(340 / spanX, 260 / spanY, 1.2);

  return visible.map((node) => {
    const p = positions.get(node.id)!;
    const cx = 400 + (p.x - (minX + maxX) / 2) * scale;
    const cy = 260 + (p.y - (minY + maxY) / 2) * scale;
    return {
      id: node.id,
      x: cx,
      y: cy,
      degree: (node._degree || 0) / maxDegree,
      risk_level: node.risk_level,
    };
  });
}

export default function StaticNetworkGraph({
  nodes,
  edges,
  highlightNodeId = null,
  onNodeClick,
  width = 800,
  height = 520,
}: Props) {
  const { t } = useTranslation();

  const layout = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);
  const idToLayout = useMemo(() => new Map(layout.map((n) => [n.id, n])), [layout]);

  // 关联节点集合（高亮时）
  const linked = useMemo(() => {
    if (!highlightNodeId) return new Set<string>();
    const s = new Set<string>([highlightNodeId]);
    edges.forEach((e) => {
      if (e.source === highlightNodeId) s.add(e.target);
      if (e.target === highlightNodeId) s.add(e.source);
    });
    return s;
  }, [highlightNodeId, edges]);

  const nodeMeta = useMemo(() => {
    const m = new Map<string, { level: number; name: string; risk_score: number }>();
    nodes.forEach((n) => m.set(n.id, { level: n.level, name: n.name, risk_score: n.risk_score }));
    return m;
  }, [nodes]);

  return (
    <div data-testid="static-graph" style={{ position: 'relative', width: '100%', height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('forceGraph3D.staticAria')}
        style={{ background: '#faf9f5', borderRadius: 12, display: 'block' }}
      >
        {/* 边 */}
        {edges.map((e, i) => {
          const a = idToLayout.get(e.source);
          const b = idToLayout.get(e.target);
          if (!a || !b) return null;
          const isHighlighted = highlightNodeId && (linked.has(e.source) || linked.has(e.target));
          return (
            <line
              key={`e-${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isHighlighted ? '#cc785c' : '#b8b0a4'}
              strokeOpacity={isHighlighted ? 0.75 : 0.3}
              strokeWidth={isHighlighted ? 2.5 : Math.min(4, Math.max(1, Math.log2((e.weight || 1) + 1) * 0.9))}
            />
          );
        })}

        {/* 节点 */}
        {layout.map((n) => {
          const meta = nodeMeta.get(n.id);
          const color = LEVEL_COLORS[(meta?.level || 1) - 1] || '#8e8b82';
          const isDimmed = highlightNodeId && !linked.has(n.id);
          const r = 6 + n.degree * 10;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              opacity={isDimmed ? 0.25 : 1}
              style={{ cursor: 'pointer' }}
              onClick={() => onNodeClick?.(highlightNodeId === n.id ? null : n.id)}
            >
              <title>
                {meta?.name} · {t('propagation.riskLevel')} {n.risk_level} · {t('propagation.riskScore')} {meta?.risk_score.toFixed(2)}
              </title>
              <circle
                r={r}
                fill={color}
                stroke={highlightNodeId === n.id ? '#141413' : '#ffffff'}
                strokeWidth={highlightNodeId === n.id ? 2.5 : 1}
              />
              {highlightNodeId === n.id && <circle r={r + 6} fill="none" stroke="#141413" strokeWidth={1} strokeDasharray="3 3" />}
            </g>
          );
        })}
      </svg>

      {/* 图例 */}
      <div style={{
        position: 'absolute', top: 12, right: 16,
        fontSize: '0.75rem', color: 'var(--color-body)',
        background: 'rgba(250,249,245,0.92)', padding: '8px 14px',
        borderRadius: 8, pointerEvents: 'none', lineHeight: 1.7,
        border: '1px solid var(--color-hairline)',
      }}>
        <div style={{ marginBottom: 4, fontWeight: 500, color: 'var(--color-ink)' }}>
          {t('forceGraph3D.legendTitle')} · {t('forceGraph3D.staticLabel')}
        </div>
        {[t('forceGraph3D.legend.L1'), t('forceGraph3D.legend.L2'), t('forceGraph3D.legend.L3')].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLORS[i], display: 'inline-block' }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
