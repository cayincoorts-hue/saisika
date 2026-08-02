import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n/config';
import { DemoTourProvider } from '../demo/DemoTourProvider';
import DemoHomePage from './DemoHomePage';

function renderHome() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <DemoTourProvider>
          <DemoHomePage />
        </DemoTourProvider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

describe('DemoHomePage', () => {
  beforeEach(() => {
    i18n.changeLanguage('zh');
  });

  it('shows the landscape orientation notice', () => {
    renderHome();
    expect(screen.getByText(/请横屏使用，避免错位/)).toBeInTheDocument();
    expect(screen.getByText(/将手机旋转至横屏后体验更佳/)).toBeInTheDocument();
  });
  it('renders the start button', () => {
    renderHome();
    expect(screen.getByRole('button', { name: '开始展示' })).toBeEnabled();
  });

  it('shows the virtual case badge', () => {
    renderHome();
    expect(screen.getAllByText(/内置虚拟案例/).length).toBeGreaterThan(0);
  });

  it('renders the auto tour start button', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /自动导览/ })).toBeEnabled();
  });
});
