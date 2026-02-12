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
        d="M7 18C5.5 17 4.5 15.5 4.5 13.5C4.5 11 6.5 9 9 9C9.5 9 10 9.1 10.5 9.3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.5 9.3C11.5 7 13.5 5.5 15.5 5C16.5 4.8 17.5 5 18 5.5C18.8 6.3 19 7.5 18.5 8.5C18 9.5 16.5 10.5 15 11"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 11C16 11 17 11.5 17.5 12.5C18 13.5 17.5 14.5 16.5 15L13.5 16.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.5 16.5L11 19.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 18L9 16L10.5 17.5L8.5 19.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
