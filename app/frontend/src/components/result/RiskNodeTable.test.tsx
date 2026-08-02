import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import RiskNodeTable from './RiskNodeTable';

// 可控的运行时模式 mock（demo / app）—— 用 getter 让组件每次访问读到最新值
const modeMocks = vi.hoisted(() => ({ isDemoMode: false }));
vi.mock('../../runtime/mode', () => ({
  get isDemoMode() {
    return modeMocks.isDemoMode;
  },
}));

// mock API：单测里绝不发真实请求
const apiMocks = vi.hoisted(() => ({
  getScenarioParams: vi.fn(),
  runScenarioCompare: vi.fn(),
}));
vi.mock('../../utils/api', () => ({
  getScenarioParams: apiMocks.getScenarioParams,
  runScenarioCompare: apiMocks.runScenarioCompare,
}));

const sampleData = {
  rows: [
    {
      node_id: 'n1',
      node_name: '供应商A',
      risk_level: 'high',
      risk_score: 0.9,
      risk_causes: ['库存告急'],
      risk_causes_detail: [],
      recommended_action: '补货',
      action_type: '补货',
    },
  ],
};

const defaultProps = {
  data: sampleData,
  batchId: 'batch-1',
  compareResult: null,
  compareLoading: false,
  compareError: '',
  onCompareResult: vi.fn(),
  onBackToNormal: vi.fn(),
};

function renderTable(props: Partial<typeof defaultProps> = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <RiskNodeTable {...defaultProps} {...props} />
    </I18nextProvider>,
  );
}

describe('RiskNodeTable', () => {
  beforeEach(() => {
    modeMocks.isDemoMode = false;
    apiMocks.getScenarioParams.mockReset();
    apiMocks.runScenarioCompare.mockReset();
    i18n.changeLanguage('zh');
  });

  it('renders a clickable Try Change button in app mode', async () => {
    // deferred promise：让加载态保持足够久以便断言
    let resolveParams!: (v: unknown) => void;
    apiMocks.getScenarioParams.mockReturnValue(
      new Promise((res) => { resolveParams = res; }),
    );
    renderTable();

    const btn = screen.getByRole('button', { name: '尝试更改' });
    expect(btn).toBeEnabled();

    // 点击进入编辑态：开始并发拉取参数
    await userEvent.click(btn);
    expect(apiMocks.getScenarioParams).toHaveBeenCalledWith('n1', 'batch-1');
    expect(screen.getByText('正在加载参数')).toBeInTheDocument();

    // 收尾 resolve，避免悬挂的 promise 导致告警
    resolveParams({ params: [] });
  });

  it('renders a disabled badge + download notice in demo mode and never calls the API', async () => {
    modeMocks.isDemoMode = true;
    renderTable();

    // 禁用徽标：可点但不会进入编辑态
    const badge = screen.getByText('尝试更改（网络演示不可用）');
    expect(badge).toBeInTheDocument();
    await userEvent.click(badge);
    expect(apiMocks.getScenarioParams).not.toHaveBeenCalled();
    expect(screen.queryByText('正在加载参数')).not.toBeInTheDocument();

    // 提示条 + 下载链接
    expect(screen.getByText(/网络演示暂不支持该功能/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '前往下载 →' });
    expect(link).toHaveAttribute('href', 'https://github.com/cayincoorts-hue/saisika/releases');

    // 没有可点击的“尝试更改”按钮
    expect(screen.queryByRole('button', { name: '尝试更改' })).not.toBeInTheDocument();
  });
});
