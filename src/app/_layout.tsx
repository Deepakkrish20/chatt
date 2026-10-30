import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const { colors } = useAppTheme();

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'slide_from_right',
          animationDuration: 220,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Welcome',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            title: 'Register',
          }}
        />
        <Stack.Screen
          name="chats"
          options={{
            title: 'Chats',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            title: 'Chat',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Stack>
    </>
  );
}
