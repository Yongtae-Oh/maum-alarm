import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { calculateHR, calculateHRV, classifyState, ClassificationResult } from "@/lib/hrv-calculator";
import { sendDistressNotification } from "@/lib/notifications";
import {
  saveEvent, getThresholds, getLastAlertTime, setLastAlertTime, Thresholds, DEFAULT_THRESHOLDS,
  getMembership, setMembership, getTodayAlertCount, incrementTodayAlert,
  DAILY_ALERT_LIMIT_FREE, DAILY_ALERT_LIMIT_PAID, MembershipTier,
  saveFollowUpResult, FollowUpOutcome,
} from "@/lib/storage";

// ─── BLE module: graceful fallback for Expo Go / web ───────────────────────
let BleManagerClass: any = null;
try {
  if (Platform.OS !== "web") {
    BleManagerClass = require("react-native-ble-plx").BleManager;
  }
} catch {
  BleManagerClass = null;
}

// ─── Polar H10 BLE UUIDs ────────────────────────────────────────────────────
const HR_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb";
const HR_CHARACTERISTIC_UUID = "00002a37-0000-1000-8000-00805f9b34fb";

// ─── Demo simulation params ─────────────────────────────────────────────────
export type ScenarioType = "calm" | "stress" | "exercise" | "anxiety_spike" | "panic_attack" | "fatigue" | "sleep" | "meeting" | "obsession";

const SCENARIOS: Record<ScenarioType, { rrMean: number; rrVariance: number; motionBase: number; motionVariance: number }> = {
  calm: { rrMean: 923, rrVariance: 50, motionBase: 3, motionVariance: 2 },
  stress: { rrMean: 632, rrVariance: 22, motionBase: 5, motionVariance: 4 },
  exercise: { rrMean: 414, rrVariance: 15, motionBase: 75, motionVariance: 20 },
  anxiety_spike: { rrMean: 556, rrVariance: 18, motionBase: 6, motionVariance: 5 },
  panic_attack: { rrMean: 435, rrVariance: 12, motionBase: 10, motionVariance: 8 },
  fatigue: { rrMean: 1034, rrVariance: 30, motionBase: 2, motionVariance: 2 },
  sleep: { rrMean: 1154, rrVariance: 60, motionBase: 1, motionVariance: 1 },
  meeting: { rrMean: 833, rrVariance: 38, motionBase: 4, motionVariance: 3 },
  // 집착: HR 완만히 상승(~79bpm) + HRV 중등도 억제(~20ms RMSSD) + 극히 낮은 활동량
  obsession: { rrMean: 760, rrVariance: 14, motionBase: 1, motionVariance: 1 },
};

function randGaussian(mean: number, variance: number): number {
  const u = Math.random(), v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(300, Math.min(2000, mean + z * variance));
}

// ─── Parse Polar H10 Heart Rate Measurement characteristic ──────────────────
// Format: flags(1B) | hr(1-2B) | [ee(2B)] | [rr(2B)...]
// RR unit: 1/1024 sec → convert to ms
function parseHRMeasurement(base64: string): { hr: number; rrIntervals: number[] } {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const flags = bytes[0];
    const is16Bit = (flags & 0x01) !== 0;
    const hasEE = (flags & 0x08) !== 0;
    const hasRR = (flags & 0x10) !== 0;

    let offset = 1;
    const hr = is16Bit ? (bytes[offset++] | (bytes[offset++] << 8)) : bytes[offset++];
    if (hasEE) offset += 2;

    const rrIntervals: number[] = [];
    if (hasRR) {
      while (offset + 1 < bytes.length) {
        const raw = bytes[offset] | (bytes[offset + 1] << 8);
        rrIntervals.push((raw / 1024) * 1000);
        offset += 2;
      }
    }
    return { hr, rrIntervals };
  } catch {
    return { hr: 0, rrIntervals: [] };
  }
}

// ─── Scanned device info ─────────────────────────────────────────────────────
export interface ScannedDevice {
  id: string;
  name: string;
  rssi: number;
}

// ─── Context types ───────────────────────────────────────────────────────────
export interface BLEState {
  isConnected: boolean;
  isDemoMode: boolean;
  isScanning: boolean;
  isConnecting: boolean;
  bleAvailable: boolean;
  deviceName: string | null;
  currentHR: number;
  currentHRV: number;
  currentMotion: number;
  classification: ClassificationResult;
  scenario: ScenarioType;
  thresholds: Thresholds;
  rrBuffer: number[];
  scannedDevices: ScannedDevice[];
  connectError: string | null;
  isPaid: boolean;
  alertsToday: number;
  alertDailyLimit: number;
  connectDemo: () => void;
  disconnect: () => void;
  startScan: () => void;
  stopScan: () => void;
  connectDevice: (deviceId: string, deviceName: string) => Promise<void>;
  setScenario: (s: ScenarioType) => void;
  setThresholds: (t: Thresholds) => void;
  reloadThresholds: () => Promise<void>;
  upgradeToPaid: () => Promise<void>;
  downgradeToFree: () => Promise<void>;
  exerciseTransition: boolean;
  followUpReady: boolean;
  dismissFollowUp: (outcome: FollowUpOutcome) => Promise<void>;
}

