import type { AnalysisResult, AnalysisSource } from '../types/analysis';
import { analyzeSSE, getResults } from '../utils/api';

export const apiAnalysisSource: AnalysisSource = {
  kind: 'app',

  analyze(batchId, onProgress, lang = 'zh') {
    return new Promise<void>((resolve, reject) => {
      analyzeSSE(
        batchId,
        (data) => onProgress({ stage: 'progress', message: data?.message ?? '', details: data }),
        () => {},
        () => {
          onProgress({ stage: 'complete', message: 'Analysis complete' });
          resolve();
        },
        (msg: string) => reject(new Error(msg)),
        lang,
      );
    });
  },

  async getResult(batchId: string): Promise<AnalysisResult> {
    return getResults(batchId) as Promise<AnalysisResult>;
  },
};
