import { describe, expect, it } from 'vitest';
// @ts-expect-error mode.ts is introduced in Task 2.
import { parseRuntimeMode } from './mode';

describe('parseRuntimeMode', () => {
  it('accepts only app and demo', () => {
    expect(parseRuntimeMode('demo')).toBe('demo');
    expect(parseRuntimeMode('app')).toBe('app');
    expect(parseRuntimeMode(undefined)).toBe('app');
    expect(() => parseRuntimeMode('preview')).toThrow('Unsupported VITE_APP_MODE');
  });
});
