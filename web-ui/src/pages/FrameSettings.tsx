import React, { useEffect, useState } from "react";
import { api } from "../api";
import {
  colors,
  fonts,
  cardStyle,
  buttonStyle,
  inputStyle,
  labelStyle,
} from "../theme";

interface Device {
  id: string;
  deviceID: string;
  name: string;
  activationDate: string;
  lastSeen: string | null;
  storageInfo: { used: number; total: number } | null;
}

interface DeviceSettings {
  deviceId: string;
  slideshowDuration: number;
  transitionType: string;
  displayMode: string;
  brightness: number;
  timezone: string;
  language: string;
}

const pageStyle: React.CSSProperties = {
  padding: "32px",
  fontFamily: fonts.body,
  color: colors.darkBrown,
};

const headingStyle: React.CSSProperties = {
  fontFamily: fonts.heading,
  fontSize: "32px",
  fontWeight: 700,
  color: colors.darkBrown,
  margin: "0 0 8px 0",
  letterSpacing: "0.5px",
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const rangeContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

export function FrameSettings() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadDevices() {
      try {
        const devs = await api<Device[]>("/api/devices");
        setDevices(devs);
        if (devs.length === 1) {
          setSelectedDeviceId(devs[0].id);
        }
      } catch (err: unknown) {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to load devices" });
      } finally {
        setLoading(false);
      }
    }
    loadDevices();
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) {
      setSettings(null);
      return;
    }
    setSettings(null);
    api<DeviceSettings>(`/api/devices/${selectedDeviceId}/settings`)
      .then(setSettings)
      .catch((err: unknown) => {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to load settings" });
      });
  }, [selectedDeviceId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || !selectedDeviceId) return;
    setSaving(true);
    setMessage(null);
    try {
      await api(`/api/devices/${selectedDeviceId}/settings`, {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof DeviceSettings>(key: K, value: DeviceSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ color: colors.mediumBrown, fontStyle: "italic" }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Frame Settings</h1>
      <p style={{ color: colors.mediumBrown, margin: "0 0 28px 0", fontSize: "14px" }}>
        Configure display and slideshow settings for your Kodak Pulse frame
      </p>

      {devices.length > 1 && (
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Select Device</label>
          <select
            style={selectStyle}
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            <option value="">— choose a device —</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || d.deviceID}
              </option>
            ))}
          </select>
        </div>
      )}

      {devices.length === 0 && (
        <div style={{ ...cardStyle, color: colors.mediumBrown, fontStyle: "italic", textAlign: "center" }}>
          No devices registered yet
        </div>
      )}

      {selectedDeviceId && !settings && (
        <div style={{ color: colors.mediumBrown, fontStyle: "italic" }}>Loading settings…</div>
      )}

      {settings && (
        <form onSubmit={handleSave}>
          <div style={{ ...cardStyle, maxWidth: "560px" }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Slideshow Duration (seconds)</label>
              <input
                type="number"
                style={inputStyle}
                min={1}
                max={3600}
                value={settings.slideshowDuration}
                onChange={(e) => update("slideshowDuration", Number(e.target.value))}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Transition Type</label>
              <select
                style={selectStyle}
                value={settings.transitionType}
                onChange={(e) => update("transitionType", e.target.value)}
              >
                <option value="FADE">Fade</option>
                <option value="NONE">None</option>
                <option value="WIPE">Wipe</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Display Mode</label>
              <select
                style={selectStyle}
                value={settings.displayMode}
                onChange={(e) => update("displayMode", e.target.value)}
              >
                <option value="ONEUP">One Up</option>
                <option value="COLLAGE">Collage</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Brightness: {settings.brightness}%</label>
              <div style={rangeContainerStyle}>
                <span style={{ fontSize: "12px", color: colors.mediumBrown }}>0</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.brightness}
                  onChange={(e) => update("brightness", Number(e.target.value))}
                  style={{ flex: 1, accentColor: colors.kodakRed, cursor: "pointer" }}
                />
                <span style={{ fontSize: "12px", color: colors.mediumBrown }}>100</span>
              </div>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Timezone</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g. America/New_York"
                value={settings.timezone}
                onChange={(e) => update("timezone", e.target.value)}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Language</label>
              <select
                style={selectStyle}
                value={settings.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="en-us">English (US)</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            {message && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: message.type === "success" ? "rgba(74,124,89,0.1)" : "rgba(192,57,43,0.1)",
                  color: message.type === "success" ? colors.success : colors.danger,
                  border: `1px solid ${message.type === "success" ? colors.success : colors.danger}`,
                }}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              style={{ ...buttonStyle, opacity: saving ? 0.7 : 1 }}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
