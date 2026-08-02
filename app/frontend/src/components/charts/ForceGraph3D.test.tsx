import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import ForceGraph3D from './ForceGraph3D';
import type { StaticGraphNode, StaticGraphLink } from '../demo/StaticNetworkGraph';

const sampleNodes: StaticGraphNode[] = [
  { id: 'n1', name: '供应商A', level: 1, risk_level: 'high', risk_score: 0.9, in_degree: 0, out_degree: 3, _degree: 3 },
  { id: 'n2', name: '工厂B', level: 2, risk_level: 'medium', risk_score: 0.6, in_degree: 2, out_degree: 1, _degree: 3 },
  { id: 'n3', name: '客户C', level: 3, risk_level: 'low', risk_score: 0.2, in_degree: 1, out_degree: 0, _degree: 1 },
];

const sampleEdges: StaticGraphLink[] = [
  { source: 'n1', target: 'n2', relation_type: 'supply', weight: 5 },
  { source: 'n2', target: 'n3', relation_type: 'deliver', weight: 3 },
];

function renderGraph() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ForceGraph3D nodes={sampleNodes} edges={sampleEdges} highlightNodeId={null} onNodeClick={() => {}} />
    </I18nextProvider>,
  );
}

describe('ForceGraph3D fallback', () => {
  const origCreateElement = document.createElement.bind(document);
  const origMatchMedia = window.matchMedia;

  afterEach(() => {
    document.createElement = origCreateElement;
    window.matchMedia = origMatchMedia;
    vi.restoreAllMocks();
  });

  it('renders the static 2D fallback when WebGL is unavailable', async () => {
    // 模拟 WebGL 不可用：canvas.getContext('webgl') 返回 null
    document.createElement = ((tag: string, options?: ElementCreationOptions) => {
      const el = origCreateElement(tag, options) as HTMLCanvasElement;
      if (tag === 'canvas') {
        (el as unknown as { getContext: unknown }).getContext = vi.fn((type: string) =>
          type === 'webgl' || type === 'experimental-webgl' ? null : null,
        );
      }
      return el;
    }) as typeof document.createElement;

    renderGraph();

    // 静态图容器（data-testid="static-graph"）应出现
    await screen.findByTestId('static-graph');
    // 节点数量应在图中呈现（SVG 节点圆）
    const circles = document.querySelectorAll('[data-testid="static-graph"] circle');
    expect(circles.length).toBeGreaterThanOrEqual(3);
  });

  it('disables auto-rotation when user prefers reduced motion', async () => {
    // 模拟 reduced-motion
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    renderGraph();

    // reduced-motion 下也走静态降级（更稳、无自动旋转）
    await screen.findByTestId('static-graph');
  });
});
