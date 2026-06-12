export interface RuntimeModeFlags {
  DEMO_MODE: boolean;
  LIVE_MODE: boolean;
  BRASILAPI_ENABLED: boolean;
}

export function readBooleanEnv(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined || value === '') return defaultValue;
  return value.toLowerCase() === 'true';
}

export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === 'true') return true;
  if (process.env.DEMO_MODE === 'false') return false;
  return !process.env.DATABASE_URL;
}

export function isLiveMode(): boolean {
  return readBooleanEnv(process.env.LIVE_MODE);
}

export function isBrasilApiEnabled(): boolean {
  return readBooleanEnv(process.env.BRASILAPI_ENABLED, true);
}

export function getRuntimeModeFlags(): RuntimeModeFlags {
  return {
    DEMO_MODE: isDemoMode(),
    LIVE_MODE: isLiveMode(),
    BRASILAPI_ENABLED: isBrasilApiEnabled(),
  };
}

export function logRuntimeMode(prefix = 'ARGUS runtime mode'): RuntimeModeFlags {
  const flags = getRuntimeModeFlags();
  console.info(prefix, flags);
  console.info('LIVE_MODE atual', flags.LIVE_MODE);
  console.info('DEMO_MODE atual', flags.DEMO_MODE);
  console.info('BRASILAPI_ENABLED atual', flags.BRASILAPI_ENABLED);
  return flags;
}

export function getMaxResultsPerCase(): number {
  const value = Number(process.env.MAX_RESULTS_PER_CASE ?? 20);
  return Number.isFinite(value) && value > 0 ? value : 20;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
