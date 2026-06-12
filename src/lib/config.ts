export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL;
}

export function isLiveMode(): boolean {
  return process.env.LIVE_MODE === 'true';
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
