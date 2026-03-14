import React, { useContext, useEffect, useState } from "react";
import { api } from "../api";
import { ThemeContext, getStyles } from "../theme";

interface ServerConfig {
  dnsUpstream?: string;
  watchedFolder?: string;
  logLevel?: string;
  pollingPeriod?: number;
  [key: string]: unknown;
}

export function ServerSettings() {
  const { theme } = useContext(ThemeContext);
  const t = theme;
  const s = getStyles(t);

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

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: "20px",
  };

  const selectStyle: React.CSSProperties = {
    ...s.input,
    cursor: "pointer",
  };

  const noteStyle: React.CSSProperties = {
    marginTop: "16px",
    padding: "10px 14px",
    borderRadius: t.borderRadius,
    fontSize: "13px",
    background: `${t.colors.warning}1A`,
    color: t.colors.warning,
    border: `1px solid ${t.colors.warning}`,
  };

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Server Settings</h1>
      <p style={{ color: t.colors.textMuted, margin: "0 0 28px 0", fontSize: "14px" }}>
        Configure Pulseback behaviour
      </p>

      {loading && (
        <div style={{ color: t.colors.textMuted, fontStyle: "italic" }}>Loading…</div>
      )}

      {!loading && (
        <form onSubmit={handleSave}>
          <div style={{ ...s.card, maxWidth: "560px" }}>
            <div style={fieldGroupStyle}>
              <label style={s.label}>DNS Upstream Server</label>
              <input
                type="text"
                style={s.input}
                placeholder="e.g. 8.8.8.8"
                value={config.dnsUpstream ?? ""}
                onChange={(e) => update("dnsUpstream", e.target.value)}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={s.label}>Watched Folder Path</label>
              <input
                type="text"
                style={s.input}
                placeholder="e.g. /var/kodak/photos"
                value={config.watchedFolder ?? ""}
                onChange={(e) => update("watchedFolder", e.target.value)}
              />
            </div>

            <div style={fieldGroupStyle}>
              <label style={s.label}>Log Level</label>
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
              <label style={s.label}>Polling Period (seconds)</label>
              <input
                type="number"
                style={s.input}
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
                  borderRadius: t.borderRadius,
                  fontSize: "14px",
                  background: message.type === "success" ? `${t.colors.success}1A` : `${t.colors.danger}1A`,
                  color: message.type === "success" ? t.colors.success : t.colors.danger,
                  border: `1px solid ${message.type === "success" ? t.colors.success : t.colors.danger}`,
                }}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              style={{ ...s.button, opacity: saving ? 0.7 : 1 }}
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
