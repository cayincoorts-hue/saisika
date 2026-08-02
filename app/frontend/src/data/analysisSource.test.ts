import { describe, expect, it } from 'vitest';
import { selectAnalysisSource } from './analysisSource';
import type { AnalysisSource } from '../types/analysis';

const noop = () => Promise.resolve();
const appSource: AnalysisSource = { kind: 'app', analyze: noop, getResult: noop as never };
const demoSource: AnalysisSource = { kind: 'demo', analyze: noop, getResult: noop as never };

describe('selectAnalysisSource', () => {
  it('selects by runtime mode', () => {
    expect(selectAnalysisSource('app', appSource, demoSource)).toBe(appSource);
    expect(selectAnalysisSource('demo', appSource, demoSource)).toBe(demoSource);
  });
});
