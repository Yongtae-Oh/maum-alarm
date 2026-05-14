import React, { useEffect } from "react";
import { Image, Platform, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface Props {
  source: ReturnType<typeof require>;
  size?: number;
  borderRadius?: number;
  dotColor?: string;
  circleRatio?: number;
  dotSize?: number;
  speed?: number;
}

export function OrbitDotImage({
  source,
  size = 120,
  borderRadius,
  dotColor = "#22d3ee",
  circleRatio = 0.385,
  dotSize,
  speed = 3200,
}: Props) {
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(2 * Math.PI, { duration: speed, easing: Easing.linear }),
      -1,
      false
    );
    return () => { angle.value = 0; };
  }, [speed]);

  const radius = size * circleRatio;
  const resolvedDotSize = dotSize ?? Math.max(7, size * 0.07);
  const half = resolvedDotSize / 2;

  const dotStyle = useAnimatedStyle(() => {
    const x = Math.cos(angle.value) * radius;
    const y = Math.sin(angle.value) * radius;
    return {
      transform: [{ translateX: x }, { translateY: y }],
    };
  });

  const resolvedBorderRadius = borderRadius ?? size * 0.21;

  return (
    <View style={{ width: size, height: size }}>
      <Image
        source={source as any}
        style={{ width: size, height: size, borderRadius: resolvedBorderRadius }}
        resizeMode="cover"
      />
      {/* Orbit dot positioned at center of image, animated via transform */}
      <Animated.View
        style={[
          dotStyle,
          {
            position: "absolute",
            top: size / 2 - half,
            left: size / 2 - half,
            width: resolvedDotSize,
            height: resolvedDotSize,
            borderRadius: resolvedDotSize / 2,
            backgroundColor: dotColor,
            shadowColor: dotColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: resolvedDotSize * 1.4,
            elevation: 8,
            ...(Platform.OS === "web"
              ? { boxShadow: `0 0 ${resolvedDotSize * 1.4}px ${dotColor}` }
              : {}),
          },
        ]}
      />
    </View>
  );
}
