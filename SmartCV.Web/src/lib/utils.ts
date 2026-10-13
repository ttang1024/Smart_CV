import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return isoString;
  }
}


let lastTimestampMs = 0;

/**
 * ISO timestamp that is strictly greater than the previous one returned, even when
 * called twice in the same millisecond. Used for records ordered by `createdAt`.
 */
export function monotonicIsoNow(): string {
  lastTimestampMs = Math.max(Date.now(), lastTimestampMs + 1);
  return new Date(lastTimestampMs).toISOString();
}
