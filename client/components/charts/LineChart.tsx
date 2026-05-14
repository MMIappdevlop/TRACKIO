import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, G, Rect } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

export interface ChartPoint {
  label: string;
  value: number;
  date: string;
}

interface LineChartProps {
  data: ChartPoint[];
  color: string;
  width: number;
  height?: number;
  formatValue?: (v: number) => string;
  showTooltip?: boolean;
}

const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_TOP = 18;
const PAD_BOTTOM = 28;
const NUM_GRIDLINES = 4;

export function LineChart({
  data,
  color,
  width,
  height = 180,
  formatValue,
  showTooltip = false,
}: LineChartProps) {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const innerW = width - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;

  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;
  const yPad = range === 0 ? maxVal * 0.1 || 1 : range * 0.15;
  const yMin = minVal - yPad;
  const yMax = maxVal + yPad;
  const yRange = yMax - yMin;

  const toX = (i: number) =>
    data.length === 1
      ? PAD_LEFT + innerW / 2
      : PAD_LEFT + (i / (data.length - 1)) * innerW;

  const toY = (v: number) => PAD_TOP + innerH * (1 - (v - yMin) / yRange);

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

  const pathD =
    points.length === 1
      ? `M ${points[0].x} ${points[0].y}`
      : points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const maxLabels = Math.max(1, Math.floor(innerW / 38));
  const stride =
    data.length <= maxLabels ? 1 : Math.ceil(data.length / maxLabels);

  const fmt =
    formatValue ||
    ((v: number) =>
      Math.abs(v) >= 1000
        ? `${(v / 1000).toFixed(1)}k`
        : Number.isInteger(v)
        ? String(v)
        : v.toFixed(1));

  const gridVals = Array.from({ length: NUM_GRIDLINES + 1 }, (_, i) => {
    const frac = i / NUM_GRIDLINES;
    return { frac, val: yMin + yRange * frac, y: PAD_TOP + innerH * (1 - frac) };
  });

  return (
    <View>
      <Svg width={width} height={height}>
        {gridVals.map(({ val, y }, i) => (
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
            <SvgText
              x={PAD_LEFT - 5}
              y={y + 4}
              textAnchor="end"
              fontSize={9}
              fill={theme.textMuted}
            >
              {fmt(val)}
            </SvgText>
          </G>
        ))}

        <Path
          d={pathD}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <G key={i}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={showTooltip ? 14 : 4}
              fill="transparent"
              onPress={
                showTooltip
                  ? () => setSelectedIndex(selectedIndex === i ? null : i)
                  : undefined
              }
            />
            <Circle
              cx={p.x}
              cy={p.y}
              r={selectedIndex === i ? 5 : 3.5}
              fill={selectedIndex === i ? color : theme.backgroundDefault}
              stroke={color}
              strokeWidth={selectedIndex === i ? 0 : 1.5}
              pointerEvents="none"
            />
          </G>
        ))}

        {showTooltip && selectedIndex !== null && (() => {
          const p = points[selectedIndex];
          const text = fmt(data[selectedIndex].value);
          const boxW = Math.max(36, text.length * 7 + 14);
          const boxH = 22;
          let bx = p.x - boxW / 2;
          if (bx < PAD_LEFT) bx = PAD_LEFT;
          if (bx + boxW > PAD_LEFT + innerW) bx = PAD_LEFT + innerW - boxW;
          const by = p.y - boxH - 8 < PAD_TOP ? p.y + 8 : p.y - boxH - 8;
          return (
            <G>
              <Rect x={bx} y={by} width={boxW} height={boxH} rx={5} fill={theme.backgroundSecondary} />
              <SvgText
                x={bx + boxW / 2}
                y={by + 15}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill={theme.text}
              >
                {text}
              </SvgText>
            </G>
          );
        })()}

        {data.map((d, i) => {
          if (i % stride !== 0) return null;
          return (
            <SvgText
              key={i}
              x={toX(i)}
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
