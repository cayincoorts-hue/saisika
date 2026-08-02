import type { AnalysisSource } from '../types/analysis';

export function selectAnalysisSource<T extends AnalysisSource>(
  mode: 'app' | 'demo',
  appSource: T,
  demoSource: T,
): T {
  return mode === 'demo' ? demoSource : appSource;
}
