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
        d="M6 17L4.5 15.5C3.5 14.5 3 13 3 11.5C3 9 5 7 7.5 7C8.5 7 9.5 7.3 10.3 7.9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.3 7.9L14 10.5C14.5 10.8 15 11 15.5 11H16.5C17.9 11 19 12.1 19 13.5C19 14.9 17.9 16 16.5 16H13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 16L15.5 19.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 12C9.5 11.2 10.5 9.5 10.3 7.9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 12L10 15L8 17"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
