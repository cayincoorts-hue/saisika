/**
 * 无声导览步骤定义 — 8 步，总时长约 34 秒（快速版）。
 *
 * 每一步指向页面上的 [data-tour="..."] 目标（绝不使用像素坐标），
 * 由 DemoTourProvider 负责路由导航、滚动定位与高亮。
 * 同页面的多个讲解点已合并为一步，减少重复停留。
 */

export interface TourStep {
  id: string;
  /** 该步骤所在的路由 */
  route: string;
  /** 高亮目标的选择器，形如 [data-tour="..."] */
  target: string;
  /** 讲解文案的 i18n key（zh/en 同步提供） */
  captionKey: string;
  /** 该步骤停留的毫秒数 */
  durationMs: number;
  /** 可选：需要模拟的页面动作 */
  action?: 'click' | 'scroll' | 'expand';
}

export const tourSteps: TourStep[] = [
  {
    id: 'home-hero',
    route: '/',
    target: '[data-tour="start-demo"]',
    captionKey: 'tour.homeHero',
    durationMs: 4000,
  },
  {
    id: 'upload-drop',
    route: '/demo/upload',
    target: '[data-tour="drop-zone"]',
    captionKey: 'tour.uploadDrop',
    durationMs: 4000,
  },
  {
    id: 'upload-next',
    route: '/demo/upload',
    target: '[data-tour="next-understand"]',
    captionKey: 'tour.uploadNext',
    durationMs: 3000,
  },
  {
    id: 'understand',
    route: '/demo/understand',
    target: '[data-tour="file-list"]',
    captionKey: 'tour.understand',
    durationMs: 5000,
  },
  {
    id: 'mapping',
    route: '/demo/mapping',
    target: '[data-tour="mapping-table"]',
    captionKey: 'tour.mapping',
    durationMs: 5000,
  },
  {
    id: 'analyze-progress',
    route: '/demo/analyze',
    target: '[data-tour="analysis-progress"]',
    captionKey: 'tour.analyzeProgress',
    durationMs: 4000,
  },
  {
    id: 'result-summary',
    route: '/demo/result',
    target: '[data-tour="result-summary"]',
    captionKey: 'tour.resultSummary',
    durationMs: 4000,
  },
  {
    id: 'result-download',
    route: '/demo/result',
    target: '[data-tour="result-download"]',
    captionKey: 'tour.resultDownload',
    durationMs: 5000,
  },
];

export const TOUR_TOTAL_MS = tourSteps.reduce((sum, s) => sum + s.durationMs, 0);
