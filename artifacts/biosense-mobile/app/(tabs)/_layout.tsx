import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

// ─── Native-only packages: safe dynamic require ──────────────────────────────
let isLiquidGlassAvailable: () => boolean = () => false;
let NativeTabs: any = null;
let Icon: any = null;
let Label: any = null;
let SymbolView: any = null;

try {
  const glassEffect = require("expo-glass-effect");
  if (typeof glassEffect?.isLiquidGlassAvailable === "function") {
    isLiquidGlassAvailable = glassEffect.isLiquidGlassAvailable;
  }
} catch { /* not available in Expo Go */ }

try {
  const nativeTabs = require("expo-router/unstable-native-tabs");
  NativeTabs = nativeTabs?.NativeTabs ?? null;
  Icon = nativeTabs?.Icon ?? null;
  Label = nativeTabs?.Label ?? null;
} catch { /* not available in Expo Go */ }

try {
  const symbols = require("expo-symbols");
  SymbolView = symbols?.SymbolView ?? null;
} catch { /* not available in Expo Go */ }
// ─────────────────────────────────────────────────────────────────────────────

function NativeTabLayout() {
  const { t } = useI18n();
  if (!NativeTabs || !Icon || !Label) return <ClassicTabLayout />;
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "waveform.path.ecg", selected: "waveform.path.ecg" }} />
        <Label>{t.tabMonitor}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>{t.tabLog}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rank">
        <Icon sf={{ default: "medal", selected: "medal.fill" }} />
        <Label>{t.tabRank}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>{t.tabSettings}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const TabIcon = (sfName: string, featherName: string, color: string) =>
    isIOS && SymbolView ? (
      <SymbolView name={sfName} tintColor={color} size={22} />
    ) : (
      <Feather name={featherName as any} size={22} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarHideOnKeyboard: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "extraLight"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabMonitor,
          tabBarIcon: ({ color }) => TabIcon("waveform.path.ecg", "activity", color),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: t.tabLog,
          tabBarIcon: ({ color }) => TabIcon("list.bullet", "list", color),
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          title: t.tabRank,
          tabBarIcon: ({ color }) => TabIcon("medal", "award", color),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabSettings,
          tabBarIcon: ({ color }) => TabIcon("gearshape", "settings", color),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  try {
    if (isLiquidGlassAvailable()) {
      return <NativeTabLayout />;
    }
  } catch { /* fallthrough */ }
  return <ClassicTabLayout />;
}
