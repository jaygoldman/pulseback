import { useContext } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { ThemeContext, eraList, eras } from "../theme";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "◉" },
  { to: "/photos", label: "Photos", icon: "⬛" },
  { to: "/albums", label: "Albums", icon: "▦" },
  { to: "/frame-settings", label: "Frame Settings", icon: "⚙" },
  { to: "/devices", label: "Devices", icon: "◈" },
  { to: "/users", label: "Users", icon: "◎" },
  { to: "/server-settings", label: "Settings", icon: "≡" },
];

function LogoMark({ style }: { style: string }) {
  switch (style) {
    case "script":
      return <span style={{ fontStyle: "italic", fontFamily: "Georgia, serif" }}>Pulseback</span>;
    case "serif-bold":
      return <span style={{ fontFamily: "Georgia, serif", fontWeight: 700 }}>PULSEBACK</span>;
    case "k-box":
      return (
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", background: "rgba(255,255,255,0.9)",
            borderRadius: "3px", fontSize: "20px", fontWeight: 900,
            color: "inherit", lineHeight: 1,
          }}>P</span>
          <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, letterSpacing: "1px" }}>PULSEBACK</span>
        </span>
      );
    case "sans-bold":
      return <span style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 700, letterSpacing: "2px" }}>PULSEBACK</span>;
    case "lowercase":
      return <span style={{ fontFamily: "-apple-system, sans-serif", fontWeight: 600, letterSpacing: "1px", textTransform: "lowercase" as const }}>pulseback</span>;
    default:
      return <span>PULSEBACK</span>;
  }
}

export function Layout() {
  const { theme, setEra } = useContext(ThemeContext);
  const t = theme;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: "220px",
        minWidth: "220px",
        background: t.colors.sidebarBg,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Logo area */}
        <div style={{
          background: `linear-gradient(135deg, ${t.colors.gradientStart} 0%, ${t.colors.accent || t.colors.gradientEnd} 60%, ${t.colors.gradientEnd} 100%)`,
          padding: "20px 16px 16px",
          position: "relative",
        }}>
          <div style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            lineHeight: 1.2,
          }}>
            <LogoMark style={t.logoStyle} />
          </div>
          <div style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.7)",
            marginTop: "6px",
            fontFamily: t.fonts.body,
            fontStyle: "italic",
          }}>
            {t.tagline}
          </div>
          {/* Film perforations along bottom */}
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: "6px",
            backgroundImage: `repeating-linear-gradient(90deg,
              transparent 0px, transparent 6px,
              rgba(0,0,0,0.25) 6px, rgba(0,0,0,0.25) 14px,
              transparent 14px, transparent 20px
            )`,
          }} />
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 16px",
                color: isActive ? t.colors.secondary : t.colors.sidebarText,
                background: isActive ? `${t.colors.primary}33` : "transparent",
                borderLeft: isActive ? `3px solid ${t.colors.primary}` : "3px solid transparent",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                fontFamily: t.fonts.body,
                transition: "background 0.15s, color 0.15s",
                textDecoration: "none",
              })}
            >
              <span style={{ fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 }}>
                {icon}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Era Selector */}
        <div style={{
          padding: "12px 16px",
          borderTop: `1px solid rgba(255,255,255,0.1)`,
        }}>
          <div style={{
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "rgba(255,255,255,0.4)",
            marginBottom: "6px",
            fontFamily: t.fonts.body,
          }}>
            Nostalgia Era
          </div>
          <select
            value={t.era}
            onChange={(e) => setEra(e.target.value as any)}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "rgba(255,255,255,0.1)",
              color: t.colors.sidebarText,
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: t.borderRadius,
              fontSize: "12px",
              fontFamily: t.fonts.body,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {eraList.map((era) => (
              <option key={era} value={era} style={{ background: "#333", color: "#fff" }}>
                {eras[era].label}
              </option>
            ))}
          </select>
        </div>

        {/* Film strip perforations on right edge */}
        <div style={{
          position: "absolute",
          right: 0, top: 0, bottom: 0,
          width: "8px",
          backgroundImage: `repeating-linear-gradient(180deg,
            transparent 0px, transparent 6px,
            rgba(0,0,0,0.5) 6px, rgba(0,0,0,0.5) 10px,
            transparent 10px, transparent 18px
          )`,
        }} />
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1,
        background: t.colors.background,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <Outlet />
      </main>
    </div>
  );
}
