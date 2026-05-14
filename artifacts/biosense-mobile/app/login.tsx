import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, isLoading } = useAuth();
  const colors = useColors();
  const { lang } = useI18n();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>maum-alarm</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {lang === "ko"
            ? "마음이 보내는 첫 번째 신호"
            : "The first alarm your mind sends"}
        </Text>

        <View style={styles.divider} />

        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          {lang === "ko"
            ? "로그인하면 회복 기록과 급수 데이터가\n안전하게 저장됩니다"
            : "Log in to securely save your\nrecovery records and rank data"}
        </Text>

        <Pressable
          onPress={login}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.loginBtn,
            { opacity: isLoading || pressed ? 0.7 : 1 },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#0d0f14" size="small" />
          ) : (
            <Text style={styles.loginBtnText}>
              {lang === "ko" ? "로그인" : "Log in"}
            </Text>
          )}
        </Pressable>
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        {lang === "ko"
          ? "로그인 정보는 안전하게 보호됩니다"
          : "Your login is securely protected"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", alignItems: "center", paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  iconWrap: {
    width: 88, height: 88, borderRadius: 22, overflow: "hidden",
    marginBottom: 8, shadowColor: "#22d3ee", shadowOpacity: 0.3, shadowRadius: 12,
  },
  icon: { width: 88, height: 88 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },
  divider: { width: 48, height: 1, backgroundColor: "#22d3ee40", marginVertical: 8 },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  loginBtn: {
    marginTop: 16,
    backgroundColor: "#22d3ee",
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 100,
    minWidth: 200,
    alignItems: "center",
  },
  loginBtnText: { color: "#0d0f14", fontSize: 16, fontFamily: "Inter_700Bold" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
