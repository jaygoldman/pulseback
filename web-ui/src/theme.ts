export const colors = {
  kodakRed: "#E31837",
  kodakYellow: "#FFD700",
  kodakGold: "#DAA520",
  warmCream: "#FFF8E7",
  darkBrown: "#3D2B1F",
  mediumBrown: "#6B4226",
  lightBrown: "#8B6914",
  warmWhite: "#FFFDF5",
  filmBlack: "#1A1A1A",
  success: "#4A7C59",
  danger: "#C0392B",
  warning: "#D4A017",
  cardBg: "#FFFEF9",
  sidebarBg: "#3D2B1F",
  sidebarText: "#FFF8E7",
  inputBorder: "#C9B99A",
  inputBg: "#FFFDF5",
  shadow: "rgba(61, 43, 31, 0.15)",
  shadowDark: "rgba(61, 43, 31, 0.3)",
};

export const fonts = {
  heading: "Georgia, 'Times New Roman', serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export const filmStripStyle: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(
    0deg,
    transparent,
    transparent 8px,
    ${colors.filmBlack} 8px,
    ${colors.filmBlack} 12px,
    transparent 12px,
    transparent 20px
  )`,
  width: "12px",
  position: "absolute" as const,
  top: 0,
  bottom: 0,
  right: 0,
};

export const cardStyle: React.CSSProperties = {
  background: colors.cardBg,
  borderRadius: "12px",
  boxShadow: `0 4px 12px ${colors.shadow}`,
  border: `1px solid ${colors.inputBorder}`,
  padding: "24px",
};

export const buttonStyle: React.CSSProperties = {
  background: colors.kodakRed,
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "10px 20px",
  fontFamily: fonts.body,
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
};

export const buttonSecondaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: colors.mediumBrown,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: `2px solid ${colors.inputBorder}`,
  borderRadius: "8px",
  fontFamily: fonts.body,
  fontSize: "14px",
  background: colors.inputBg,
  color: colors.darkBrown,
  boxSizing: "border-box" as const,
  outline: "none",
};

export const labelStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "13px",
  fontWeight: 600,
  color: colors.mediumBrown,
  marginBottom: "4px",
  display: "block",
};
