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
        cx={14}
        cy={4.5}
        r={2}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M9 21L11.5 14L14 16V21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11.5 14L8.5 10.5L13 8L16 10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 8L16.5 7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={3}
        y1={11}
        x2={6}
        y2={11}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.5}
      />
      <Line
        x1={4}
        y1={14}
        x2={7}
        y2={14}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.4}
      />
      <Line
        x1={3}
        y1={17}
        x2={5.5}
        y2={17}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.3}
      />
    </Svg>
  );
}
