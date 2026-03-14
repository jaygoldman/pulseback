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

interface ServerConfig {
  dnsUpstream?: string;
  watchedFolder?: string;
  logLevel?: string;
  pollingPeriod?: number;
  [key: string]: unknown;
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

const noteStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "10px 14px",
  borderRadius: "8px",
  fontSize: "13px",
  background: "rgba(212,160,23,0.1)",
  color: colors.lightBrown,
  border: `1px solid ${colors.kodakGold}`,
};

export function ServerSettings() {
  const [config, setConfig] = useState<ServerConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api<ServerConfig>("/api/server-settings")
      .then(setConfig)
      .catch((err: unknown) => {
        setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to load settings" });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api("/api/server-settings", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof ServerConfig, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Server Settings</h1>
      <p style={{ color: colors.mediumBrown, margin: "0 0 28px 0", fontSize: "14px" }}>
        Configure Kodak Pulse Server behaviour
      </p>

      {loading && (
        <div style={{ color: colors.mediumBrown, fontStyle: "italic" }}>Loading…</div>
      )}

      {!loading && (
        <form onSubmit={handleSave}>
          <div style={{ ...cardStyle, maxWidth: "560px" }}>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>DNS Upstream Server</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g. 8.8.8.8"
                value={config.dnsUpstream ?? ""}
                onChange={(e) => update("dnsUpstream", e.target.value)}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Watched Folder Path</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g. /var/kodak/photos"
                value={config.watchedFolder ?? ""}
                onChange={(e) => update("watchedFolder", e.target.value)}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Log Level</label>
              <select
                style={selectStyle}
                value={config.logLevel ?? "info"}
                onChange={(e) => update("logLevel", e.target.value)}
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Polling Period (seconds)</label>
              <input
                type="number"
                style={inputStyle}
                min={1}
                max={3600}
                value={config.pollingPeriod ?? 30}
                onChange={(e) => update("pollingPeriod", Number(e.target.value))}
              />
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

            <div style={noteStyle}>
              Note: Changes require a server restart to take effect.
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
