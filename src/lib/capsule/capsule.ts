/**
 * Time-Locked Memory Capsules Engine.
 *
 * Cryptographically sealed future messages that physically refuse
 * to reveal their content until a designated timestamp in the future.
 */

export interface TimeCapsulePayload {
  type: 'capsule';
  id: string;
  ciphertext: string;
  unlockAt: number; // UTC millisecond timestamp
  createdAt: number;
  title?: string;
}

const CAPSULE_PREFIX = 'CAPSULE:';

/**
 * Checks if a given message string represents a Time-Locked Capsule.
 */
export function isCapsuleMessage(content: string | undefined | null): boolean {
  if (!content) return false;
  if (content.startsWith(CAPSULE_PREFIX)) return true;
  if (content.startsWith('{"type":"capsule"') || content.startsWith('{"type": "capsule"')) return true;
  return false;
}

/**
 * Parses capsule metadata and ciphertext payload from message content.
 */
export function parseCapsuleMessage(content: string | undefined | null): TimeCapsulePayload | null {
  if (!content) return null;
  try {
    let jsonStr = content;
    if (content.startsWith(CAPSULE_PREFIX)) {
      jsonStr = content.substring(CAPSULE_PREFIX.length);
    }
    const parsed = JSON.parse(jsonStr);
    if (parsed && (parsed.type === 'capsule' || typeof parsed.unlockAt === 'number')) {
      return {
        type: 'capsule',
        id: parsed.id || `cap_${Date.now()}`,
        ciphertext: String(parsed.ciphertext || ''),
        unlockAt: Number(parsed.unlockAt) || Date.now(),
        createdAt: Number(parsed.createdAt) || Date.now(),
        title: parsed.title ? String(parsed.title) : undefined,
      };
    }
  } catch {
    // Not valid capsule JSON
  }
  return null;
}

/**
 * Formats capsule data into a persistent payload string.
 */
export function formatCapsuleMessage(data: Omit<TimeCapsulePayload, 'type'>): string {
  const payload: TimeCapsulePayload = {
    type: 'capsule',
    ...data,
  };
  return `${CAPSULE_PREFIX}${JSON.stringify(payload)}`;
}

/**
 * Checks if the capsule is currently unlocked based on current time.
 */
export function isCapsuleUnlocked(capsule: TimeCapsulePayload): boolean {
  return Date.now() >= capsule.unlockAt;
}

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUnlocked: boolean;
  formatted: string;
}

/**
 * Calculates remaining time until unlock and formats a live ticker string.
 */
export function getRemainingCountdown(unlockAt: number): CountdownState {
  const diffMs = unlockAt - Date.now();
  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isUnlocked: true,
      formatted: 'UNLOCKED',
    };
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecs / (3600 * 24));
  const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours < 10 ? '0' : ''}${hours}h ${minutes < 10 ? '0' : ''}${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes < 10 ? '0' : ''}${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  } else {
    formatted = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    isUnlocked: false,
    formatted,
  };
}

/**
 * Formats a friendly unlock date string (e.g., "Nov 6, 2026 at 12:00 AM").
 */
export function formatUnlockDate(unlockAt: number): string {
  const date = new Date(unlockAt);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
