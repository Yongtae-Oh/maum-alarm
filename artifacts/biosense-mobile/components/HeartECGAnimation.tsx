import React, { useEffect } from "react";
import Svg, { Path, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { HEART_ECG_PATH, PATH_TOTAL_LENGTH } from "@/constants/heartPath";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Single dash segment — no second layer, no wrap-around artifact.
const PULSE_LEN = 90;
const CYCLE_MS  = 4400;

interface Props {
  size?: number;
  color?: string;
  dimOpacity?: number;
}

export function HeartECGAnimation({
  size = 260,
  color = "#22d3ee",
  dimOpacity = 0.1,
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false
    );
    return () => {
      progress.value = 0;
    };
  }, []);

  // CCW: dashOffset increases 0 → PATH_TOTAL_LENGTH.
  // Exactly one 90px dash segment travels the path — nothing to wrap.
  const pulseProps = useAnimatedProps(() => ({
    strokeDashoffset: PATH_TOTAL_LENGTH * progress.value,
  }));

  const base = {
    d: HEART_ECG_PATH,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const pulseDash = `${PULSE_LEN} ${PATH_TOTAL_LENGTH - PULSE_LEN}`;

  return (
    <Svg viewBox="0 0 1024 1024" width={size} height={size}>
      <Defs>
        <Filter id="hglow" x="-60%" y="-60%" width="220%" height="220%">
          <FeGaussianBlur stdDeviation="14" result="blur" />
          <FeMerge>
            <FeMergeNode in="blur" />
            <FeMergeNode in="SourceGraphic" />
          </FeMerge>
        </Filter>
      </Defs>

      {/* Static dim background */}
      <Path {...base} stroke={color} strokeOpacity={dimOpacity} strokeWidth={14} />

      {/* Single bright pulse — one segment, one offset, zero extra layers */}
      <AnimatedPath
        {...base}
        stroke={color}
        strokeOpacity={1}
        strokeWidth={16}
        strokeDasharray={pulseDash}
        animatedProps={pulseProps}
        filter="url(#hglow)"
      />
    </Svg>
  );
}
