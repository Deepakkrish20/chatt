import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const { colors, isDark } = useAppTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Chatt',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
