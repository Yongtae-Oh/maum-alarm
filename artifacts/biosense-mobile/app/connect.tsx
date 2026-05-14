import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useBLE, ScannedDevice } from "@/context/BLEContext";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

function SignalBars({ rssi }: { rssi: number }) {
  const level = rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;
  const color = level >= 3 ? "#10b981" : level === 2 ? "#f59e0b" : "#ef4444";
  return (
    <View style={bars.row}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={[bars.bar, { height: n * 4 + 4, backgroundColor: n <= level ? color : "#374151" }]}
        />
      ))}
    </View>
  );
}

function ScanRing({ scanning }: { scanning: boolean }) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!scanning) {
      scale1.setValue(1); scale2.setValue(1);
      opacity1.setValue(0); opacity2.setValue(0);
      return;
    }
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale1, { toValue: 2.2, duration: 1600, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(scale2, { toValue: 2.2, duration: 1600, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale2, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity2, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop1.start();
    loop2.start();
    return () => { loop1.stop(); loop2.stop(); };
  }, [scanning]);

  return (
    <View style={ring.wrapper}>
      <Animated.View style={[ring.pulse, { opacity: opacity1, transform: [{ scale: scale1 }] }]} />
      <Animated.View style={[ring.pulse, { opacity: opacity2, transform: [{ scale: scale2 }] }]} />
      <View style={ring.center}>
        <Feather name="bluetooth" size={28} color="#22d3ee" />
      </View>
    </View>
  );
}

