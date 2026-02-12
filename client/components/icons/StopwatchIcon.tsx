import React from "react";
import Svg, { Circle, Line, Rect, Path } from "react-native-svg";

interface StopwatchIconProps {
  size?: number;
  color?: string;
}

export function StopwatchIcon({ size = 24, color = "#FFFFFF" }: StopwatchIconProps) {
  const s = size;
  const cx = s / 2;
  const cy = s * 0.55;
  const r = s * 0.35;
  const sw = s * 0.08;

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <Rect
        x={cx - s * 0.1}
        y={s * 0.02}
        width={s * 0.2}
        height={s * 0.08}
        rx={s * 0.03}
        fill={color}
      />
      <Line
        x1={cx}
        y1={s * 0.1}
        x2={cx}
        y2={cy - r}
        stroke={color}
        strokeWidth={sw * 0.7}
        strokeLinecap="round"
      />
      <Line
        x1={cx + r * 0.65}
        y1={cy - r * 0.65}
        x2={cx + r * 0.85}
        y2={cy - r * 0.85}
        stroke={color}
        strokeWidth={sw * 0.7}
        strokeLinecap="round"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={color}
        strokeWidth={sw}
        fill="none"
      />
      <Line
        x1={cx}
        y1={cy}
        x2={cx}
        y2={cy - r * 0.6}
        stroke={color}
        strokeWidth={sw * 0.8}
        strokeLinecap="round"
      />
      <Line
        x1={cx}
        y1={cy}
        x2={cx + r * 0.4}
        y2={cy + r * 0.2}
        stroke={color}
        strokeWidth={sw * 0.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
