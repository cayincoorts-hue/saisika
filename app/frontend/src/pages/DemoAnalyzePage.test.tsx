import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DemoAnalyzePage from './DemoAnalyzePage';
import { DemoTourContext } from '../demo/DemoTourProvider';
import type { DemoTourContextValue } from '../demo/DemoTourProvider';

const navigateMock = vi.fn();

// mock 导航，避免分析完成后真实跳转
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

/** 构造一个导览上下文值 */
function makeTourValue(status: DemoTourContextValue['status']): DemoTourContextValue {
  return {
    status,
    stepIndex: 0,
    totalSteps: 14,
    totalMs: 62000,
    isReducedMotion: false,
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    exit: vi.fn(),
  };
}

function renderPage(tourStatus: DemoTourContextValue['status'] = 'idle') {
  return render(
    <MemoryRouter initialEntries={['/demo/analyze']}>
      <DemoTourContext.Provider value={makeTourValue(tourStatus)}>
        <DemoAnalyzePage />
      </DemoTourContext.Provider>
    </MemoryRouter>,
  );
}

describe('DemoAnalyzePage reasoning chain', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('renders six stages with action/output details', async () => {
    renderPage();

    // 分析是异步的（50ms/阶段），等待渲染完成
    await waitFor(
      () => {
        expect(screen.getAllByText('做什么').length).toBeGreaterThanOrEqual(6);
      },
      { timeout: 2000 },
    );

    // 六阶段标题都应出现
    const labels = ['检查数据结构', '构建供应链关系', '识别风险信号', '检测领域模式', '生成行动建议', '计算可复现性指纹'];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('auto-navigates to result after analysis completes (no tour)', async () => {
    renderPage('idle');

    // 分析 ~350ms 完成，600ms 后自动跳转；轮询等待导航发生
    await waitFor(
      () => {
        expect(navigateMock).toHaveBeenCalledWith('/demo/result');
      },
      { timeout: 3000 },
    );
  });

  it('does NOT auto-navigate while the tour is playing (tour controls the flow)', async () => {
    renderPage('playing');

    // 给足分析完成 + 跳转窗口的时间
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });

    // 导览播放中：页面不应自动跳转结果页
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
