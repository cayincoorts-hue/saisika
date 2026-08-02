import { describe, expect, it, vi } from 'vitest';
import { demoAnalysisSource } from './demoAnalysisSource';

describe('demoAnalysisSource', () => {
  it('returns fixtures without fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await demoAnalysisSource.getResult('demo');
    expect(result.input_summary.node_count).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('emits the six approved progress stages in order', async () => {
    vi.useFakeTimers();
    const stages: string[] = [];
    const promise = demoAnalysisSource.analyze('demo', (p) => stages.push(p.stage));
    await vi.runAllTimersAsync();
    await promise;
    expect(stages).toEqual(['structure', 'graph', 'risk', 'domain', 'decision', 'fingerprint']);
    vi.useRealTimers();
  });
});
