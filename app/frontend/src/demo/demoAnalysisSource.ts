import type {
  AnalysisProgress,
  AnalysisResult,
  DemoJourneySource,
  DemoFileSummary,
  FieldMapping,
} from '../types/analysis';
import { demoFiles, demoMappings } from './fixtures/case';
import fixtureResult from './fixtures/result.json';

const STAGES: Array<{ stage: string; message: string; details: Record<string, unknown> }> = [
  {
    stage: 'structure',
    message: '检查数据结构',
    details: {
      action: '校验 7 份表格的列名、数据类型与缺失值',
      output: '4 张节点表、2 张事实表、1 张关系表通过结构检查',
    },
  },
  {
    stage: 'graph',
    message: '构建供应链关系',
    details: {
      action: '按供应/配送关系连接 10 个节点，形成 12 条有向边',
      output: '网络拓扑：3 层结构（工厂 → 仓储 → 分销）',
    },
  },
  {
    stage: 'risk',
    message: '识别风险信号',
    details: {
      action: '计算单源依赖、交付延迟、质量波动三类风险指标',
      output: '2 个高风险节点（单源依赖 + 高延迟）、1 个中风险',
    },
  },
  {
    stage: 'domain',
    message: '检测领域模式',
    details: {
      action: '匹配牛鞭效应、VMI 库存、快速响应三种已知模式',
      output: '检出牛鞭效应迹象（库存波动逐级放大）',
    },
  },
  {
    stage: 'decision',
    message: '生成行动建议',
    details: {
      action: '按风险类型匹配预案库，生成可执行建议',
      output: '5 条建议：备份供应商、安全库存上调、交付窗口重谈',
    },
  },
  {
    stage: 'fingerprint',
    message: '计算可复现性指纹',
    details: {
      action: '对全部输入与参数做确定性哈希',
      output: '指纹 sha256:9f3a…c21e，任何复跑结果一致',
    },
  },
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