function DeviceItem({ device, onConnect, connecting }: { device: ScannedDevice; onConnect: () => void; connecting: boolean }) {
  const colors = useColors();
  const { t } = useI18n();
  return (
    <View style={[styles.deviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.deviceInfo}>
        <View style={[styles.deviceIcon, { backgroundColor: "#22d3ee18", borderColor: "#22d3ee40" }]}>
          <Feather name="heart" size={18} color="#22d3ee" />
        </View>
        <View style={styles.deviceText}>
          <Text style={[styles.deviceName, { color: colors.foreground }]}>{device.name}</Text>
          <Text style={[styles.deviceId, { color: colors.mutedForeground }]}>{device.id.slice(-8).toUpperCase()}</Text>
        </View>
        <SignalBars rssi={device.rssi} />
      </View>
      <Pressable
        onPress={onConnect}
        disabled={connecting}
        style={({ pressed }) => [
          styles.connectBtn,
          {
            backgroundColor: connecting ? colors.muted : "#22d3ee",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {connecting ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.connectBtnText}>{t.connect}</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function ConnectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const {
    bleAvailable,
    isScanning,
    isConnecting,
    isConnected,
    isDemoMode,
    scannedDevices,
    connectError,
    startScan,
    stopScan,
    connectDevice,
    connectDemo,
    disconnect,
  } = useBLE();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (isConnected && !isDemoMode) {
      router.back();
    }
  }, [isConnected, isDemoMode]);

  const handleScan = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isScanning) stopScan();
    else startScan();
  };

  const handleConnect = async (device: ScannedDevice) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await connectDevice(device.id, device.name);
  };

  const handleDemo = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    connectDemo();
    router.back();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t.connectTitle}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Already connected */}
        {isConnected && (
          <View style={[styles.connectedCard, { backgroundColor: "#22d3ee12", borderColor: "#22d3ee40" }]}>
            <Feather name="check-circle" size={18} color="#22d3ee" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.connectedTitle, { color: "#22d3ee" }]}>{t.connected}</Text>
              <Text style={[styles.connectedSub, { color: "#22d3eeaa" }]}>{isDemoMode ? t.connectedDemo : t.connectedDevice}</Text>
            </View>
            <Pressable onPress={handleDisconnect} style={[styles.disconnectBtn, { backgroundColor: colors.muted }]}>
              <Text style={[styles.disconnectText, { color: colors.mutedForeground }]}>{t.disconnect}</Text>
            </Pressable>
          </View>
        )}

        {/* No native BLE available (Expo Go / web) */}
        {!bleAvailable && (
          <View style={[styles.infoCard, { backgroundColor: "#f59e0b12", borderColor: "#f59e0b40" }]}>
            <Feather name="info" size={16} color="#f59e0b" />
            <Text style={[styles.infoText, { color: "#f59e0bcc" }]}>
              {t.bleUnavailable}
            </Text>
          </View>
        )}

        {/* Error */}
        {connectError !== null && (
          <View style={[styles.infoCard, { backgroundColor: "#ef444412", borderColor: "#ef444440" }]}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={[styles.infoText, { color: "#ef4444cc" }]}>{connectError}</Text>
          </View>
        )}

        {/* Scan area */}
        {bleAvailable && (
          <>
            <View style={styles.scanArea}>
              <ScanRing scanning={isScanning} />
              <Text style={[styles.scanStatus, { color: colors.mutedForeground }]}>
                {isScanning
                  ? t.scanning
                  : scannedDevices.length > 0
                  ? t.devicesFound(scannedDevices.length)
                  : t.scanPrompt}
              </Text>
            </View>

            <Pressable
              onPress={handleScan}
              disabled={isConnecting}
              style={({ pressed }) => [
                styles.scanBtn,
                {
                  backgroundColor: isScanning ? colors.muted : colors.primary,
                  borderColor: isScanning ? colors.border : colors.primary,
                  opacity: pressed || isConnecting ? 0.7 : 1,
                },
              ]}
            >
              <Feather name={isScanning ? "square" : "search"} size={18} color={isScanning ? colors.mutedForeground : "#000"} />
              <Text style={[styles.scanBtnText, { color: isScanning ? colors.mutedForeground : "#000" }]}>
                {isScanning ? t.scanStop : t.scanStart}
              </Text>
            </Pressable>

            {scannedDevices.length > 0 && (
              <View style={styles.deviceList}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t.devicesLabel}</Text>
                {scannedDevices.map((device) => (
                  <DeviceItem
                    key={device.id}
                    device={device}
                    connecting={isConnecting}
                    onConnect={() => handleConnect(device)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* How to pair guide */}
        {bleAvailable && !isScanning && scannedDevices.length === 0 && (
          <View style={[styles.guideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.guideTitle, { color: colors.foreground }]}>{t.guideTitle}</Text>
            {t.guideSteps.map((step, i) => (
              <View key={i} style={styles.guideRow}>
                <View style={[styles.guideNum, { backgroundColor: "#22d3ee20" }]}>
                  <Text style={styles.guideNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.guideStep, { color: colors.mutedForeground }]}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Demo divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>{t.orDivider}</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Demo mode */}
        <Pressable
          onPress={handleDemo}
          style={({ pressed }) => [
            styles.demoBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="cpu" size={18} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.demoBtnTitle, { color: colors.foreground }]}>{t.demoTitle}</Text>
            <Text style={[styles.demoBtnDesc, { color: colors.mutedForeground }]}>
              {t.demoDesc}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  connectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  connectedTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  connectedSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  disconnectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  disconnectText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  scanArea: { alignItems: "center", gap: 16, paddingVertical: 8 },
  scanStatus: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  scanBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  deviceList: { gap: 10 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  deviceCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  deviceInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  deviceIcon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  deviceText: { flex: 1 },
  deviceName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deviceId: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  connectBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, minHeight: 38 },
  connectBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
  guideCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  guideTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  guideNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  guideNumText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#22d3ee" },
  guideStep: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  demoBtnTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  demoBtnDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});

const bars = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  bar: { width: 4, borderRadius: 2 },
});

const ring = StyleSheet.create({
  wrapper: { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
  pulse: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#22d3ee",
  },
  center: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#22d3ee18",
    borderWidth: 2,
    borderColor: "#22d3ee60",
    alignItems: "center",
    justifyContent: "center",
  },
});
