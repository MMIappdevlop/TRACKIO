import React from "react";
import Svg, { Circle, Path, Line, Polyline } from "react-native-svg";

interface IntervalIconProps {
  size?: number;
  color?: string;
}

export function IntervalIcon({ size = 24, color = "#FFFFFF" }: IntervalIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={13}
        r={8.5}
        stroke={color}
        strokeWidth={1.8}
      />
      <Line
        x1={11}
        y1={3}
        x2={13}
        y2={3}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1={12}
        y1={3}
        x2={12}
        y2={4.5}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1={18.2}
        y1={6.8}
        x2={19.2}
        y2={5.8}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Polyline
        points="7,14 9,11 11,15 13,10 15,14 17,12"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
