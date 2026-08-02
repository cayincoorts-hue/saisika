import type {
  AnalysisProgress,
  AnalysisResult,
  DemoJourneySource,
  DemoFileSummary,
  FieldMapping,
} from '../types/analysis';
import { demoFiles, demoMappings } from './fixtures/case';
import fixtureResult from './fixtures/result.json';

const STAGES: Array<{ stage: string; message: string }> = [
  { stage: 'structure', message: '检查数据结构' },
  { stage: 'graph', message: '构建供应链关系' },
  { stage: 'risk', message: '识别风险信号' },
  { stage: 'domain', message: '检测领域模式' },
  { stage: 'decision', message: '生成行动建议' },
  { stage: 'fingerprint', message: '计算可复现性指纹' },
];

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const demoAnalysisSource: DemoJourneySource = {
  kind: 'demo',

  analyze(_batchId: string, onProgress: (p: AnalysisProgress) => void): Promise<void> {
    return new Promise<void>((resolve) => {
      let i = 0;
      const tick = () => {
        if (i >= STAGES.length) {
          resolve();
          return;
        }
        onProgress({ ...STAGES[i] });
        i++;
        setTimeout(tick, 50);
      };
      setTimeout(tick, 50);
    });
  },

  getResult(_batchId: string): Promise<AnalysisResult> {
    return Promise.resolve(deepCopy(fixtureResult) as AnalysisResult);
  },

  getFiles(): Promise<DemoFileSummary[]> {
    return Promise.resolve(deepCopy(demoFiles));
  },

  getMappings(): Promise<FieldMapping[]> {
    return Promise.resolve(deepCopy(demoMappings));
  },
};
