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
          animation: 'fade',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Welcome',
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            title: 'Register',
            animation: 'slide_from_right',
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
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </>
  );
}
