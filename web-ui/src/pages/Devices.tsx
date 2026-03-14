import React, { useContext, useEffect, useState } from "react";
import { api } from "../api";
import { ThemeContext, getStyles } from "../theme";

interface Device {
  id: string;
  deviceID: string;
  name: string;
  activationDate: string;
  lastSeen: string | null;
  storageInfo: { used: number; total: number } | null;
}

interface Album {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString();
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 120_000;
}

interface DeviceCardProps {
  device: Device;
  allAlbums: Album[];
  onNameSave: (id: string, name: string) => Promise<void>;
}

function DeviceCard({ device, allAlbums, onNameSave }: DeviceCardProps) {
  const { theme } = useContext(ThemeContext);
  const t = theme;
  const s = getStyles(t);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(device.name);
  const [savingName, setSavingName] = useState(false);

  const [assignedAlbumIds, setAssignedAlbumIds] = useState<Set<string>>(new Set());
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [savingAlbums, setSavingAlbums] = useState(false);
  const [albumMessage, setAlbumMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api<{ albumId: string }[]>(`/api/devices/${device.id}/albums`)
      .then((albums) => {
        setAssignedAlbumIds(new Set(albums.map((a) => a.albumId ?? (a as unknown as Album).id)));
      })
      .catch(() => setAssignedAlbumIds(new Set()))
      .finally(() => setLoadingAlbums(false));
  }, [device.id]);

  async function handleNameSave() {
    setSavingName(true);
    try {
      await onNameSave(device.id, nameValue);
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleNameSave();
    if (e.key === "Escape") {
      setNameValue(device.name);
      setEditingName(false);
    }
  }

  async function handleAlbumToggle(albumId: string, checked: boolean) {
    const next = new Set(assignedAlbumIds);
    if (checked) next.add(albumId);
    else next.delete(albumId);
    setAssignedAlbumIds(next);
    setSavingAlbums(true);
    setAlbumMessage(null);
    try {
      await api(`/api/devices/${device.id}/albums`, {
        method: "PUT",
        body: JSON.stringify({ albumIds: Array.from(next) }),
      });
      setAlbumMessage({ type: "success", text: "Albums updated." });
    } catch (err: unknown) {
      setAssignedAlbumIds(checked ? new Set([...assignedAlbumIds].filter((id) => id !== albumId)) : new Set([...assignedAlbumIds, albumId]));
      setAlbumMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update albums" });
    } finally {
      setSavingAlbums(false);
    }
  }

  const online = isOnline(device.lastSeen);

  const badgeStyle = (isOnline: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 600,
    color: isOnline ? t.colors.success : t.colors.textMuted,
    background: isOnline ? `${t.colors.success}1A` : `${t.colors.textMuted}1A`,
    borderRadius: "20px",
    padding: "3px 10px",
    marginBottom: "12px",
  });

  const dotStyle = (isOnline: boolean): React.CSSProperties => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: isOnline ? t.colors.success : "#AAA",
    flexShrink: 0,
  });

  const metaStyle: React.CSSProperties = {
    fontSize: "12px",
    color: t.colors.textMuted,
    margin: "4px 0",
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: `1px solid ${t.colors.inputBorder}`,
    margin: "16px 0",
  };

  const storageBarOuter: React.CSSProperties = {
    marginTop: "8px",
    background: "rgba(0,0,0,0.08)",
    borderRadius: t.borderRadius,
    height: "8px",
    overflow: "hidden",
  };

  return (
    <div style={{ ...s.card, padding: "20px" }}>
      {/* Name header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        {editingName ? (
          <>
            <input
              autoFocus
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleNameKeyDown}
              style={{ ...s.input, fontSize: "15px", padding: "6px 10px", flex: 1 }}
            />
            <button
              onClick={handleNameSave}
              disabled={savingName}
              style={{ ...s.button, padding: "6px 12px", fontSize: "12px" }}
            >
              {savingName ? "…" : "Save"}
            </button>
            <button
              onClick={() => { setNameValue(device.name); setEditingName(false); }}
              style={{ ...s.buttonSecondary, padding: "6px 10px", fontSize: "12px" }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span
              style={{ fontFamily: t.fonts.heading, fontSize: "17px", fontWeight: 600, color: t.colors.text, flex: 1 }}
            >
              {device.name || "Unnamed Device"}
            </span>
            <button
              onClick={() => setEditingName(true)}
              title="Edit name"
              style={{
                background: "none",
                border: `1px solid ${t.colors.inputBorder}`,
                borderRadius: t.borderRadius,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "12px",
                color: t.colors.textMuted,
              }}
            >
              Edit
            </button>
          </>
        )}
      </div>

      <div style={badgeStyle(online)}>
        <span style={dotStyle(online)} />
        {online ? "Online" : "Offline"}
      </div>

      <div style={metaStyle}>
        <strong>Device ID:</strong>{" "}
        <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{device.deviceID}</span>
      </div>
      <div style={metaStyle}>
        <strong>Activated:</strong> {formatTimestamp(device.activationDate)}
      </div>
      <div style={metaStyle}>
        <strong>Last seen:</strong> {formatTimestamp(device.lastSeen)}
      </div>

      {device.storageInfo && device.storageInfo.total > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: t.colors.textMuted, marginBottom: "4px" }}>
            <span>{formatBytes(device.storageInfo.used)} used</span>
            <span>{formatBytes(device.storageInfo.total)} total</span>
          </div>
          <div style={storageBarOuter}>
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (device.storageInfo.used / device.storageInfo.total) * 100)}%`,
                background: (device.storageInfo.used / device.storageInfo.total) * 100 > 80 ? t.colors.danger : (device.storageInfo.used / device.storageInfo.total) * 100 > 60 ? t.colors.warning : t.colors.success,
                borderRadius: t.borderRadius,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}

      <div style={dividerStyle} />

      {/* Album assignment */}
      <div>
        <div style={{ ...s.label, marginBottom: "10px" }}>Assigned Albums</div>
        {loadingAlbums ? (
          <div style={{ fontSize: "12px", color: t.colors.textMuted, fontStyle: "italic" }}>Loading albums…</div>
        ) : allAlbums.length === 0 ? (
          <div style={{ fontSize: "12px", color: t.colors.textMuted, fontStyle: "italic" }}>No albums created yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {allAlbums.map((album) => (
              <label
                key={album.id}
                style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: t.colors.text }}
              >
                <input
                  type="checkbox"
                  checked={assignedAlbumIds.has(album.id)}
                  onChange={(e) => handleAlbumToggle(album.id, e.target.checked)}
                  disabled={savingAlbums}
                  style={{ accentColor: t.colors.primary, width: "15px", height: "15px" }}
                />
                {album.name}
              </label>
            ))}
          </div>
        )}
        {albumMessage && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "12px",
              color: albumMessage.type === "success" ? t.colors.success : t.colors.danger,
            }}
          >
            {albumMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}

