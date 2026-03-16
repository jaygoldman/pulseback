import React from "react";

// ─── Era Definitions ───────────────────────────────────────────────

export type KodakEra = "1950s" | "1960s" | "1970s" | "1980s" | "1990s" | "2000s";

export interface EraTheme {
  era: KodakEra;
  label: string;
  tagline: string;
  colors: {
    primary: string;        // main brand color (red)
    secondary: string;      // secondary brand color (yellow/gold)
    accent: string;         // accent highlights
    background: string;     // page background
    cardBg: string;         // card/panel background
    sidebarBg: string;      // sidebar background
    sidebarText: string;    // sidebar text
    text: string;           // primary text
    textMuted: string;      // secondary text
    inputBorder: string;    // form borders
    inputBg: string;        // form backgrounds
    shadow: string;         // box shadow color
    shadowDark: string;     // darker shadow
    success: string;
    danger: string;
    warning: string;
    gradientStart: string;  // logo area gradient
    gradientEnd: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: string;     // corner rounding
  cardBorderRadius: string;
  buttonRadius: string;
  logoStyle: "script" | "serif-bold" | "k-box" | "sans-bold" | "lowercase";
}

// ─── 1950s: Mid-Century Warmth ─────────────────────────────────────
const era1950s: EraTheme = {
  era: "1950s",
  label: "1950s — Mid-Century Warmth",
  tagline: "Open Me First",
  colors: {
    primary: "#C41E1E",
    secondary: "#E8B629",
    accent: "#D4913A",
    background: "#FDF6E3",
    cardBg: "#FFFEF7",
    sidebarBg: "#2C1810",
    sidebarText: "#FDF6E3",
    text: "#2C1810",
    textMuted: "#6B4226",
    inputBorder: "#D4C5A0",
    inputBg: "#FFFEF7",
    shadow: "rgba(44, 24, 16, 0.12)",
    shadowDark: "rgba(44, 24, 16, 0.25)",
    success: "#4A7C59",
    danger: "#C41E1E",
    warning: "#D4913A",
    gradientStart: "#C41E1E",
    gradientEnd: "#E8B629",
  },
  fonts: {
    heading: "'Palatino Linotype', Palatino, Georgia, serif",
    body: "Georgia, 'Times New Roman', serif",
  },
  borderRadius: "4px",
  cardBorderRadius: "6px",
  buttonRadius: "4px",
  logoStyle: "script",
};

// ─── 1960s: The Corner Curl ────────────────────────────────────────
const era1960s: EraTheme = {
  era: "1960s",
  label: "1960s — The Corner Curl",
  tagline: "For Colorful Memories",
  colors: {
    primary: "#D32011",
    secondary: "#F5C518",
    accent: "#FF6B00",
    background: "#FFF9ED",
    cardBg: "#FFFFFF",
    sidebarBg: "#1A1A2E",
    sidebarText: "#F5C518",
    text: "#1A1A2E",
    textMuted: "#555577",
    inputBorder: "#CCBB88",
    inputBg: "#FFFFF5",
    shadow: "rgba(26, 26, 46, 0.12)",
    shadowDark: "rgba(26, 26, 46, 0.25)",
    success: "#2E8B57",
    danger: "#D32011",
    warning: "#FF6B00",
    gradientStart: "#D32011",
    gradientEnd: "#F5C518",
  },
  fonts: {
    heading: "'Trebuchet MS', 'Gill Sans', Helvetica, sans-serif",
    body: "Helvetica Neue, Helvetica, Arial, sans-serif",
  },
  borderRadius: "2px",
  cardBorderRadius: "3px",
  buttonRadius: "2px",
  logoStyle: "serif-bold",
};

// ─── 1970s: The Iconic K ──────────────────────────────────────────
const era1970s: EraTheme = {
  era: "1970s",
  label: "1970s — The Iconic K",
  tagline: "For the Times of Your Life",
  colors: {
    primary: "#E31837",
    secondary: "#FAB617",
    accent: "#DAA520",
    background: "#FFF8E7",
    cardBg: "#FFFEF9",
    sidebarBg: "#3D2B1F",
    sidebarText: "#FFF8E7",
    text: "#3D2B1F",
    textMuted: "#6B4226",
    inputBorder: "#C9B99A",
    inputBg: "#FFFDF5",
    shadow: "rgba(61, 43, 31, 0.15)",
    shadowDark: "rgba(61, 43, 31, 0.3)",
    success: "#4A7C59",
    danger: "#C0392B",
    warning: "#D4A017",
    gradientStart: "#E31837",
    gradientEnd: "#FAB617",
  },
  fonts: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  borderRadius: "8px",
  cardBorderRadius: "12px",
  buttonRadius: "8px",
  logoStyle: "k-box",
};

// ─── 1980s: Clean Corporate ────────────────────────────────────────
const era1980s: EraTheme = {
  era: "1980s",
  label: "1980s — True Colors",
  tagline: "America's Storyteller",
  colors: {
    primary: "#E30613",
    secondary: "#FAB617",
    accent: "#ED8B00",
    background: "#F5F3EE",
    cardBg: "#FFFFFF",
    sidebarBg: "#1C1C1C",
    sidebarText: "#FAB617",
    text: "#1C1C1C",
    textMuted: "#666666",
    inputBorder: "#CCCCCC",
    inputBg: "#FFFFFF",
    shadow: "rgba(0, 0, 0, 0.1)",
    shadowDark: "rgba(0, 0, 0, 0.2)",
    success: "#228B22",
    danger: "#E30613",
    warning: "#ED8B00",
    gradientStart: "#E30613",
    gradientEnd: "#FAB617",
  },
  fonts: {
    heading: "Futura, 'Century Gothic', 'Trebuchet MS', sans-serif",
    body: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  borderRadius: "4px",
  cardBorderRadius: "6px",
  buttonRadius: "4px",
  logoStyle: "sans-bold",
};

// ─── 1990s: Peak Brand ─────────────────────────────────────────────
const era1990s: EraTheme = {
  era: "1990s",
  label: "1990s — Take Pictures. Further.",
  tagline: "Take Pictures. Further.",
  colors: {
    primary: "#E30613",
    secondary: "#FAB617",
    accent: "#0066CC",
    background: "#F0EDE6",
    cardBg: "#FFFFFF",
    sidebarBg: "#222222",
    sidebarText: "#EEEEEE",
    text: "#222222",
    textMuted: "#777777",
    inputBorder: "#BBBBBB",
    inputBg: "#FFFFFF",
    shadow: "rgba(0, 0, 0, 0.08)",
    shadowDark: "rgba(0, 0, 0, 0.18)",
    success: "#339966",
    danger: "#CC3333",
    warning: "#FF9900",
    gradientStart: "#E30613",
    gradientEnd: "#ED8B00",
  },
  fonts: {
    heading: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    body: "Verdana, Geneva, Tahoma, sans-serif",
  },
  borderRadius: "6px",
  cardBorderRadius: "8px",
  buttonRadius: "6px",
  logoStyle: "sans-bold",
};

// ─── 2000s: Minimalist Reset ───────────────────────────────────────
const era2000s: EraTheme = {
  era: "2000s",
  label: "2000s — Share Moments. Share Life.",
  tagline: "Share Moments. Share Life.",
  colors: {
    primary: "#E30613",
    secondary: "#A0A0A0",
    accent: "#3388CC",
    background: "#FAFAFA",
    cardBg: "#FFFFFF",
    sidebarBg: "#2C2C2C",
    sidebarText: "#E0E0E0",
    text: "#333333",
    textMuted: "#999999",
    inputBorder: "#DDDDDD",
    inputBg: "#FFFFFF",
    shadow: "rgba(0, 0, 0, 0.06)",
    shadowDark: "rgba(0, 0, 0, 0.12)",
    success: "#33AA66",
    danger: "#DD3333",
    warning: "#FFAA00",
    gradientStart: "#E30613",
    gradientEnd: "#888888",
  },
  fonts: {
    heading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  borderRadius: "10px",
  cardBorderRadius: "14px",
  buttonRadius: "10px",
  logoStyle: "lowercase",
};

// ─── Theme Registry ────────────────────────────────────────────────

export const eras: Record<KodakEra, EraTheme> = {
  "1950s": era1950s,
  "1960s": era1960s,
  "1970s": era1970s,
  "1980s": era1980s,
  "1990s": era1990s,
  "2000s": era2000s,
};

export const eraList: KodakEra[] = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"];

// ─── Persistence ───────────────────────────────────────────────────

const STORAGE_KEY = "pulseback_era";

export function loadEra(): KodakEra {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in eras) return saved as KodakEra;
  return "1970s";
}

export function saveEra(era: KodakEra): void {
  localStorage.setItem(STORAGE_KEY, era);
  const token = localStorage.getItem("kps_token");
  if (token) {
    fetch("/api/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ era }),
    }).catch(() => {});
  }
}

export async function loadEraFromServer(): Promise<KodakEra> {
  try {
    const res = await fetch("/api/preferences");
    if (res.ok) {
      const prefs = await res.json();
      if (prefs.era && prefs.era in eras) {
        localStorage.setItem(STORAGE_KEY, prefs.era);
        return prefs.era as KodakEra;
      }
    }
  } catch {}
  return loadEra();
}

// ─── React Context ─────────────────────────────────────────────────

export const ThemeContext = React.createContext<{
  theme: EraTheme;
  setEra: (era: KodakEra) => void;
}>({
  theme: era1970s,
  setEra: () => {},
});

// ─── Convenience: derive style objects from the active theme ───────

export function getStyles(t: EraTheme) {
  return {
    card: {
      background: t.colors.cardBg,
      borderRadius: t.cardBorderRadius,
      boxShadow: `0 4px 12px ${t.colors.shadow}`,
      border: `1px solid ${t.colors.inputBorder}`,
      padding: "24px",
    } as React.CSSProperties,

    button: {
      background: t.colors.primary,
      color: "white",
      border: "none",
      borderRadius: t.buttonRadius,
      padding: "10px 20px",
      fontFamily: t.fonts.body,
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "opacity 0.2s",
    } as React.CSSProperties,

    buttonSecondary: {
      background: t.colors.textMuted,
      color: "white",
      border: "none",
      borderRadius: t.buttonRadius,
      padding: "10px 20px",
      fontFamily: t.fonts.body,
      fontSize: "14px",
      fontWeight: 600,
      cursor: "pointer",
      transition: "opacity 0.2s",
    } as React.CSSProperties,

    input: {
      width: "100%",
      padding: "10px 14px",
      border: `2px solid ${t.colors.inputBorder}`,
      borderRadius: t.borderRadius,
      fontFamily: t.fonts.body,
      fontSize: "14px",
      background: t.colors.inputBg,
      color: t.colors.text,
      boxSizing: "border-box" as const,
      outline: "none",
    } as React.CSSProperties,

    label: {
      fontFamily: t.fonts.body,
      fontSize: "13px",
      fontWeight: 600,
      color: t.colors.textMuted,
      marginBottom: "4px",
      display: "block",
    } as React.CSSProperties,
  };
}

// ─── Legacy exports (kept for backward compat during migration) ────

export const colors = era1970s.colors as any;
export const fonts = era1970s.fonts;

export const filmStripStyle: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(
    0deg,
    transparent,
    transparent 8px,
    #1A1A1A 8px,
    #1A1A1A 12px,
    transparent 12px,
    transparent 20px
  )`,
  width: "12px",
  position: "absolute" as const,
  top: 0,
  bottom: 0,
  right: 0,
};

export const cardStyle = getStyles(era1970s).card;
export const buttonStyle = getStyles(era1970s).button;
export const buttonSecondaryStyle = getStyles(era1970s).buttonSecondary;
export const inputStyle = getStyles(era1970s).input;
export const labelStyle = getStyles(era1970s).label;
