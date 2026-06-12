export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE === 'true') return true;
  if (process.env.DEMO_MODE === 'false') return false;
  return !process.env.DATABASE_URL;
}

export function isLiveMode(): boolean {
  return process.env.LIVE_MODE === 'true';
}

export function isBrasilApiEnabled(): boolean {
  return process.env.BRASILAPI_ENABLED !== 'false';
}

export function getMaxResultsPerCase(): number {
  const value = Number(process.env.MAX_RESULTS_PER_CASE ?? 20);
  return Number.isFinite(value) && value > 0 ? value : 20;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
