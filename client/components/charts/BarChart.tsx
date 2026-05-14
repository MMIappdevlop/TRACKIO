import React from "react";
import { View } from "react-native";
import Svg, { Rect, Line, Text as SvgText, G } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

export interface ChartPoint {
  label: string;
  value: number;
  date: string;
}

interface BarChartProps {
  data: ChartPoint[];
  color: string;
  width: number;
  height?: number;
  formatValue?: (v: number) => string;
}

const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 28;
const NUM_GRIDLINES = 4;

export function BarChart({ data, color, width, height = 180, formatValue }: BarChartProps) {
  const { theme } = useTheme();

  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;

  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value));
  if (maxVal === 0) return null;

  const barSlotW = innerW / data.length;
  const barW = Math.max(4, Math.min(28, barSlotW * 0.55));

  const maxLabels = Math.max(1, Math.floor(innerW / 38));
  const stride = data.length <= maxLabels ? 1 : Math.ceil(data.length / maxLabels);

  const fmt =
    formatValue ||
    ((v: number) =>
      v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));

  return (
    <View>
      <Svg width={width} height={height}>
        {Array.from({ length: NUM_GRIDLINES + 1 }, (_, i) => i).map((i) => {
          const frac = i / NUM_GRIDLINES;
          const y = PAD_TOP + innerH * (1 - frac);
          const val = maxVal * frac;
          return (
            <G key={i}>
              <Line
                x1={PAD_LEFT}
                y1={y}
                x2={PAD_LEFT + innerW}
                y2={y}
                stroke={theme.border}
                strokeWidth={0.5}
                strokeDasharray={i === 0 ? undefined : "3,3"}
              />
              {i > 0 ? (
                <SvgText
                  x={PAD_LEFT - 5}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={9}
                  fill={theme.textMuted}
                >
                  {fmt(val)}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / maxVal) * innerH);
          const x = PAD_LEFT + i * barSlotW + barSlotW / 2 - barW / 2;
          const y = PAD_TOP + innerH - barH;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={color}
              opacity={0.85}
              rx={2}
            />
          );
        })}

        {data.map((d, i) => {
          if (i % stride !== 0) return null;
          const x = PAD_LEFT + i * barSlotW + barSlotW / 2;
          return (
            <SvgText
              key={i}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fontSize={9}
              fill={theme.textMuted}
            >
              {d.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