export function Devices() {
  const { theme } = useContext(ThemeContext);
  const t = theme;
  const s = getStyles(t);

  const [devices, setDevices] = useState<Device[]>([]);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<Device[]>("/api/devices"), api<Album[]>("/api/albums")])
      .then(([devs, albums]) => {
        setDevices(devs);
        setAllAlbums(albums);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleNameSave(id: string, name: string) {
    await api(`/api/devices/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  }

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

  const deviceGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "20px",
  };

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Devices</h1>
      <p style={{ color: t.colors.textMuted, margin: "0 0 28px 0", fontSize: "14px" }}>
        Manage your Kodak Pulse frames and album assignments
      </p>

      {loading && (
        <div style={{ color: t.colors.textMuted, fontStyle: "italic" }}>Loading…</div>
      )}
      {error && (
        <div style={{ color: t.colors.danger, marginBottom: "16px" }}>Error: {error}</div>
      )}

      {!loading && devices.length === 0 && !error && (
        <div style={{ ...s.card, color: t.colors.textMuted, fontStyle: "italic", textAlign: "center" }}>
          No devices registered yet
        </div>
      )}

      {!loading && devices.length > 0 && (
        <div style={deviceGridStyle}>
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              allAlbums={allAlbums}
              onNameSave={handleNameSave}
            />
          ))}
        </div>
      )}
    </div>
  );
}
