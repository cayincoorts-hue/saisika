export type RuntimeMode = 'app' | 'demo';

export function parseRuntimeMode(value: string | undefined): RuntimeMode {
  if (!value) return 'app';
  if (value === 'app' || value === 'demo') return value;
  throw new Error(`Unsupported VITE_APP_MODE: ${value}`);
}

export const runtimeMode = parseRuntimeMode(import.meta.env.VITE_APP_MODE);
export const isDemoMode = runtimeMode === 'demo';
