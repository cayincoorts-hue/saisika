import { useRef, useCallback, useMemo, useState, useEffect, Component } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

interface GraphNode {
  id: string;
  name: string;
  level: number;
  risk_level: string;
  risk_score: number;
  in_degree: number;
  out_degree: number;
  _degree: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation_type: string;
  weight: number;
}

type PositionedGraphNode = GraphNode & {
  _size: number;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
};

interface GraphData {
  nodes: PositionedGraphNode[];
  links: Array<{
    source: string | PositionedGraphNode;
    target: string | PositionedGraphNode;
    relation_type: string;
    weight: number;
  }>;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphLink[];
  highlightNodeId: string | null;
  onNodeClick: (nodeId: string | null) => void;
  isolatedCount?: number;
}

const LEVEL_COLORS = ['#5db8a6', '#cc785c', '#e8a55a', '#8e8b82'];

class ErrorCatcher extends Component<{ children: React.ReactNode; t: (key: string) => string }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>
          {this.props.t('forceGraph3D.error')}
        </div>
      );
    }
    return this.props.children;
  }
}

function GraphLoader({ nodes, edges, highlightNodeId, onNodeClick, isolatedCount = 0 }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [GraphComp, setGraphComp] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const fgRef = useRef<any>(null);
  const axisGroupRef = useRef<THREE.Group | null>(null);
  const graphDataRef = useRef<GraphData | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('react-force-graph-3d')
      .then(mod => {
        if (!cancelled) setGraphComp(() => mod.default || mod);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: 520 });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 数据处理
  const graphData = useMemo<GraphData>(() => {
    const connectedIds = new Set<string>();
    edges.forEach(e => {
      const s = typeof e.source === 'string' ? e.source : (e.source as any)?.id ?? e.source;
      const t = typeof e.target === 'string' ? e.target : (e.target as any)?.id ?? e.target;
      connectedIds.add(s);
      connectedIds.add(t);
    });

    const filteredNodes = nodes.filter(n => connectedIds.has(n.id));

    const MAX_EDGES = 300;
    let filteredEdges = [...edges].sort((a, b) => (b.weight || 0) - (a.weight || 0));
    if (filteredEdges.length > MAX_EDGES) {
      filteredEdges = filteredEdges.slice(0, MAX_EDGES);
    }

    const maxDegree = Math.max(1, ...filteredNodes.map(n => n._degree || 0));

    return {
      nodes: filteredNodes.map(n => ({
        ...n,
        _size: 5 + ((n._degree || 0) / maxDegree) * 14,
      })),
      links: filteredEdges.map(e => ({
        source: typeof e.source === 'string' ? e.source : (e.source as any)?.id ?? e.source,
        target: typeof e.target === 'string' ? e.target : (e.target as any)?.id ?? e.target,
        relation_type: e.relation_type,
        weight: e.weight,
      })),
    };
  }, [nodes, edges]);

  useEffect(() => {
    graphDataRef.current = graphData;
  }, [graphData]);

  const centerGraphAtOrigin = useCallback((lockNodes = false) => {
    const gd = graphDataRef.current;
    if (!gd) return false;

    const positioned = gd.nodes.filter((n) =>
      Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z)
    );
    if (positioned.length === 0) return false;

    const center = positioned.reduce(
      (acc, node) => {
        acc.x += node.x || 0;
        acc.y += node.y || 0;
        acc.z += node.z || 0;
        return acc;
      },
      { x: 0, y: 0, z: 0 }
    );
    center.x /= positioned.length;
    center.y /= positioned.length;
    center.z /= positioned.length;

    const offset = Math.sqrt(center.x ** 2 + center.y ** 2 + center.z ** 2);
    if (offset < 0.5) return true;

    positioned.forEach((node) => {
      node.x = (node.x || 0) - center.x;
      node.y = (node.y || 0) - center.y;
      node.z = (node.z || 0) - center.z;
      if (lockNodes) {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      }
    });

    const fg = fgRef.current;
    const controls = fg?.controls?.();
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
    fg?.refresh?.();
    return true;
  }, []);

  // 图挂载后：添加坐标系 + 锁定操控 + 团簇居中
  useEffect(() => {
    if (!GraphComp) return;

    let cancelled = false;
    let initialized = false;
    let pollRetries = 0;
    const MAX_RETRIES = 50;

    const setup = () => {
      if (cancelled || initialized) return;
      const fg = fgRef.current;
      if (!fg) { pollRetries++; return; }
      const scene = fg.scene();
      if (!scene) { pollRetries++; return; }
      const controls = fg.controls();
      if (!controls) { pollRetries++; return; }

      initialized = true;
      console.log('[ForceGraph] graph instance ready, setting up axes and controls');

      // 添加三维坐标轴组（标记 isAxis 以便遍历排查）
      const axisLen = 600;
      const axisGroup = new THREE.Group();
      axisGroup.userData.isAxis = true;
      const makeAxis = (dir: THREE.Vector3, color: number) => {
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 });
        const pts = [dir.clone().multiplyScalar(-axisLen), dir.clone().multiplyScalar(axisLen)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, mat);
        line.userData.isAxis = true;
        axisGroup.add(line);
      };
      makeAxis(new THREE.Vector3(1, 0, 0), 0xcc785c);
      makeAxis(new THREE.Vector3(0, 1, 0), 0x5db8a6);
      makeAxis(new THREE.Vector3(0, 0, 1), 0xe8a55a);

      const originGeo = new THREE.SphereGeometry(8, 16, 16);
      const originMat = new THREE.MeshBasicMaterial({ color: 0x141413, transparent: true, opacity: 0.9 });
      const originSphere = new THREE.Mesh(originGeo, originMat);
      originSphere.userData.isAxis = true;
      axisGroup.add(originSphere);

      scene.add(axisGroup);
      axisGroupRef.current = axisGroup;

      // 锁定操控
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.minDistance = 150;
      controls.maxDistance = 500;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;

      const recenter = () => {
        if (!cancelled) centerGraphAtOrigin(false);
      };
      setTimeout(recenter, 1800);
      setTimeout(recenter, 3200);
      setTimeout(() => {
        if (!cancelled) centerGraphAtOrigin(true);
      }, 5200);
    };

    const poll = setInterval(() => {
      if (cancelled || initialized || pollRetries >= MAX_RETRIES) {
        clearInterval(poll);
        return;
      }
      pollRetries++;
      setup();
    }, 100);
    setup();

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (axisGroupRef.current && fgRef.current) {
        const s = fgRef.current.scene();
        if (s) s.remove(axisGroupRef.current);
      }
    };
  }, [GraphComp, centerGraphAtOrigin]);

  const highlightNodes = useMemo(() => {
    if (!highlightNodeId) return new Set<string>();
    const linked = new Set<string>();
    linked.add(highlightNodeId);
    graphData.links.forEach((l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      if (src === highlightNodeId) linked.add(tgt);
      if (tgt === highlightNodeId) linked.add(src);
    });
    return linked;
  }, [highlightNodeId, graphData.links]);

  const handleNodeClick = useCallback((node: any) => {
    if (highlightNodeId === node.id) {
      onNodeClick(null);
    } else {
      onNodeClick(node.id);
    }
  }, [highlightNodeId, onNodeClick]);

  // 飞向节点 — 从 graphDataRef 读位置
  useEffect(() => {
    if (!fgRef.current || !highlightNodeId) return;
    centerGraphAtOrigin(true);
    const gd = graphDataRef.current;
    const node = (gd?.nodes || []).find((n: any) => n.id === highlightNodeId);
    if (node && node.x != null && node.y != null && node.z != null) {
      fgRef.current.cameraPosition(
        { x: node.x + 50, y: node.y + 50, z: node.z + 100 },
        node,
        800
      );
    }
  }, [highlightNodeId, centerGraphAtOrigin]);

  if (loadError) {
    return (
      <div style={{
        height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#faf9f5', borderRadius: 12, color: 'var(--color-muted)', flexDirection: 'column',
      }}>
        <p>{t('forceGraph3D.loadError')}</p>
        <p style={{ fontSize: '0.8rem', marginTop: 8 }}>{t('forceGraph3D.webglHint')}</p>
      </div>
    );
  }

  if (!GraphComp) {
    return (
      <div className="chart-surface" style={{
        height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#faf9f5', borderRadius: 12, color: 'var(--color-muted)',
        animation: 'glow-border 2300ms var(--motion-silk) infinite',
      }}>
        <span className="loading-spinner" style={{ marginRight: 12 }} />
        {t('forceGraph3D.loading')}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="chart-surface" style={{
      height: 520, borderRadius: 12, overflow: 'hidden',
      background: '#faf9f5', position: 'relative',
      border: highlightNodeId ? '1px solid rgba(204,120,92,0.36)' : '1px solid transparent',
      boxShadow: highlightNodeId ? '0 20px 58px rgba(204,120,92,0.10)' : undefined,
    }}>
      <div className="floating-overlay" style={{
        position: 'absolute', top: 12, right: 16, zIndex: 10,
        fontSize: '0.75rem', color: 'var(--color-body)',
        background: 'rgba(250,249,245,0.9)', padding: '8px 14px',
        borderRadius: 8, pointerEvents: 'none', lineHeight: 1.6,
        border: '1px solid var(--color-hairline)',
      }}>
        <div style={{ marginBottom: 4, fontWeight: 500, color: 'var(--color-ink)' }}>{t('forceGraph3D.legendTitle')}</div>
        {[t('forceGraph3D.legend.L1'), t('forceGraph3D.legend.L2'), t('forceGraph3D.legend.L3')].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: LEVEL_COLORS[i], display: 'inline-block' }} />
            {label}
          </div>
        ))}
      </div>

      {isolatedCount > 0 && (
        <div className="floating-overlay" style={{
          position: 'absolute', top: 12, left: 16, zIndex: 10,
          fontSize: '0.75rem', color: 'var(--color-muted)',
          background: 'rgba(250,249,245,0.9)', padding: '6px 12px',
          borderRadius: 6, pointerEvents: 'none',
          border: '1px solid var(--color-hairline)',
        }}>
          {t('forceGraph3D.isolatedNodes', { count: isolatedCount })}
        </div>
      )}

      <GraphComp
        ref={fgRef}
        graphData={graphData}
        width={size.width}
        height={520}
        backgroundColor="#faf9f5"
        nodeRelSize={4}
        nodeVal={(n: any) => n._size}
        nodeColor={(n: any) => {
          const base = LEVEL_COLORS[n.level - 1] || '#8e8b82';
          if (highlightNodeId) {
            if (n.id === highlightNodeId) return '#141413';
            if (highlightNodes.has(n.id)) return base;
            return `${base}44`;
          }
          return base;
        }}
        nodeLabel={(n: any) => {
          const lblT = t;
          return `${n.name}\n${lblT('propagation.tier')} L${n.level} | ${lblT('propagation.riskLevel')} ${n.risk_level} | ${lblT('propagation.riskScore')} ${n.risk_score.toFixed(2)}\n${lblT('propagation.totalConnections')} ${n._degree} (${lblT('propagation.upDegree')}${n.in_degree} / ${lblT('propagation.downDegree')}${n.out_degree})`;
        }}
        linkWidth={(l: any) => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;
          if (highlightNodeId && !highlightNodes.has(src) && !highlightNodes.has(tgt)) return 0.5;
          return Math.min(6, Math.max(1.5, Math.log2((l.weight || 1) + 1) * 1.0));
        }}
        linkColor={(l: any) => {
          const src = typeof l.source === 'object' ? l.source.id : l.source;
          const tgt = typeof l.target === 'object' ? l.target.id : l.target;
          const isHighlighted = highlightNodeId && (highlightNodes.has(src) || highlightNodes.has(tgt));
          return isHighlighted ? '#cc785c' : '#b8b0a4';
        }}
        linkOpacity={0.35}
        linkDirectionalArrowLength={(l: any) => (l.weight || 0) > 5 ? 3.5 : 0}
        linkDirectionalArrowRelPos={0.95}
        linkDirectionalArrowColor={() => '#cc785c66'}
        onNodeClick={handleNodeClick}
        onEngineStop={() => centerGraphAtOrigin(true)}
        cooldownTicks={60}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableNodeDrag={false}
        showNavInfo={false}
      />
    </div>
  );
}

export default function ForceGraph3D(props: Props) {
  const { t } = useTranslation();
  return (
    <ErrorCatcher t={t}>
      <GraphLoader {...props} />
    </ErrorCatcher>
  );
}
