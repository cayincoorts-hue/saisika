import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/config';
import DemoUploadPage from './DemoUploadPage';
import { demoAnalysisSource } from '../demo/demoAnalysisSource';
import type { DemoFileSummary } from '../types/analysis';

const files: DemoFileSummary[] = [
  { name: 'suppliers.csv', rows: 120, role: 'node', columns: ['id', 'name'] },
  { name: 'orders.csv', rows: 850, role: 'fact', columns: ['order_id', 'qty'] },
  { name: 'links.csv', rows: 60, role: 'edge', columns: ['from', 'to'] },
];

vi.spyOn(demoAnalysisSource, 'getFiles').mockResolvedValue(files);

function renderUpload() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <DemoUploadPage />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

/** 取 drop-zone 元素（组件用 data-tour 标记，无 data-testid） */
function dropZone() {
  const el = document.querySelector('[data-tour="drop-zone"]');
  if (!el) throw new Error('drop-zone not found');
  return el;
}

describe('DemoUploadPage', () => {
  beforeEach(() => {
    i18n.changeLanguage('zh');
  });

  it('shows the demo notice banner with download link', async () => {
    renderUpload();
    // 演示提示条 + 下载链接
    expect(await screen.findByText(/网络演示：仅内置虚拟案例表格/)).toBeInTheDocument();
    expect(screen.getByText(/不支持导入你自己的文件/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /前往下载/ });
    expect(link).toHaveAttribute('href', 'https://github.com/cayincoorts-hue/saisika/releases');
  });

  it('rejects real file drops with a visible warning instead of silently ignoring', async () => {
    renderUpload();
    await screen.findByText(/网络演示：仅内置虚拟案例表格/);

    const zone = dropZone();
    // 模拟从操作系统拖入真实文件（dataTransfer 带 Files，无 text/plain）
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [new File(['a,b\n1,2'], 'my-table.csv', { type: 'text/csv' })],
        getData: () => '',
        types: ['Files'],
      },
    });

    expect(screen.getByText('网络演示不支持导入真实文件')).toBeInTheDocument();
    expect(screen.getByText(/请下载应用，在本地导入你的表格/)).toBeInTheDocument();
  });

  it('still imports virtual tables via drag/click', async () => {
    renderUpload();
    await screen.findByText(/网络演示：仅内置虚拟案例表格/);

    // 点击第一张卡片 = 导入
    fireEvent.click(screen.getByText('suppliers.csv'));
    expect(screen.getByText(/已导入 1 \/ 3/)).toBeInTheDocument();

    // 拖入虚拟卡片（带 text/plain 名称）
    const zone = dropZone();
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [],
        getData: (k: string) => (k === 'text/plain' ? 'orders.csv' : ''),
        types: ['text/plain'],
      },
    });
    expect(screen.getByText(/已导入 2 \/ 3/)).toBeInTheDocument();
  });
});
