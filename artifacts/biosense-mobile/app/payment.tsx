import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useBLE } from "@/context/BLEContext";
import { useI18n } from "@/context/I18nContext";

type Step = "form" | "processing" | "success";

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export default function PaymentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { upgradeToPaid } = useBLE();
  const { t } = useI18n();

  const BENEFITS = [
    { icon: "bell",        label: t.benefit0label, sub: t.benefit0sub },
    { icon: "trending-up", label: t.benefit1label, sub: t.benefit1sub },
    { icon: "award",       label: t.benefit2label, sub: t.benefit2sub },
    { icon: "bar-chart-2", label: t.benefit3label, sub: t.benefit3sub },
  ];

  const [step, setStep] = useState<Step>("form");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const expiryRef = useRef<TextInput>(null);
  const cvcRef   = useRef<TextInput>(null);
  const nameRef  = useRef<TextInput>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const rawCard = cardNumber.replace(/\s/g, "");
    if (rawCard.length < 16) e.card = t.errCard;
    const [mm, yy] = expiry.split("/");
    if (!mm || !yy || mm.length < 2 || yy.length < 2) e.expiry = t.errExpiry;
    const mon = parseInt(mm ?? "0", 10);
    if (mon < 1 || mon > 12) e.expiry = t.errMonth;
    if (cvc.replace(/\D/g, "").length < 3) e.cvc = t.errCvc;
    if (cardName.trim().length < 2) e.name = t.errName;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePay() {
    if (!validate()) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("processing");

    await new Promise((r) => setTimeout(r, 2200));

    await upgradeToPaid();
    setStep("success");
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await new Promise((r) => setTimeout(r, 1800));
    router.back();
  }

  const BG   = "#0d0f14";
  const CARD = "#111520";
  const CYAN = "#22d3ee";

  if (step === "processing") {
    return (
      <View style={[styles.centeredFull, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={CYAN} />
        <Text style={[styles.processingText, { color: colors.foreground }]}>{t.payProcessing}</Text>
        <Text style={[styles.processingDesc, { color: colors.mutedForeground }]}>{t.payProcessDesc}</Text>
      </View>
    );
  }

  if (step === "success") {
    return (
      <View style={[styles.centeredFull, { backgroundColor: BG }]}>
        <View style={[styles.successCircle, { borderColor: CYAN + "60", backgroundColor: CYAN + "15" }]}>
          <Feather name="check" size={40} color={CYAN} />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>{t.paySuccess}</Text>
        <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>{t.paySuccessDesc}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>

        <View style={styles.header}>
          <View style={[styles.planBadge, { backgroundColor: CYAN + "18", borderColor: CYAN + "40" }]}>
            <Feather name="star" size={12} color={CYAN} />
            <Text style={[styles.planBadgeText, { color: CYAN }]}>{t.payTitle}</Text>
          </View>
          <Text style={[styles.price, { color: colors.foreground }]}>
            {t.payPrice}<Text style={[styles.pricePer, { color: colors.mutedForeground }]}>{t.payPer}</Text>
          </Text>
          <Text style={[styles.priceNote, { color: colors.mutedForeground }]}>{t.payNote}</Text>
        </View>

        <View style={[styles.benefitsCard, { backgroundColor: CARD }]}>
          {BENEFITS.map((b, i) => (
            <View
              key={b.icon}
              style={[
                styles.benefitRow,
                i < BENEFITS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#1e2530" },
              ]}
            >
              <View style={[styles.benefitIcon, { backgroundColor: CYAN + "15" }]}>
                <Feather name={b.icon as any} size={14} color={CYAN} />
              </View>
              <View style={styles.benefitText}>
                <Text style={[styles.benefitLabel, { color: colors.foreground }]}>{b.label}</Text>
                <Text style={[styles.benefitSub, { color: colors.mutedForeground }]}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: "#1e2530" }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>{t.payCardSection}</Text>
          <View style={[styles.dividerLine, { backgroundColor: "#1e2530" }]} />
        </View>

        {/* 카드 번호 */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.payCardNum}</Text>
          <View style={[styles.inputWrap, { backgroundColor: CARD, borderColor: errors.card ? "#ef4444" : "#1e2530" }]}>
            <Feather name="credit-card" size={16} color={errors.card ? "#ef4444" : colors.mutedForeground} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={colors.mutedForeground + "88"}
              keyboardType="number-pad"
              value={cardNumber}
              onChangeText={(t2) => {
                const fmt = formatCardNumber(t2);
                setCardNumber(fmt);
                setErrors((e) => ({ ...e, card: "" }));
                if (fmt.replace(/\s/g, "").length === 16) expiryRef.current?.focus();
              }}
              maxLength={19}
              returnKeyType="next"
              onSubmitEditing={() => expiryRef.current?.focus()}
            />
          </View>
          {errors.card ? <Text style={styles.errorText}>{errors.card}</Text> : null}
        </View>

        {/* 유효기간 + CVC */}
        <View style={styles.fieldRow}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.payExpiry}</Text>
            <View style={[styles.inputWrap, { backgroundColor: CARD, borderColor: errors.expiry ? "#ef4444" : "#1e2530" }]}>
              <TextInput
                ref={expiryRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder="MM/YY"
                placeholderTextColor={colors.mutedForeground + "88"}
                keyboardType="number-pad"
                value={expiry}
                onChangeText={(t2) => {
                  setExpiry(formatExpiry(t2));
                  setErrors((e) => ({ ...e, expiry: "" }));
                  if (formatExpiry(t2).length === 5) cvcRef.current?.focus();
                }}
                maxLength={5}
                returnKeyType="next"
                onSubmitEditing={() => cvcRef.current?.focus()}
              />
            </View>
            {errors.expiry ? <Text style={styles.errorText}>{errors.expiry}</Text> : null}
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.payCvc}</Text>
            <View style={[styles.inputWrap, { backgroundColor: CARD, borderColor: errors.cvc ? "#ef4444" : "#1e2530" }]}>
              <TextInput
                ref={cvcRef}
                style={[styles.input, { color: colors.foreground }]}
                placeholder="•••"
                placeholderTextColor={colors.mutedForeground + "88"}
                keyboardType="number-pad"
                secureTextEntry
                value={cvc}
                onChangeText={(t2) => {
                  setCvc(t2.replace(/\D/g, "").slice(0, 3));
                  setErrors((e) => ({ ...e, cvc: "" }));
                  if (t2.replace(/\D/g, "").length === 3) nameRef.current?.focus();
                }}
                maxLength={3}
                returnKeyType="next"
                onSubmitEditing={() => nameRef.current?.focus()}
              />
            </View>
            {errors.cvc ? <Text style={styles.errorText}>{errors.cvc}</Text> : null}
          </View>
        </View>

        {/* 카드 소지자 이름 */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t.payCardName}</Text>
          <View style={[styles.inputWrap, { backgroundColor: CARD, borderColor: errors.name ? "#ef4444" : "#1e2530" }]}>
            <Feather name="user" size={16} color={errors.name ? "#ef4444" : colors.mutedForeground} style={{ marginRight: 10 }} />
            <TextInput
              ref={nameRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder={t.payCardNamePh}
              placeholderTextColor={colors.mutedForeground + "88"}
              autoCapitalize="words"
              value={cardName}
              onChangeText={(t2) => {
                setCardName(t2);
                setErrors((e) => ({ ...e, name: "" }));
              }}
              returnKeyType="done"
              onSubmitEditing={handlePay}
            />
          </View>
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        <View style={styles.secureRow}>
          <Feather name="lock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.secureText, { color: colors.mutedForeground }]}>
            {t.paySecure}
          </Text>
        </View>

        <Pressable
          onPress={handlePay}
          style={[styles.payBtn, { backgroundColor: CYAN }]}
        >
          <Feather name="lock" size={16} color="#0d0f14" />
          <Text style={styles.payBtnText}>{t.payBtn}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>{t.payCancel}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { paddingHorizontal: 20, gap: 16 },
  centeredFull:   { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  closeBtn:       { alignSelf: "flex-end", padding: 6 },
  header:         { alignItems: "center", gap: 8, paddingVertical: 8 },
  planBadge:      { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  planBadgeText:  { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  price:          { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pricePer:       { fontSize: 16, fontFamily: "Inter_400Regular" },
  priceNote:      { fontSize: 12, fontFamily: "Inter_400Regular" },
  benefitsCard:   { borderRadius: 14, overflow: "hidden" },
  benefitRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  benefitIcon:    { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  benefitText:    { flex: 1 },
  benefitLabel:   { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  benefitSub:     { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1, lineHeight: 17 },
  dividerRow:     { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine:    { flex: 1, height: 1 },
  dividerText:    { fontSize: 12, fontFamily: "Inter_500Medium" },
  fieldGroup:     { gap: 6 },
  fieldRow:       { flexDirection: "row", gap: 12 },
  fieldLabel:     { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  inputWrap:      { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, height: 48 },
  input:          { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorText:      { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ef4444", marginTop: 2 },
  secureRow:      { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  secureText:     { fontSize: 11, fontFamily: "Inter_400Regular" },
  payBtn:         { borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  payBtnText:     { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0d0f14" },
  cancelBtn:      { alignItems: "center", paddingVertical: 8 },
  cancelText:     { fontSize: 14, fontFamily: "Inter_400Regular" },
  processingText: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  processingDesc: { fontSize: 14, fontFamily: "Inter_400Regular" },
  successCircle:  { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  successTitle:   { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  successDesc:    { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
