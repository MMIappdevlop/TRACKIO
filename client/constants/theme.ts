import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#11181C",
    textSecondary: "#687076",
    textMuted: "#9BA1A6",
    buttonText: "#FFFFFF",
    tabIconDefault: "#687076",
    tabIconSelected: "#4C7DFF",
    link: "#4C7DFF",
    linkPressed: "#3A63CC",
    linkBackground: "rgba(76, 125, 255, 0.12)",
    effort: "#E76F51",
    effortBackground: "rgba(231, 111, 81, 0.15)",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F2F2F2",
    backgroundSecondary: "#E6E6E6",
    backgroundTertiary: "#D9D9D9",
    border: "#E0E0E0",
    success: "#34C759",
    error: "#FF3B30",
    warning: "#FF9500",
    bronze: "#8C6A4A",
    silver: "#AEB4BC",
    steel: "#6E7C8C",
    gold: "#D4AF37",
  },
  dark: {
    text: "#d6e6f3",
    textSecondary: "#a6c5d7",
    textMuted: "#738c99",
    buttonText: "#FFFFFF",
    tabIconDefault: "#738c99",
    tabIconSelected: "#0f52ba",
    link: "#0f52ba",
    linkPressed: "#0a3d8c",
    linkBackground: "rgba(15, 82, 186, 0.12)",
    effort: "#e58753",
    effortBackground: "rgba(229, 135, 83, 0.15)",
    backgroundRoot: "#000926",
    backgroundDefault: "#0c1b3f",
    backgroundSecondary: "#172033",
    backgroundTertiary: "#1e2a42",
    border: "#1e2a42",
    success: "#30D158",
    error: "#FF453A",
    warning: "#FF9F0A",
    bronze: "#8C6A4A",
    silver: "#AEB4BC",
    steel: "#6E7C8C",
    gold: "#D4AF37",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  h4: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400" as const,
    fontFamily: "Inter_400Regular",
  },
  link: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
  },
  stat: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums" as const],
  },
  statSmall: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500" as const,
    fontFamily: "Inter_500Medium",
    fontVariant: ["tabular-nums" as const],
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  android: {
    sans: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  default: {
    sans: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    medium: "Inter, system-ui, sans-serif",
    semibold: "Inter, system-ui, sans-serif",
    bold: "Inter, system-ui, sans-serif",
  },
});

export const TaskModes = {
  strength: {
    label: "Strength",
    icon: "target",
    color: "#0f52ba",
  },
  distance: {
    label: "Distance",
    icon: "navigation",
    color: "#30D158",
  },
  interval: {
    label: "Interval",
    icon: "clock",
    color: "#e58753",
  },
  time: {
    label: "Time",
    icon: "watch",
    color: "#FF9F0A",
  },
  notes: {
    label: "Notes",
    icon: "file-text",
    color: "#a6c5d7",
  },
} as const;
