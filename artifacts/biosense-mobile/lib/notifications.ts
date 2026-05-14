import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function sendDistressNotification(
  type: "stress" | "anxiety" | "crisis",
  hr: number,
  hrv: number,
  note: string
): Promise<void> {
  if (Platform.OS === "web") return;

  const titles: Record<string, string> = {
    stress: "스트레스 감지",
    anxiety: "불안 감지",
    crisis: "⚠️ 위기 상황 감지",
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titles[type] ?? "생체신호 변화 감지",
      body: `지금 변화가 감지되었어요. HR ${hr} bpm · HRV ${hrv} ms`,
      data: { type, hr, hrv },
      sound: true,
    },
    trigger: null,
  });
}
