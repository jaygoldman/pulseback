import React, { useContext, useEffect, useState } from "react";
import { api } from "../api";
import { ThemeContext, getStyles } from "../theme";

interface Photo {
  id: string;
  filename: string;
  displayPath: string;
  width: number;
  height: number;
  dateTaken: string | null;
  importedAt: string;
  fileSize: number;
}

interface Album {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

interface Device {
  id: string;
  deviceID: string;
  name: string;
  activationDate: string;
  lastSeen: string | null;
  storageInfo: { used: number; total: number } | null;
}

interface HealthCheck {
  status: string;
  uptime: number;
  checks: Record<string, { status: string; message?: string }>;
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 120_000;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  return d.toLocaleString();
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function Dashboard() {
  const { theme } = useContext(ThemeContext);
  const t = theme;
  const s = getStyles(t);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [p, a, d, h] = await Promise.all([
          api<Photo[]>("/api/photos"),
          api<Album[]>("/api/albums"),
          api<Device[]>("/api/devices"),
          api<HealthCheck>("/health"),
        ]);
        setPhotos(p);
        setAlbums(a);
        setDevices(d);
        setHealth(h);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const healthOk = health?.status === "ok";

  const pageStyle: React.CSSProperties = {
    padding: "32px",
    fontFamily: t.fonts.body,
    color: t.colors.text,
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: t.fonts.heading,
    fontSize: "32px",
    fontWeight: 700,
    color: t.colors.text,
    margin: "0 0 8px 0",
    letterSpacing: "0.5px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontFamily: t.fonts.heading,
    fontSize: "18px",
    fontWeight: 600,
    color: t.colors.textMuted,
    margin: "32px 0 12px 0",
  };

  const statRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "8px",
  };

  const statCardStyle: React.CSSProperties = {
    ...s.card,
    textAlign: "center" as const,
    padding: "20px",
  };

  const statLabelStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 600,
    color: t.colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "8px",
  };

  const statValueStyle: React.CSSProperties = {
    fontSize: "36px",
    fontWeight: 700,
    fontFamily: t.fonts.heading,
    color: t.colors.text,
    lineHeight: 1,
  };

  const deviceGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "16px",
  };

  const badgeStyle = (online: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 600,
    color: online ? t.colors.success : t.colors.textMuted,
    background: online ? `${t.colors.success}1A` : `${t.colors.textMuted}1A`,
    borderRadius: "20px",
    padding: "3px 10px",
    marginBottom: "12px",
  });

  const dotStyle = (online: boolean): React.CSSProperties => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: online ? t.colors.success : "#AAA",
    flexShrink: 0,
  });

  const deviceMetaStyle: React.CSSProperties = {
    fontSize: "12px",
    color: t.colors.textMuted,
    margin: "4px 0",
  };

  const storageBarOuter: React.CSSProperties = {
    marginTop: "12px",
    background: "rgba(0,0,0,0.08)",
    borderRadius: t.borderRadius,
    height: "8px",
    overflow: "hidden",
  };

  function StorageBar({ used, total }: { used: number; total: number }) {
    const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: t.colors.textMuted, marginBottom: "4px" }}>
          <span>{formatBytes(used)} used</span>
          <span>{formatBytes(total)} total</span>
        </div>
        <div style={storageBarOuter}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: pct > 80 ? t.colors.danger : pct > 60 ? t.colors.warning : t.colors.success,
              borderRadius: t.borderRadius,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Dashboard</h1>
      <p style={{ color: t.colors.textMuted, margin: "0 0 28px 0", fontSize: "14px" }}>
        Pulseback overview
      </p>

      {loading && (
        <div style={{ color: t.colors.textMuted, fontStyle: "italic" }}>Loading…</div>
      )}
      {error && (
        <div style={{ color: t.colors.danger, marginBottom: "16px" }}>Error: {error}</div>
      )}

      {!loading && (
        <>
          {/* Stat cards */}
          <div style={statRowStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Total Photos</div>
              <div style={statValueStyle}>{photos.length}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Total Albums</div>
              <div style={statValueStyle}>{albums.length}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Server Health</div>
              <div style={{ ...statValueStyle, fontSize: "20px", paddingTop: "8px" }}>
                <span
                  style={{
                    color: healthOk ? t.colors.success : t.colors.danger,
                    background: healthOk ? `${t.colors.success}1A` : `${t.colors.danger}1A`,
                    borderRadius: t.borderRadius,
                    padding: "4px 14px",
                    fontFamily: t.fonts.body,
                    fontWeight: 700,
                    fontSize: "14px",
                    display: "inline-block",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {health ? (healthOk ? "● Healthy" : "● Degraded") : "Unknown"}
                </span>
              </div>
              {health && (
                <div style={{ fontSize: "11px", color: t.colors.textMuted, marginTop: "8px" }}>
                  Uptime: {formatUptime(health.uptime)}
                </div>
              )}
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Devices</div>
              <div style={statValueStyle}>{devices.length}</div>
              <div style={{ fontSize: "12px", color: t.colors.success, marginTop: "4px" }}>
                {devices.filter(d => isOnline(d.lastSeen)).length} online
              </div>
            </div>
          </div>

          {/* Device cards */}
          <h2 style={subheadingStyle}>Devices</h2>
          {devices.length === 0 ? (
            <div style={{ ...s.card, color: t.colors.textMuted, fontStyle: "italic", textAlign: "center" }}>
              No devices registered yet
            </div>
          ) : (
            <div style={deviceGridStyle}>
              {devices.map(device => {
                const online = isOnline(device.lastSeen);
                return (
                  <div key={device.id} style={{ ...s.card, padding: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <div style={{ fontFamily: t.fonts.heading, fontSize: "16px", fontWeight: 600, color: t.colors.text }}>
                        {device.name || "Unnamed Device"}
                      </div>
                    </div>
                    <div style={badgeStyle(online)}>
                      <span style={dotStyle(online)} />
                      {online ? "Online" : "Offline"}
                    </div>
                    <div style={deviceMetaStyle}>
                      <strong>ID:</strong> <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{device.deviceID}</span>
                    </div>
                    <div style={deviceMetaStyle}>
                      <strong>Last seen:</strong> {formatTimestamp(device.lastSeen)}
                    </div>
                    <div style={deviceMetaStyle}>
                      <strong>Activated:</strong> {formatTimestamp(device.activationDate)}
                    </div>
                    {device.storageInfo && device.storageInfo.total > 0 && (
                      <StorageBar used={device.storageInfo.used} total={device.storageInfo.total} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
