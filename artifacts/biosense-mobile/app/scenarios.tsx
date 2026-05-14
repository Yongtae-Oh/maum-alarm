import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useBLE, ScenarioType } from "@/context/BLEContext";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

export default function ScenariosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { scenario, setScenario } = useBLE();
  const { t } = useI18n();

  const SCENARIOS: { id: ScenarioType; label: string; desc: string; color: string; icon: string }[] = [
    { id: "calm",          label: t.scCalm,        desc: t.scCalmDesc,        color: "#22d3ee", icon: "wind" },
    { id: "stress",        label: t.scStress,       desc: t.scStressDesc,      color: "#f59e0b", icon: "alert-circle" },
    { id: "anxiety_spike", label: t.scAnxiety,      desc: t.scAnxietyDesc,     color: "#f97316", icon: "zap" },
    { id: "panic_attack",  label: t.scPanicLabel,   desc: t.scPanicDesc,       color: "#ef4444", icon: "alert-triangle" },
    { id: "obsession",     label: t.scObsession,    desc: t.scObsessionDesc,   color: "#d946ef", icon: "anchor" },
    { id: "exercise",      label: t.scExercise,     desc: t.scExerciseDesc,    color: "#34d399", icon: "activity" },
    { id: "meeting",       label: t.scMeeting,      desc: t.scMeetingDesc,     color: "#a78bfa", icon: "users" },
    { id: "fatigue",       label: t.scFatigue,      desc: t.scFatigueDesc,     color: "#60a5fa", icon: "battery" },
    { id: "sleep",         label: t.scSleep,        desc: t.scSleepDesc,       color: "#818cf8", icon: "moon" },
  ];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSelect = (id: ScenarioType) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScenario(id);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t.scenarioTitle}</Text>
        <View style={{ width: 38 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {t.scenarioSubtitle}
      </Text>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {SCENARIOS.map((s) => {
          const active = scenario === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => handleSelect(s.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: active ? s.color + "18" : colors.card,
                  borderColor: active ? s.color + "80" : colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: s.color + "20", borderColor: s.color + "40" }]}>
                <Feather name={s.icon as any} size={20} color={s.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, { color: active ? s.color : colors.foreground }]}>
                  {s.label}
                </Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
              </View>
              {active && (
                <Feather name="check-circle" size={18} color={s.color} />
              )}
            </Pressable>
          );
        })}
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
    paddingBottom: 4,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    marginTop: 2,
  },
  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
