import React from "react";
import { Feather } from "@expo/vector-icons";
import { StrengthIcon } from "./StrengthIcon";
import { EnduranceIcon } from "./EnduranceIcon";
import { IntervalIcon } from "./IntervalIcon";
import { SportIcon } from "./SportIcon";
import type { TaskMode } from "@/types";

interface ModeIconProps {
  mode: TaskMode;
  size?: number;
  color?: string;
}

export function ModeIcon({ mode, size = 24, color = "#FFFFFF" }: ModeIconProps) {
  switch (mode) {
    case "strength":
      return <StrengthIcon size={size} color={color} />;
    case "distance":
      return <EnduranceIcon size={size} color={color} />;
    case "interval":
      return <IntervalIcon size={size} color={color} />;
    case "time":
      return <Feather name="watch" size={size} color={color} />;
    case "notes":
      return <Feather name="file-text" size={size} color={color} />;
    default:
      return <SportIcon size={size} color={color} />;
  }
}