const defaultClassification: ClassificationResult = {
  state: "calm",
  emotionalDistress: false,
  note: "기기를 연결하면 모니터링이 시작됩니다",
};

const BLEContext = createContext<BLEState>({
  isConnected: false,
  isDemoMode: false,
  isScanning: false,
  isConnecting: false,
  bleAvailable: false,
  deviceName: null,
  currentHR: 0,
  currentHRV: 0,
  currentMotion: 0,
  classification: defaultClassification,
  scenario: "calm",
  thresholds: DEFAULT_THRESHOLDS,
  rrBuffer: [],
  scannedDevices: [],
  connectError: null,
  isPaid: false,
  alertsToday: 0,
  alertDailyLimit: DAILY_ALERT_LIMIT_FREE,
  connectDemo: () => {},
  disconnect: () => {},
  startScan: () => {},
  stopScan: () => {},
  connectDevice: async () => {},
  setScenario: () => {},
  setThresholds: () => {},
  reloadThresholds: async () => {},
  upgradeToPaid: async () => {},
  downgradeToFree: async () => {},
  exerciseTransition: false,
  followUpReady: false,
  dismissFollowUp: async () => {},
});

const BUFFER_SIZE = 30;
const ALERT_COOLDOWN_MS = 60000;

export function BLEProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [currentHR, setCurrentHR] = useState(0);
  const [currentHRV, setCurrentHRV] = useState(0);
  const [currentMotion, setCurrentMotion] = useState(0);
  const [classification, setClassification] = useState<ClassificationResult>(defaultClassification);
  const [scenario, setScenarioState] = useState<ScenarioType>("calm");
  const [thresholds, setThresholdsState] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [alertsToday, setAlertsToday] = useState(0);
  const [alertDailyLimit, setAlertDailyLimit] = useState(DAILY_ALERT_LIMIT_FREE);

  const [bleAvailable, setBleAvailable] = useState(BleManagerClass !== null);
  const [exerciseTransition, setExerciseTransition] = useState(false);
  const [followUpReady, setFollowUpReady] = useState(false);

  const isPaidRef = useRef(false);
  const alertsTodayRef = useRef(0);
  const prevDistressRef = useRef(false);
  const exerciseTransitionRef = useRef(false);
  const followUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAlertEventIdRef = useRef<string | null>(null);
  const isDemoModeRef = useRef(false);

  const bleManager = useRef<any>(null);
  const connectedDevice = useRef<any>(null);
  const subscription = useRef<any>(null);
  const rrBufferRef = useRef<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scenarioRef = useRef<ScenarioType>("calm");
  const thresholdsRef = useRef<Thresholds>(DEFAULT_THRESHOLDS);

  // Init BleManager
  useEffect(() => {
    if (BleManagerClass) {
      try {
        bleManager.current = new BleManagerClass();
      } catch {
        // react-native-ble-plx native module unavailable (Expo Go) — disable BLE UI
        bleManager.current = null;
        setBleAvailable(false);
      }
    }
    getThresholds().then((t) => { setThresholdsState(t); thresholdsRef.current = t; });
    // 멤버십 + 오늘 알림 횟수 로드
    Promise.all([getMembership(), getTodayAlertCount()]).then(([tier, count]) => {
      const paid = tier === "paid";
      isPaidRef.current = paid;
      alertsTodayRef.current = count;
      setIsPaid(paid);
      setAlertsToday(count);
      setAlertDailyLimit(paid ? DAILY_ALERT_LIMIT_PAID : DAILY_ALERT_LIMIT_FREE);
    });
    return () => {
      bleManager.current?.destroy();
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.current?.remove();
    };
  }, []);

  const reloadThresholds = useCallback(async () => {
    const t = await getThresholds();
    setThresholdsState(t);
    thresholdsRef.current = t;
  }, []);

  const setScenario = useCallback((s: ScenarioType) => {
    setScenarioState(s);
    scenarioRef.current = s;
  }, []);

  const setThresholds = useCallback((t: Thresholds) => {
    setThresholdsState(t);
    thresholdsRef.current = t;
  }, []);

  // ─── 멤버십 업그레이드 / 다운그레이드 ───────────────────────────────────────
  const upgradeToPaid = useCallback(async () => {
    await setMembership("paid");
    isPaidRef.current = true;
    setIsPaid(true);
    setAlertDailyLimit(DAILY_ALERT_LIMIT_PAID);
  }, []);

  const downgradeToFree = useCallback(async () => {
    await setMembership("free");
    isPaidRef.current = false;
    setIsPaid(false);
    setAlertDailyLimit(DAILY_ALERT_LIMIT_FREE);
  }, []);

  // ─── Shared alert logic ─────────────────────────────────────────────────
  const handleDistress = useCallback(async (result: ClassificationResult, hr: number, hrv: number) => {
    if (!result.emotionalDistress) return;
    // ── 일일 알림 한도 체크 ─────────────────────────────────────────────────
    const dailyLimit = isPaidRef.current ? DAILY_ALERT_LIMIT_PAID : DAILY_ALERT_LIMIT_FREE;
    if (alertsTodayRef.current >= dailyLimit) return;
    const now = Date.now();
    const lastAlert = await getLastAlertTime();
    if (now - lastAlert <= ALERT_COOLDOWN_MS) return;
    await setLastAlertTime(now);
    // ── 카운트 증가 ────────────────────────────────────────────────────────
    const newCount = await incrementTodayAlert();
    alertsTodayRef.current = newCount;
    setAlertsToday(newCount);

    if (Platform.OS !== "web") {
      const type_ = result.state === "crisis" ? "crisis" : result.state === "anxiety" ? "anxiety" : "stress";
      if (type_ === "crisis") {
        const pulse = (delay: number) =>
          new Promise<void>((r) => setTimeout(async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); r(); }, delay));
        await pulse(0); await pulse(200); await pulse(400); await pulse(700); await pulse(900);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
    const type = result.state === "crisis" ? "crisis" : result.state === "anxiety" ? "anxiety" : "stress";
    await sendDistressNotification(type, hr, hrv, result.note);
    // 새 알림 발생 시 이전 전환 추적 초기화
    if (exerciseTransitionRef.current) {
      exerciseTransitionRef.current = false;
      setExerciseTransition(false);
      setFollowUpReady(false);
      if (followUpTimerRef.current) { clearTimeout(followUpTimerRef.current); followUpTimerRef.current = null; }
    }
    const eventId = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    lastAlertEventIdRef.current = eventId;
    await saveEvent({
      id: eventId,
      timestamp: new Date().toISOString(),
      type,
      severity: type === "crisis" ? "critical" : type === "anxiety" ? "high" : "medium",
      heartRate: hr,
      hrv,
      note: result.note,
      feedback: null,
    });
  }, []);

  // ─── Shared pipeline: RR intervals → HR/HRV → classification ───────────
  const processRR = useCallback(async (newRRs: number[], motion: number) => {
    for (const rr of newRRs) {
      rrBufferRef.current.push(rr);
      if (rrBufferRef.current.length > BUFFER_SIZE) rrBufferRef.current.shift();
    }
    if (rrBufferRef.current.length < 2) return;
    const hr = calculateHR(rrBufferRef.current);
    const hrv = calculateHRV(rrBufferRef.current);
    const result = classifyState(hr, hrv, motion, thresholdsRef.current);
    setCurrentHR(hr);
    setCurrentHRV(hrv);
    setCurrentMotion(Math.round(motion));
    setClassification(result);
    // ── 불안→운동 전환 감지 ─────────────────────────────────────────────────
    if (prevDistressRef.current && result.state === "exercise" && !result.emotionalDistress) {
      if (!exerciseTransitionRef.current) {
        exerciseTransitionRef.current = true;
        setExerciseTransition(true);
        if (followUpTimerRef.current) clearTimeout(followUpTimerRef.current);
        const delay = isDemoModeRef.current ? 30000 : 5 * 60 * 1000;
        followUpTimerRef.current = setTimeout(() => setFollowUpReady(true), delay);
      }
    }
    prevDistressRef.current = result.emotionalDistress;
    await handleDistress(result, hr, hrv);
  }, [handleDistress]);

  // ─── DEMO MODE ───────────────────────────────────────────────────────────
  const demoTick = useCallback(async () => {
    const params = SCENARIOS[scenarioRef.current];
    const rr = randGaussian(params.rrMean, params.rrVariance);
    const motion = Math.max(0, Math.min(100, params.motionBase + (Math.random() - 0.5) * 2 * params.motionVariance));
    await processRR([rr], motion);
  }, [processRR]);

  // ─── 재확인 응답 처리 ────────────────────────────────────────────────────
  const dismissFollowUp = useCallback(async (outcome: FollowUpOutcome) => {
    if (lastAlertEventIdRef.current) {
      await saveFollowUpResult(lastAlertEventIdRef.current, outcome);
      lastAlertEventIdRef.current = null;
    }
    exerciseTransitionRef.current = false;
    setExerciseTransition(false);
    setFollowUpReady(false);
    if (followUpTimerRef.current) { clearTimeout(followUpTimerRef.current); followUpTimerRef.current = null; }
  }, []);

  const connectDemo = useCallback(() => {
    isDemoModeRef.current = true;
    prevDistressRef.current = false;
    exerciseTransitionRef.current = false;
    setExerciseTransition(false);
    setFollowUpReady(false);
    rrBufferRef.current = [];
    setIsConnected(true);
    setIsDemoMode(true);
    setDeviceName("DEMO MODE");
    setConnectError(null);
    intervalRef.current = setInterval(demoTick, 1000);
  }, [demoTick]);

  // ─── REAL BLE: Scan ──────────────────────────────────────────────────────
  const startScan = useCallback(() => {
    if (!bleManager.current) return;
    setScannedDevices([]);
    setConnectError(null);
    setIsScanning(true);

    bleManager.current.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error: any, device: any) => {
        if (error) {
          setIsScanning(false);
          setConnectError(error.message ?? "스캔 오류가 발생했습니다");
          return;
        }
        if (!device) return;
        const name: string = device.name ?? device.localName ?? "";
        if (!name.toLowerCase().includes("polar")) return;
        setScannedDevices((prev) => {
          if (prev.some((d) => d.id === device.id)) return prev;
          return [...prev, { id: device.id, name, rssi: device.rssi ?? -99 }];
        });
      }
    );

    // Auto-stop scan after 15 seconds
    setTimeout(() => {
      bleManager.current?.stopDeviceScan();
      setIsScanning(false);
    }, 15000);
  }, []);

  const stopScan = useCallback(() => {
    bleManager.current?.stopDeviceScan();
    setIsScanning(false);
  }, []);

  // ─── REAL BLE: Connect ───────────────────────────────────────────────────
  const connectDevice = useCallback(async (deviceId: string, name: string) => {
    if (!bleManager.current) return;
    setIsConnecting(true);
    setConnectError(null);
    stopScan();

    try {
      const device = await bleManager.current.connectToDevice(deviceId, {
        autoConnect: false,
        requestMTU: 512,
      });
      await device.discoverAllServicesAndCharacteristics();
      connectedDevice.current = device;

      // Monitor disconnection
      device.onDisconnected((_error: any, _dev: any) => {
        subscription.current?.remove();
        connectedDevice.current = null;
        rrBufferRef.current = [];
        setIsConnected(false);
        setDeviceName(null);
        setCurrentHR(0);
        setCurrentHRV(0);
        setClassification(defaultClassification);
        if (_error) setConnectError("기기 연결이 끊어졌습니다");
      });

      // Subscribe to Heart Rate Measurement notifications
      subscription.current = device.monitorCharacteristicForService(
        HR_SERVICE_UUID,
        HR_CHARACTERISTIC_UUID,
        async (error: any, characteristic: any) => {
          if (error || !characteristic?.value) return;
          const { rrIntervals } = parseHRMeasurement(characteristic.value);
          if (rrIntervals.length > 0) {
            // Motion = 5 (resting baseline; PMD accelerometer not in standard BLE)
            await processRR(rrIntervals, 5);
          }
        }
      );

      setIsConnected(true);
      setIsDemoMode(false);
      setDeviceName(name);
      setIsConnecting(false);
    } catch (err: any) {
      setIsConnecting(false);
      setConnectError(err?.message ?? "연결에 실패했습니다. 다시 시도해 주세요.");
      connectedDevice.current = null;
    }
  }, [stopScan, processRR]);

  // ─── Disconnect ──────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    subscription.current?.remove();
    if (connectedDevice.current) {
      try { await connectedDevice.current.cancelConnection(); } catch { /* ignore */ }
      connectedDevice.current = null;
    }
    rrBufferRef.current = [];
    setIsConnected(false);
    setIsDemoMode(false);
    setDeviceName(null);
    setCurrentHR(0);
    setCurrentHRV(0);
    setCurrentMotion(0);
    setClassification(defaultClassification);
    setConnectError(null);
  }, []);

  return (
    <BLEContext.Provider value={{
      isConnected, isDemoMode, isScanning, isConnecting, bleAvailable,
      deviceName, currentHR, currentHRV, currentMotion, classification,
      scenario, thresholds, rrBuffer: rrBufferRef.current,
      scannedDevices, connectError,
      isPaid, alertsToday, alertDailyLimit,
      exerciseTransition, followUpReady,
      connectDemo, disconnect, startScan, stopScan, connectDevice,
      setScenario, setThresholds, reloadThresholds,
      upgradeToPaid, downgradeToFree, dismissFollowUp,
    }}>
      {children}
    </BLEContext.Provider>
  );
}

export function useBLE() {
  return useContext(BLEContext);
}
