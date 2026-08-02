import { useContext } from 'react';
import { DemoTourContext } from './DemoTourProvider';
import type { DemoTourContextValue } from './DemoTourProvider';

/**
 * 访问导览状态机 — 必须在 DemoTourProvider 内使用。
 */
export function useDemoTour(): DemoTourContextValue {
  const ctx = useContext(DemoTourContext);
  if (!ctx) throw new Error('useDemoTour must be used within DemoTourProvider');
  return ctx;
}
