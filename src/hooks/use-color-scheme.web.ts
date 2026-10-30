import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Hydration-safe color scheme hook for web SSR / static generation.
 */
export function useColorScheme() {
  const isHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const colorScheme = useRNColorScheme();

  if (isHydrated) {
    return colorScheme ?? 'dark';
  }

  return 'dark';
}
