import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import { colors, fonts, filmStripStyle } from "../theme";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "◉" },
  { to: "/photos", label: "Photos", icon: "⬛" },
  { to: "/albums", label: "Albums", icon: "▦" },
  { to: "/frame-settings", label: "Frame Settings", icon: "⚙" },
  { to: "/devices", label: "Devices", icon: "◈" },
  { to: "/users", label: "Users", icon: "◎" },
  { to: "/server-settings", label: "Settings", icon: "≡" },
];

const sidebarStyle: React.CSSProperties = {
  width: "220px",
  minWidth: "220px",
  background: colors.sidebarBg,
  display: "flex",
  flexDirection: "column",
  position: "relative",
  overflow: "hidden",
};

const logoAreaStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${colors.kodakRed} 0%, #FF6B00 60%, ${colors.kodakYellow} 100%)`,
  padding: "24px 20px 20px",
  position: "relative",
};

const kodakWordmarkStyle: React.CSSProperties = {
  fontFamily: fonts.heading,
  fontSize: "22px",
  fontWeight: 700,
  color: "white",
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  lineHeight: 1,
};

const navContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: "16px 0",
  overflowY: "auto" as const,
};

const filmStripRightStyle: React.CSSProperties = {
  ...filmStripStyle,
  backgroundImage: `repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 6px,
    rgba(0,0,0,0.6) 6px,
    rgba(0,0,0,0.6) 10px,
    transparent 10px,
    transparent 18px
  )`,
  width: "10px",
  right: 0,
  top: 0,
  bottom: 0,
  position: "absolute",
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  background: colors.warmCream,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
};

export function Layout() {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Logo area */}
        <div style={logoAreaStyle}>
          <div style={kodakWordmarkStyle}>PULSEBACK</div>
          {/* Decorative film perforations along bottom of logo area */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "8px",
              backgroundImage: `repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 6px,
                rgba(0,0,0,0.25) 6px,
                rgba(0,0,0,0.25) 14px,
                transparent 14px,
                transparent 20px
              )`,
            }}
          />
        </div>

        {/* Navigation */}
        <nav style={navContainerStyle}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "11px 20px",
                color: isActive ? colors.kodakYellow : colors.sidebarText,
                background: isActive
                  ? "rgba(227, 24, 55, 0.25)"
                  : "transparent",
                borderLeft: isActive
                  ? `3px solid ${colors.kodakRed}`
                  : "3px solid transparent",
                fontSize: "14px",
                fontWeight: isActive ? 600 : 400,
                fontFamily: fonts.body,
                transition: "background 0.15s, color 0.15s",
                textDecoration: "none",
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (!el.getAttribute("aria-current")) {
                  el.style.background = "rgba(255,255,255,0.08)";
                  el.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                if (!el.getAttribute("aria-current")) {
                  el.style.background = "transparent";
                  el.style.color = colors.sidebarText;
                }
              }}
            >
              <span style={{ fontSize: "16px", width: "18px", textAlign: "center", flexShrink: 0 }}>
                {icon}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Film strip perforations on the right edge */}
        <div style={filmStripRightStyle} />
      </aside>

      {/* Main content */}
      <main style={mainContentStyle}>
        <Outlet />
      </main>
    </div>
  );
}
