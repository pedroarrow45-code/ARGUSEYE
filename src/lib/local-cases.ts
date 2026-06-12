import type { CaseDetail } from '@/lib/types';

const STORAGE_KEY = 'argus-eye.local-cases.v1';
const DATE_FIELDS = new Set(['createdAt', 'updatedAt', 'accessedAt', 'publishedAt', 'startedAt', 'completedAt']);

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item)) as T;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      if (typeof item === 'string' && DATE_FIELDS.has(key)) {
        record[key] = new Date(item);
      } else if (item && typeof item === 'object') {
        record[key] = reviveDates(item);
      }
    }
  }

  return value;
}

export function getLocalCases(): CaseDetail[] {
  if (!hasBrowserStorage()) return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CaseDetail[];
    return reviveDates(parsed);
  } catch {
    return [];
  }
}

export function getLocalCaseById(id: string): CaseDetail | null {
  return getLocalCases().find((caseDetail) => caseDetail.id === id) ?? null;
}

export function saveLocalCase(caseDetail: CaseDetail): void {
  if (!hasBrowserStorage()) return;

  const cases = getLocalCases().filter((existing) => existing.id !== caseDetail.id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([caseDetail, ...cases]));
  window.dispatchEvent(new Event('argus-eye:cases-changed'));
}

export function clearLocalCases(): void {
  if (!hasBrowserStorage()) return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('argus-eye:cases-changed'));
}

export function subscribeToLocalCases(callback: () => void): () => void {
  if (!hasBrowserStorage()) return () => undefined;

  const handler = () => callback();
  window.addEventListener('storage', handler);
  window.addEventListener('argus-eye:cases-changed', handler);

  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('argus-eye:cases-changed', handler);
  };
}
