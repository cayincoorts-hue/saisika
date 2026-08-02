import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DemoHomePage from './DemoHomePage';

describe('DemoHomePage', () => {
  it('renders the start button', () => {
    render(
      <MemoryRouter>
        <DemoHomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: '开始展示' })).toBeEnabled();
  });

  it('shows the virtual case badge', () => {
    render(
      <MemoryRouter>
        <DemoHomePage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/内置虚拟案例/).length).toBeGreaterThan(0);
  });
});
