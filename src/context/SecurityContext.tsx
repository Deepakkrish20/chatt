import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ChameleonMode,
  getChameleonConfig,
  setChameleonPins,
  disableChameleon,
  verifyChameleonPin,
} from '@/lib/security/chameleon';

interface SecurityContextType {
  isChameleonConfigured: boolean;
  isLocked: boolean;
  chameleonMode: ChameleonMode;
  unlockWithPin: (pin: string) => Promise<{ success: boolean; mode?: ChameleonMode }>;
  lockApp: () => void;
  configureChameleon: (realPin: string, decoyPin: string) => Promise<{ success: boolean; error?: string }>;
  disableChameleonProtection: () => Promise<void>;
  refreshSecurityState: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isChameleonConfigured, setIsChameleonConfigured] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [chameleonMode, setChameleonMode] = useState<ChameleonMode>('real');

  const refreshSecurityState = useCallback(async () => {
    const config = await getChameleonConfig();
    const enabled = Boolean(config && config.isEnabled);
    setIsChameleonConfigured(enabled);
    if (enabled) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
      setChameleonMode('real');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getChameleonConfig().then((config) => {
      if (isMounted) {
        const enabled = Boolean(config && config.isEnabled);
        setIsChameleonConfigured(enabled);
        if (enabled) {
          setIsLocked(true);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const unlockWithPin = async (
    pin: string
  ): Promise<{ success: boolean; mode?: ChameleonMode }> => {
    const res = await verifyChameleonPin(pin);
    if (res.valid && res.mode) {
      setChameleonMode(res.mode);
      setIsLocked(false);
      return { success: true, mode: res.mode };
    }
    return { success: false };
  };

  const lockApp = () => {
    if (isChameleonConfigured) {
      setIsLocked(true);
    }
  };

  const configureChameleon = async (
    realPin: string,
    decoyPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await setChameleonPins(realPin, decoyPin);
    if (res.success) {
      setIsChameleonConfigured(true);
      setIsLocked(false);
      setChameleonMode('real');
    }
    return res;
  };

  const disableChameleonProtection = async () => {
    await disableChameleon();
    setIsChameleonConfigured(false);
    setIsLocked(false);
    setChameleonMode('real');
  };

  return (
    <SecurityContext.Provider
      value={{
        isChameleonConfigured,
        isLocked,
        chameleonMode,
        unlockWithPin,
        lockApp,
        configureChameleon,
        disableChameleonProtection,
        refreshSecurityState,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
