export interface RuntimeModeFlags {
  DEMO_MODE: boolean;
  LIVE_MODE: boolean;
  BRASILAPI_ENABLED: boolean;
  WIKIDATA_ENABLED: boolean;
  GOOGLE_SEARCH_ENABLED: boolean;
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

export function isWikidataEnabled(): boolean {
  return readBooleanEnv(process.env.WIKIDATA_ENABLED, false);
}

export function isGoogleSearchEnabled(): boolean {
  return readBooleanEnv(process.env.GOOGLE_SEARCH_ENABLED, false);
}

export function getRuntimeModeFlags(): RuntimeModeFlags {
  return {
    DEMO_MODE: isDemoMode(),
    LIVE_MODE: isLiveMode(),
    BRASILAPI_ENABLED: isBrasilApiEnabled(),
    WIKIDATA_ENABLED: isWikidataEnabled(),
    GOOGLE_SEARCH_ENABLED: isGoogleSearchEnabled(),
  };
}

export function logRuntimeMode(prefix = 'ARGUS runtime mode'): RuntimeModeFlags {
  const flags = getRuntimeModeFlags();
  console.info(prefix, flags);
  console.info('LIVE_MODE atual', flags.LIVE_MODE);
  console.info('DEMO_MODE atual', flags.DEMO_MODE);
  console.info('BRASILAPI_ENABLED atual', flags.BRASILAPI_ENABLED);
  console.info('WIKIDATA_ENABLED atual', flags.WIKIDATA_ENABLED);
  console.info('GOOGLE_SEARCH_ENABLED atual', flags.GOOGLE_SEARCH_ENABLED);
  return flags;
}

export function getMaxResultsPerCase(): number {
  const value = Number(process.env.MAX_RESULTS_PER_CASE ?? 20);
  return Number.isFinite(value) && value > 0 ? value : 20;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function getWikidataTimeoutMs(): number {
  const value = Number(process.env.WIKIDATA_TIMEOUT_MS ?? 3000);
  return Number.isFinite(value) && value > 0 ? value : 3000;
}

export function getMaxNameCandidatesPerCase(): number {
  const value = Number(process.env.MAX_NAME_CANDIDATES_PER_CASE ?? 5);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 10) : 5;
}


export function getGoogleSearchTimeoutMs(): number {
  const value = Number(process.env.GOOGLE_SEARCH_TIMEOUT_MS ?? 3000);
  return Number.isFinite(value) && value > 0 ? value : 3000;
}

export function getMaxGoogleQueriesPerCase(): number {
  const value = Number(process.env.MAX_GOOGLE_QUERIES_PER_CASE ?? 2);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 3) : 2;
}

export function getMaxWebResultsPerCase(): number {
  const value = Number(process.env.MAX_WEB_RESULTS_PER_CASE ?? 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 20) : 10;
}

export function hasGoogleSearchCredentials(): boolean {
  return Boolean(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX);
}
