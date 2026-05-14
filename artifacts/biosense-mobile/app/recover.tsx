import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/I18nContext";

type ExerciseType = "478" | "box" | "release" | "grounding" | "shoulder";

const STATE_RECOMMENDED: Record<string, ExerciseType> = {
  stress:    "box",
  anxiety:   "478",
  crisis:    "478",
  obsession: "release",
  fatigue:   "grounding",
  meeting:   "box",
};

// ─── 호흡 가이드 ──────────────────────────────────────────────────────────────
function BreathingGuide({ phases }: { phases: { label: string; duration: number; color: string }[] }) {
  const [tick, setTick] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const cycleDuration = phases.reduce((a, p) => a + p.duration, 0);
  const pos = tick % cycleDuration;
  let cum = 0, phaseIdx = 0, elapsed = 0;
  for (let i = 0; i < phases.length; i++) {
    if (pos < cum + phases[i].duration) { phaseIdx = i; elapsed = pos - cum; break; }
    cum += phases[i].duration;
  }
  const phase = phases[phaseIdx];
  const progress = elapsed / phase.duration;

  const { t } = useI18n();
  const isInhale = phase.label === t.phaseInhale;
  const isExhale = phase.label.startsWith(t.phaseExhale);
  const targetScale = isInhale ? 0.7 + progress * 0.3 : isExhale ? 1 - progress * 0.3 : 1;

  useEffect(() => {
    Animated.timing(scaleAnim, { toValue: targetScale, duration: 500, useNativeDriver: true }).start();
  }, [tick]);

  const remaining = phase.duration - elapsed;

  return (
    <View style={breathStyles.wrapper}>
      <Animated.View style={[breathStyles.outerRing, { borderColor: phase.color + "30", transform: [{ scale: Animated.multiply(scaleAnim, 1.2) }] }]} />
      <Animated.View style={[breathStyles.circle, { backgroundColor: phase.color + "20", borderColor: phase.color + "80", transform: [{ scale: scaleAnim }] }]}>
        <Text style={[breathStyles.countText, { color: phase.color }]}>{remaining}</Text>
        <Text style={[breathStyles.phaseText, { color: phase.color + "cc" }]}>{phase.label}</Text>
      </Animated.View>
      <View style={breathStyles.phaseRow}>
        {phases.map((p, i) => (
          <View key={i} style={[breathStyles.phaseChip, { backgroundColor: i === phaseIdx ? p.color + "25" : "transparent", borderColor: i === phaseIdx ? p.color : "transparent" }]}>
            <Text style={[breathStyles.phaseChipText, { color: i === phaseIdx ? p.color : "#6b7280" }]}>{p.label} {p.duration}s</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 단계별 가이드 ────────────────────────────────────────────────────────────
function GuidedSteps({ steps }: { steps: { icon: string; text: string; color: string; duration: number }[] }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [tickInStep, setTickInStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { t } = useI18n();

  const step = steps[stepIdx];
  const totalSteps = steps.length;

  useEffect(() => {
    setTickInStep(0);
    progressAnim.setValue(0);
    Animated.timing(progressAnim, { toValue: 1, duration: step.duration * 1000, useNativeDriver: false }).start();
    const id = setInterval(() => {
      setTickInStep((ti) => {
        const next = ti + 1;
        if (next >= step.duration) {
          if (stepIdx < totalSteps - 1) {
            Animated.sequence([
              Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
              Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
            setStepIdx((s) => s + 1);
          }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stepIdx]);

  const remaining = step.duration - tickInStep;

  return (
    <View style={guidedStyles.wrapper}>
      <View style={guidedStyles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[guidedStyles.dot, { backgroundColor: i === stepIdx ? step.color : "#374151", width: i === stepIdx ? 20 : 6 }]} />
        ))}
      </View>
      <Animated.View style={[guidedStyles.iconCircle, { backgroundColor: step.color + "20", borderColor: step.color + "60", opacity: fadeAnim }]}>
        <Feather name={step.icon as any} size={36} color={step.color} />
      </Animated.View>
      <Animated.Text style={[guidedStyles.text, { color: "#f0f0f0", opacity: fadeAnim }]}>
        {step.text}
      </Animated.Text>
      <Text style={[guidedStyles.count, { color: step.color }]}>{t.secCounter(remaining)}</Text>
      <View style={guidedStyles.progressTrack}>
        <Animated.View style={[guidedStyles.progressFill, { backgroundColor: step.color, width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <Text style={guidedStyles.stepLabel}>{t.stepOf(stepIdx + 1, totalSteps)}</Text>
    </View>
  );
}

// ─── 운동 카드 ────────────────────────────────────────────────────────────────
function ExerciseCard({
  type, onPress, highlighted, colors,
}: { type: ExerciseType; onPress: () => void; highlighted: boolean; colors: ReturnType<typeof useColors> }) {
  const { t } = useI18n();

  const EXERCISE_META: Record<ExerciseType, { name: string; desc: string; duration: string; icon: string; color: string; tags: string[] }> = {
    "478":     { name: t.ex478name, desc: t.ex478desc, duration: t.ex478dur, icon: "wind",   color: "#22d3ee", tags: [t.ex478tag1, t.ex478tag2] },
    box:       { name: t.exBoxname, desc: t.exBoxdesc, duration: t.exBoxdur, icon: "square", color: "#a78bfa", tags: [t.exBoxtag1, t.exBoxtag2] },
    release:   { name: t.exRelname, desc: t.exReldesc, duration: t.exReldur, icon: "anchor", color: "#d946ef", tags: [t.exReltag1] },
    grounding: { name: t.exGrdname, desc: t.exGrddesc, duration: t.exGrddur, icon: "eye",    color: "#10b981", tags: [t.exGrdtag1, t.exGrdtag2] },
    shoulder:  { name: t.exShname,  desc: t.exShdesc,  duration: t.exShdur,  icon: "user",   color: "#f97316", tags: [t.exShtag1, t.exShtag2] },
  };

  const meta = EXERCISE_META[type];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.exerciseCard,
        highlighted
          ? { backgroundColor: meta.color + "18", borderColor: meta.color + "60", borderWidth: 1.5 }
          : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.exerciseIcon, { backgroundColor: meta.color + "20", borderColor: meta.color + "40" }]}>
        <Feather name={meta.icon as any} size={22} color={meta.color} />
      </View>
      <View style={styles.exerciseText}>
        <View style={styles.nameRow}>
          <Text style={[styles.exerciseName, { color: colors.foreground }]}>{meta.name}</Text>
          {highlighted && (
            <View style={[styles.recommendBadge, { backgroundColor: meta.color + "25", borderColor: meta.color + "60" }]}>
              <Text style={[styles.recommendBadgeText, { color: meta.color }]}>{t.recommendBadge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.exerciseDesc, { color: colors.mutedForeground }]}>{meta.desc}</Text>
        <View style={styles.tagRow}>
          {meta.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: meta.color + "15" }]}>
              <Text style={[styles.tagText, { color: meta.color }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={[styles.exerciseBadgeText, { color: colors.mutedForeground }]}>{meta.duration}</Text>
    </Pressable>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────
export default function RecoverScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const params  = useLocalSearchParams<{ state?: string }>();
  const { t } = useI18n();

  const incomingState = params.state ?? "";
  const recommended   = STATE_RECOMMENDED[incomingState] as ExerciseType | undefined;

  const STATE_REASON: Record<string, string> = {
    stress:    t.reasonStress,
    anxiety:   t.reasonAnxiety,
    crisis:    t.reasonCrisis,
    obsession: t.reasonObsession,
    fatigue:   t.reasonFatigue,
  };

  const PHASES_478 = [
    { label: t.phaseInhale,  duration: 4, color: "#22d3ee" },
    { label: t.phaseHold,    duration: 7, color: "#a78bfa" },
    { label: t.phaseExhale,  duration: 8, color: "#10b981" },
  ];
  const PHASES_BOX = [
    { label: t.phaseInhale,  duration: 4, color: "#22d3ee" },
    { label: t.phaseHold,    duration: 4, color: "#a78bfa" },
    { label: t.phaseExhale,  duration: 4, color: "#10b981" },
    { label: t.phaseHold,    duration: 4, color: "#f59e0b" },
  ];
  const PHASES_RELEASE = [
    { label: t.phaseInhale,   duration: 4, color: "#d946ef" },
    { label: t.phaseHold,     duration: 2, color: "#a78bfa" },
    { label: t.phaseExhaleR,  duration: 8, color: "#10b981" },
  ];
  const GROUNDING_STEPS = [
    { icon: "eye",       text: t.groundStep0, color: "#22d3ee", duration: 12 },
    { icon: "volume-2",  text: t.groundStep1, color: "#10b981", duration: 12 },
    { icon: "hand",      text: t.groundStep2, color: "#f59e0b", duration: 10 },
    { icon: "wind",      text: t.groundStep3, color: "#a78bfa", duration: 10 },
    { icon: "circle",    text: t.groundStep4, color: "#d946ef", duration: 8  },
  ];
  const SHOULDER_STEPS = [
    { icon: "search",    text: t.shoulderStep0, color: "#f97316", duration: 8  },
    { icon: "arrow-down",text: t.shoulderStep1, color: "#f59e0b", duration: 8  },
    { icon: "arrow-up",  text: t.shoulderStep2, color: "#ef4444", duration: 6  },
    { icon: "arrow-down",text: t.shoulderStep3, color: "#10b981", duration: 8  },
    { icon: "wind",      text: t.shoulderStep4, color: "#22d3ee", duration: 8  },
  ];

  const reason = STATE_REASON[incomingState] ?? "";

  const [active, setActive] = useState<ExerciseType | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const startExercise = (type: ExerciseType) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActive(type);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stopExercise = (completed = true) => {
    const finalElapsed = elapsed;
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(null);
    setElapsed(0);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (completed && finalElapsed > 0) {
      import("@/lib/storage").then(({ recordRecoverySession }) => {
        recordRecoverySession(true, finalElapsed).catch(() => {});
      });
    }
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const EXERCISE_NAMES: Record<ExerciseType, string> = {
    "478": t.ex478name, box: t.exBoxname, release: t.exRelname, grounding: t.exGrdname, shoulder: t.exShname,
  };

  // ── 운동 진행 화면 ──────────────────────────────────────────────────────────
  if (active) {
    const name = EXERCISE_NAMES[active];
    const phases = active === "478" ? PHASES_478 : active === "box" ? PHASES_BOX : PHASES_RELEASE;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.recoverHeader, { paddingTop: topPad + 8 }]}>
          <Pressable onPress={() => stopExercise(false)} style={styles.backBtn}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.recoverTitle, { color: colors.foreground }]}>{name}</Text>
          <Text style={[styles.timerText, { color: colors.mutedForeground }]}>{fmtTime(elapsed)}</Text>
        </View>

        <View style={styles.breathingContainer}>
          {(active === "478" || active === "box" || active === "release") && (
            <BreathingGuide phases={phases} />
          )}
          {active === "grounding" && <GuidedSteps steps={GROUNDING_STEPS} />}
          {active === "shoulder"  && <GuidedSteps steps={SHOULDER_STEPS}  />}
        </View>

        <View style={[styles.stopArea, { paddingBottom: bottomPad + 20 }]}>
          <Pressable
            onPress={() => stopExercise(true)}
            style={[styles.stopBtn, { backgroundColor: "#10b98115", borderColor: "#10b98140" }]}
          >
            <Feather name="check" size={18} color="#10b981" />
            <Text style={[styles.stopBtnText, { color: "#10b981" }]}>{t.done}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── 운동 목록 화면 ──────────────────────────────────────────────────────────
  const ALL_EXERCISES: ExerciseType[] = ["478", "box", "release", "grounding", "shoulder"];
  const others = ALL_EXERCISES.filter((e) => e !== recommended);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerBar, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>{t.recoverTitle}</Text>
      </View>

      {recommended && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t.recommended}</Text>
          <Text style={[styles.sectionReason, { color: colors.mutedForeground }]}>{reason}</Text>
          <ExerciseCard type={recommended} onPress={() => startExercise(recommended)} highlighted colors={colors} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          {recommended ? t.otherExercise : t.chooseExercise}
        </Text>
        <View style={styles.exerciseList}>
          {others.map((type) => (
            <ExerciseCard key={type} type={type} onPress={() => startExercise(type)} highlighted={false} colors={colors} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn:   { padding: 8 },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  section:      { paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" },
  sectionReason:{ fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10, lineHeight: 17 },
  exerciseList: { gap: 10 },
  exerciseCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, marginBottom: 0 },
  exerciseIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  exerciseText: { flex: 1, gap: 3 },
  nameRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  exerciseName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  recommendBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  recommendBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  exerciseDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  tagRow:       { flexDirection: "row", gap: 5, marginTop: 3 },
  tag:          { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  tagText:      { fontSize: 10, fontFamily: "Inter_500Medium" },
  exerciseBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  recoverHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 4 },
  recoverTitle:      { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  timerText:         { fontSize: 14, fontFamily: "Inter_500Medium", minWidth: 40, textAlign: "right" },
  breathingContainer:{ flex: 1, alignItems: "center", justifyContent: "center" },
  stopArea:          { paddingHorizontal: 16, paddingTop: 12 },
  stopBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  stopBtnText:       { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});

const breathStyles = StyleSheet.create({
  wrapper:      { alignItems: "center", gap: 32 },
  outerRing:    { position: "absolute", width: 240, height: 240, borderRadius: 120, borderWidth: 1 },
  circle:       { width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  countText:    { fontSize: 48, fontFamily: "Inter_700Bold", letterSpacing: -2 },
  phaseText:    { fontSize: 15, fontFamily: "Inter_500Medium", marginTop: -4 },
  phaseRow:     { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  phaseChip:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  phaseChipText:{ fontSize: 12, fontFamily: "Inter_600SemiBold" },
});

const guidedStyles = StyleSheet.create({
  wrapper:       { alignItems: "center", gap: 24, paddingHorizontal: 32 },
  dots:          { flexDirection: "row", gap: 6, alignItems: "center" },
  dot:           { height: 6, borderRadius: 3 },
  iconCircle:    { width: 110, height: 110, borderRadius: 55, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  text:          { fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 30 },
  count:         { fontSize: 36, fontFamily: "Inter_700Bold" },
  progressTrack: { width: "100%", height: 4, backgroundColor: "#1f2937", borderRadius: 2, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 2 },
  stepLabel:     { fontSize: 12, fontFamily: "Inter_500Medium", color: "#6b7280" },
});
