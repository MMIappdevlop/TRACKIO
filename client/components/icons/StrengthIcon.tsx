import React from "react";
import Svg, { Path } from "react-native-svg";

interface StrengthIconProps {
  size?: number;
  color?: string;
}

export function StrengthIcon({ size = 24, color = "#FFFFFF" }: StrengthIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.2 14.4C4 13.5 3.2 12 3.2 10.4c0-2.6 2.2-4.8 4.8-4.8 1 0 2 .3 2.8.9l2.4 1.6c.8.5 1.7.8 2.6.8h1.4c1.6 0 2.8 1.2 2.8 2.8 0 1.6-1.2 2.8-2.8 2.8h-3.4l1.6 2.4c.8 1.2.4 2.8-.8 3.6-1.2.8-2.8.4-3.6-.8L7.6 15.2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M3 16.5L5.2 14.4L7.6 15.2L5.5 17.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
