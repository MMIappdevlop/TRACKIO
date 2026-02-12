import React from "react";
import Svg, { Circle, Path, Line } from "react-native-svg";

interface EnduranceIconProps {
  size?: number;
  color?: string;
}

export function EnduranceIcon({ size = 24, color = "#FFFFFF" }: EnduranceIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={10}
        cy={11}
        r={7.5}
        stroke={color}
        strokeWidth={1.8}
      />
      <Line
        x1={9}
        y1={2.2}
        x2={11}
        y2={2.2}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1={10}
        y1={2.2}
        x2={10}
        y2={3.5}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1={10}
        y1={11}
        x2={10}
        y2={7}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1={10}
        y1={11}
        x2={13}
        y2={11}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M19 17L21 15.5L22 17.5L20 19C19.5 20 19 20.5 18 21L17 20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 20L18.5 17L20 19"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
