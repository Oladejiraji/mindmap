"use client";

import { button, useControls } from "leva";
import {
  DEFAULT_PULSE_CONFIG,
  setPulseConfig,
  type PulseConfig,
} from "./pulse-config";

const update =
  <K extends keyof PulseConfig>(key: K) =>
  (v: PulseConfig[K]) =>
    setPulseConfig({ [key]: v } as Partial<PulseConfig>);

const RING_COUNT = DEFAULT_PULSE_CONFIG.ringDelays.length;
const DEFAULT_RING_STAGGER =
  RING_COUNT > 1
    ? DEFAULT_PULSE_CONFIG.ringDelays[1] - DEFAULT_PULSE_CONFIG.ringDelays[0]
    : 0;
const setRingStagger = (v: number) =>
  setPulseConfig({
    ringDelays: Array.from({ length: RING_COUNT }, (_, i) => i * v),
  });

const RESET_VALUES = {
  duration: DEFAULT_PULSE_CONFIG.duration,
  startDiameter: DEFAULT_PULSE_CONFIG.startDiameter,
  endDiameter: DEFAULT_PULSE_CONFIG.endDiameter,
  strokeWidth: DEFAULT_PULSE_CONFIG.strokeWidth,
  blur: DEFAULT_PULSE_CONFIG.blur,
  blurX: DEFAULT_PULSE_CONFIG.blurX,
  distortion: DEFAULT_PULSE_CONFIG.distortion,
  distortionStart: DEFAULT_PULSE_CONFIG.distortionStart,
  originOffsetY: DEFAULT_PULSE_CONFIG.originOffsetY,
  ringStagger: DEFAULT_RING_STAGGER,
};

export function PulseConfigPanel() {
  const [, set] = useControls(() => ({
    duration: {
      value: DEFAULT_PULSE_CONFIG.duration,
      min: 0.2,
      max: 4,
      step: 0.05,
      onChange: update("duration"),
    },
    startDiameter: {
      value: DEFAULT_PULSE_CONFIG.startDiameter,
      min: 0,
      max: 200,
      step: 2,
      onChange: update("startDiameter"),
    },
    endDiameter: {
      value: DEFAULT_PULSE_CONFIG.endDiameter,
      min: 100,
      max: 1500,
      step: 10,
      onChange: update("endDiameter"),
    },
    strokeWidth: {
      value: DEFAULT_PULSE_CONFIG.strokeWidth,
      min: 0.5,
      max: 12,
      step: 0.5,
      onChange: update("strokeWidth"),
    },
    blur: {
      value: DEFAULT_PULSE_CONFIG.blur,
      min: 0,
      max: 200,
      step: 1,
      onChange: update("blur"),
    },
    blurX: {
      value: DEFAULT_PULSE_CONFIG.blurX,
      min: 0,
      max: 200,
      step: 1,
      onChange: update("blurX"),
    },
    distortion: {
      value: DEFAULT_PULSE_CONFIG.distortion,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: update("distortion"),
    },
    distortionStart: {
      value: DEFAULT_PULSE_CONFIG.distortionStart,
      min: 0,
      max: 1,
      step: 0.05,
      onChange: update("distortionStart"),
    },
    originOffsetY: {
      value: DEFAULT_PULSE_CONFIG.originOffsetY,
      min: 0,
      max: 1,
      step: 0.05,
      onChange: update("originOffsetY"),
    },
    ringStagger: {
      value: DEFAULT_RING_STAGGER,
      min: 0,
      max: 2,
      step: 0.05,
      onChange: setRingStagger,
    },
    Reset: button(() =>
      (set as (v: Record<string, unknown>) => void)(RESET_VALUES),
    ),
  }));

  return null;
}
