/**
 * Privacy Lens (Anti-Shoulder Surfing / Hold-to-Reveal Engine)
 *
 * Conceals chat bubbles behind a frosted privacy layer by default.
 * Content dynamically reveals only while the user's finger is physically
 * pressing down on the specific bubble, protecting confidential chats from
 * prying eyes in public spaces (subways, cafes, offices).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PRIVACY_LENS = '@chatt_privacy_lens_enabled';

/**
 * Retrieve whether Privacy Lens mode is currently active.
 * Defaults to true for zero-trust privacy first posture.
 */
export async function getPrivacyLensEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PRIVACY_LENS);
    if (raw === null) {
      // Default to enabled for maximum anti-shoulder surfing privacy
      return true;
    }
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

/**
 * Persist Privacy Lens configuration.
 */
export async function setPrivacyLensEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_PRIVACY_LENS, JSON.stringify(enabled));
  } catch {
    // Ignore storage write error
  }
}

/**
 * Toggle Privacy Lens configuration and return new state.
 */
export async function togglePrivacyLens(): Promise<boolean> {
  const current = await getPrivacyLensEnabled();
  const next = !current;
  await setPrivacyLensEnabled(next);
  return next;
}
