import { useSyncExternalStore } from "react";

export type PulseConfig = {
  ringDelays: number[];
  duration: number;
  startDiameter: number;
  endDiameter: number;
  strokeWidth: number;
  blur: number;
  blurX: number;
  distortion: number;
  distortionStart: number;
  originOffsetY: number;
  opacityKeyframes: number[];
  opacityTimes: number[];
  ease: [number, number, number, number];
  opacityEase: "linear" | "easeIn" | "easeOut" | "easeInOut";
};

export const DEFAULT_PULSE_CONFIG: PulseConfig = {
  ringDelays: [0, 0.22, 0.44],
  duration: 1.1,
  startDiameter: 1,
  endDiameter: 200,
  strokeWidth: 7.5,
  blur: 154,
  blurX: 112,
  distortion: 1.7,
  distortionStart: 0.25,
  originOffsetY: 0.7,
  opacityKeyframes: [0, 0.7, 0],
  opacityTimes: [0, 0.12, 1],
  ease: [0.16, 1, 0.3, 1],
  opacityEase: "linear",
};

let currentConfig: PulseConfig = DEFAULT_PULSE_CONFIG;
const listeners = new Set<() => void>();

export function setPulseConfig(updates: Partial<PulseConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
  for (const l of listeners) l();
}

export function resetPulseConfig(): void {
  currentConfig = DEFAULT_PULSE_CONFIG;
  for (const l of listeners) l();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => currentConfig;

export function usePulseConfig(): PulseConfig {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
