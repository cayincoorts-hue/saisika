import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemoTourProvider } from '../demo/DemoTourProvider';
import DemoHomePage from './DemoHomePage';

function renderHome() {
  return render(
    <MemoryRouter>
      <DemoTourProvider>
        <DemoHomePage />
      </DemoTourProvider>
    </MemoryRouter>,
  );
}

describe('DemoHomePage', () => {
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
