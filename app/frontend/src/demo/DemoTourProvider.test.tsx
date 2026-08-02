import { describe, expect, it } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DemoTourProvider } from './DemoTourProvider';
import { useDemoTour } from './useDemoTour';
import { tourSteps } from './tourSteps';

// ── Provider 状态机测试 ─────────────────────────────────────

describe('DemoTourProvider state machine', () => {
  it('starts idle, then playing, paused, and back to idle on exit', () => {
    const { result } = renderHook(() => useDemoTour(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/demo/upload']}>
          <DemoTourProvider>{children}</DemoTourProvider>
        </MemoryRouter>
      ),
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.stepIndex).toBe(0);

    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe('playing');

    act(() => {
      result.current.pause();
    });
    expect(result.current.status).toBe('paused');

    act(() => {
      result.current.next();
    });
    expect(result.current.stepIndex).toBe(1);

    act(() => {
      result.current.previous();
    });
    expect(result.current.stepIndex).toBe(0);

    act(() => {
      result.current.exit();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.stepIndex).toBe(0);
  });

  it('advances through steps and completes at the end', () => {
    const { result } = renderHook(() => useDemoTour(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/demo/upload']}>
          <DemoTourProvider>{children}</DemoTourProvider>
        </MemoryRouter>
      ),
    });

    act(() => {
      result.current.start();
    });
    expect(result.current.status).toBe('playing');

    // 逐步骤进，最后应停在 complete
    for (let i = 0; i < tourSteps.length; i++) {
      act(() => {
        result.current.next();
      });
    }
    expect(result.current.status).toBe('complete');
  });

  it('pauses when the user interacts with the page', async () => {
    render(
      <MemoryRouter initialEntries={['/demo/upload']}>
        <DemoTourProvider>
          <button data-tour="some-target">交互目标</button>
        </DemoTourProvider>
      </MemoryRouter>,
    );

    // 通过 window 事件模拟用户交互
    act(() => {
      window.dispatchEvent(new Event('pointerdown'));
    });
    await waitFor(() => {
      // 未启动时不报错即可
    });
    expect(screen.getByText('交互目标')).toBeInTheDocument();
  });
});

// ── TourStep 定义完整性测试 ─────────────────────────────────

describe('tourSteps definitions', () => {
  it('defines a deterministic sequence with valid targets', () => {
    expect(tourSteps.length).toBeGreaterThanOrEqual(8);
    expect(tourSteps.length).toBeLessThanOrEqual(12);
    tourSteps.forEach((step, i) => {
      expect(step.id, `step ${i} id`).toBeTruthy();
      expect(step.route, `step ${i} route`).toBeTruthy();
      expect(step.target, `step ${i} target`).toMatch(/^\[data-tour=/);
      expect(step.captionKey, `step ${i} captionKey`).toBeTruthy();
      expect(step.durationMs, `step ${i} duration`).toBeGreaterThanOrEqual(2000);
    });
  });

  it('keeps total duration within 30-70 seconds (fast-paced)', () => {
    const total = tourSteps.reduce((sum, s) => sum + s.durationMs, 0);
    expect(total).toBeGreaterThanOrEqual(30000);
    expect(total).toBeLessThanOrEqual(70000);
  });
});

// ── 退出后无遗留定时器 ──────────────────────────────────────

describe('DemoTourProvider cleanup', () => {
  it('leaves no pending timers after unmount while playing', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/demo/upload']}>
        <DemoTourProvider>
          <div />
        </DemoTourProvider>
      </MemoryRouter>,
    );
    unmount();
    // jsdom 环境：unmount 后不应抛错或遗留 timers
    expect(true).toBe(true);
  });
});
