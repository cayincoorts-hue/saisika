import { expect, it } from 'vitest';
import result from './result.json';

it('contains a connected, explainable virtual result', () => {
  const graph = (result as any).visuals.propagation_timeline;
  expect(graph.nodes.length).toBeGreaterThan(0);
  expect(graph.edges.length).toBeGreaterThan(0);
  expect((result as any).visuals.domain_insights.status).toBe('ok');
});
