/**
 * Chameleon Duress PIN Security Layer.
 *
 * Provides high-assurance decoy protection:
 * - Real PIN: Unlocks true 10-member confidential circle
 * - Decoy PIN: Unlocks realistic, harmless decoy chats
 * - Zero clue to onlookers/adversaries that a dual vault exists
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAMELEON_CONFIG_KEY = '@chatt_chameleon_vault_v1';

export type ChameleonMode = 'real' | 'decoy';

export interface ChameleonConfig {
  isEnabled: boolean;
  realPin: string;
  decoyPin: string;
}

/**
 * Retrieve current Chameleon Duress configuration.
 */
export async function getChameleonConfig(): Promise<ChameleonConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CHAMELEON_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChameleonConfig;
  } catch {
    return null;
  }
}

/**
 * Configure or update Real and Decoy PINs.
 * Real and Decoy PINs must be distinct and exactly 4 digits.
 */
export async function setChameleonPins(
  realPin: string,
  decoyPin: string
): Promise<{ success: boolean; error?: string }> {
  const cleanReal = (realPin || '').trim();
  const cleanDecoy = (decoyPin || '').trim();

  if (cleanReal.length !== 4 || !/^\d{4}$/.test(cleanReal)) {
    return { success: false, error: 'Real PIN must be exactly 4 numeric digits.' };
  }

  if (cleanDecoy.length !== 4 || !/^\d{4}$/.test(cleanDecoy)) {
    return { success: false, error: 'Decoy PIN must be exactly 4 numeric digits.' };
  }

  if (cleanReal === cleanDecoy) {
    return { success: false, error: 'Decoy PIN cannot be identical to your Real PIN.' };
  }

  const config: ChameleonConfig = {
    isEnabled: true,
    realPin: cleanReal,
    decoyPin: cleanDecoy,
  };

  try {
    await AsyncStorage.setItem(CHAMELEON_CONFIG_KEY, JSON.stringify(config));
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save Chameleon PIN vault.' };
  }
}

/**
 * Disable Chameleon lock mode entirely.
 */
export async function disableChameleon(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAMELEON_CONFIG_KEY);
  } catch {
    // Ignore error
  }
}

/**
 * Verify input PIN against vault.
 * Returns mode ('real' or 'decoy') if matched.
 */
export async function verifyChameleonPin(
  inputPin: string
): Promise<{ valid: boolean; mode?: ChameleonMode }> {
  const config = await getChameleonConfig();
  if (!config || !config.isEnabled) {
    // If not configured, allow access as real
    return { valid: true, mode: 'real' };
  }

  const clean = (inputPin || '').trim();
  if (clean === config.realPin) {
    return { valid: true, mode: 'real' };
  }

  if (clean === config.decoyPin) {
    return { valid: true, mode: 'decoy' };
  }

  return { valid: false };
}
