import React, { useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";
import { ThemeContext, getStyles } from "../theme";

interface Album {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function Albums() {
  const { theme } = useContext(ThemeContext);
  const t = theme;
  const s = getStyles(t);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadAlbums = useCallback(async () => {
    try {
      const a = await api<Album[]>("/api/albums");
      setAlbums(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load albums");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api("/api/albums", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewName("");
      setShowModal(false);
      await loadAlbums();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create album");
    } finally {
      setCreating(false);
    }
  }

  async function deleteAlbum(id: string, name: string) {
    if (!confirm(`Delete album "${name}"? Photos will not be deleted.`)) return;
    try {
      await api(`/api/albums/${id}`, { method: "DELETE" });
      await loadAlbums();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete album");
    }
  }

  function openModal() {
    setNewName("");
    setCreateError(null);
    setShowModal(true);
  }

  function closeModal() {
    if (creating) return;
    setShowModal(false);
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
    margin: 0,
  };

  const headerRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "20px",
  };

  const albumCardStyle: React.CSSProperties = {
    ...s.card,
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    position: "relative" as const,
  };

  const albumNameStyle: React.CSSProperties = {
    fontFamily: t.fonts.heading,
    fontSize: "20px",
    fontWeight: 700,
    color: t.colors.text,
    marginBottom: "4px",
  };

  const metaStyle: React.CSSProperties = {
    fontSize: "12px",
    color: t.colors.textMuted,
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...s.buttonSecondary,
    background: "transparent",
    color: t.colors.danger,
    border: `1px solid ${t.colors.danger}`,
    padding: "6px 14px",
    fontSize: "12px",
    marginTop: "auto",
    alignSelf: "flex-start" as const,
  };

  const overlayStyle: React.CSSProperties = {
    position: "fixed" as const,
    inset: 0,
    background: `${t.colors.text}73`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  };

  const modalStyle: React.CSSProperties = {
    ...s.card,
    width: "360px",
    maxWidth: "90vw",
    boxShadow: `0 8px 32px ${t.colors.shadowDark}`,
  };

  const modalHeadingStyle: React.CSSProperties = {
    fontFamily: t.fonts.heading,
    fontSize: "22px",
    fontWeight: 700,
    color: t.colors.text,
    margin: "0 0 20px 0",
  };

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <h1 style={headingStyle}>Albums</h1>
        <button style={s.button} onClick={openModal}>
          + New Album
        </button>
      </div>

      {error && (
        <div style={{ color: t.colors.danger, marginBottom: "16px" }}>Error: {error}</div>
      )}

      {loading ? (
        <div style={{ color: t.colors.textMuted, fontStyle: "italic" }}>Loading albums…</div>
      ) : albums.length === 0 ? (
        <div
          style={{
            ...s.card,
            textAlign: "center",
            color: t.colors.textMuted,
            fontStyle: "italic",
            padding: "48px",
          }}
        >
          No albums yet. Create one with the button above!
        </div>
      ) : (
        <div style={gridStyle}>
          {albums.map(album => (
            <div key={album.id} style={albumCardStyle}>
              {/* Decorative top accent */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: `linear-gradient(90deg, ${t.colors.primary}, ${t.colors.secondary})`,
                  borderRadius: `${t.cardBorderRadius} ${t.cardBorderRadius} 0 0`,
                }}
              />
              <div style={{ paddingTop: "8px" }}>
                <div style={albumNameStyle}>{album.name}</div>
                <div style={metaStyle}>
                  Created {formatDate(album.createdAt)}
                </div>
              </div>
              <button
                style={deleteButtonStyle}
                onClick={() => deleteAlbum(album.id, album.name)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = t.colors.danger;
                  (e.currentTarget as HTMLElement).style.color = "white";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = t.colors.danger;
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Album Modal */}
      {showModal && (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={modalHeadingStyle}>New Album</h2>
            <form onSubmit={createAlbum}>
              <div style={{ marginBottom: "20px" }}>
                <label style={s.label} htmlFor="album-name">
                  Album Name
                </label>
                <input
                  id="album-name"
                  style={s.input}
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Summer 2025"
                  autoFocus
                  disabled={creating}
                />
              </div>
              {createError && (
                <div style={{ color: t.colors.danger, fontSize: "13px", marginBottom: "16px" }}>
                  {createError}
                </div>
              )}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={{ ...s.buttonSecondary, background: t.colors.inputBorder, color: t.colors.text }}
                  onClick={closeModal}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={s.button}
                  disabled={creating || !newName.trim()}
                >
                  {creating ? "Creating…" : "Create Album"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
