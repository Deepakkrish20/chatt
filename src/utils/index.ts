/**
 * Shared utility functions.
 */

import { MAX_REGISTERED_MEMBERS } from '@/types';

/**
 * Truncate long strings with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Extract 1-2 letter initials from a display name.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Validate whether the strict maximum 10-member limit has been reached.
 */
export function isMemberLimitReached(currentMemberCount: number): boolean {
  return currentMemberCount >= MAX_REGISTERED_MEMBERS;
}
