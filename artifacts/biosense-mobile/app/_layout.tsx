import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BLEProvider } from "@/context/BLEContext";
import { I18nProvider } from "@/context/I18nContext";

// KeyboardProvider is not supported on web — import conditionally
let KeyboardProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
if (Platform.OS !== "web") {
  try {
    KeyboardProvider = require("react-native-keyboard-controller").KeyboardProvider;
  } catch {
    KeyboardProvider = null;
  }
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "뒤로" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recover" options={{ presentation: "modal" }} />
      <Stack.Screen name="connect" options={{ presentation: "modal" }} />
      <Stack.Screen name="scenarios" options={{ presentation: "modal" }} />
      <Stack.Screen name="payment" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const inner = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nProvider>
        <BLEProvider>
          <RootLayoutNav />
        </BLEProvider>
      </I18nProvider>
    </GestureHandlerRootView>
  );

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          {KeyboardProvider ? <KeyboardProvider>{inner}</KeyboardProvider> : inner}
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
