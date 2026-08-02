import { describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DemoAnalyzePage from './DemoAnalyzePage';

// mock 导航，避免分析完成后真实跳转
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('DemoAnalyzePage reasoning chain', () => {
  it('renders six stages with action/output details', async () => {
    render(
      <MemoryRouter>
        <DemoAnalyzePage />
      </MemoryRouter>,
    );

    // 分析是异步的（50ms/阶段），在 act 中推进定时器
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });

    // 六阶段标题都应出现
    const labels = ['检查数据结构', '构建供应链关系', '识别风险信号', '检测领域模式', '生成行动建议', '计算可复现性指纹'];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    // 每阶段都有"做什么"和"产出"
    expect(screen.getAllByText('做什么').length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText('产出').length).toBeGreaterThanOrEqual(6);
  });
});
