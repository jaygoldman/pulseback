import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { colors, fonts, cardStyle, buttonStyle, buttonSecondaryStyle } from "../theme";

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

/** Deterministic rotation based on photo id — avoids re-render jitter */
function idToRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  // Map to ±2 degrees
  const norm = ((hash % 1000) + 1000) % 1000; // 0–999
  return (norm / 999) * 4 - 2;
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
  margin: "0 0 24px 0",
};

const uploadZoneBase: React.CSSProperties = {
  background: colors.warmCream,
  border: `2px dashed ${colors.kodakGold}`,
  borderRadius: "12px",
  padding: "40px 24px",
  textAlign: "center",
  marginBottom: "28px",
  transition: "background 0.2s, border-color 0.2s",
  cursor: "pointer",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: "24px",
};

const polaroidOuter = (rotation: number): React.CSSProperties => ({
  background: "white",
  padding: "8px 8px 32px 8px",
  boxShadow: `3px 3px 10px ${colors.shadowDark}, 0 1px 3px ${colors.shadow}`,
  transform: `rotate(${rotation}deg)`,
  position: "relative" as const,
  cursor: "pointer",
  transition: "transform 0.2s, box-shadow 0.2s",
  userSelect: "none" as const,
});

const checkboxOverlayStyle: React.CSSProperties = {
  position: "absolute",
  top: "12px",
  left: "12px",
  width: "20px",
  height: "20px",
  accentColor: colors.kodakRed,
  cursor: "pointer",
  zIndex: 2,
};

const photoFilenameStyle: React.CSSProperties = {
  fontSize: "10px",
  color: colors.mediumBrown,
  textAlign: "center" as const,
  marginTop: "6px",
  fontFamily: fonts.body,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
  padding: "0 2px",
};

const deleteButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: colors.danger,
};

export function Photos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const p = await api<Photo[]>("/api/photos");
      setPhotos(p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fileArray.forEach(f => fd.append("photos", f));
      await api("/api/photos", { method: "POST", body: fd });
      await loadPhotos();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      uploadFiles(e.target.files);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === photos.length && photos.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(photos.map(p => p.id)));
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} photo(s)? This cannot be undone.`)) return;
    try {
      await Promise.all([...selected].map(id => api(`/api/photos/${id}`, { method: "DELETE" })));
      setSelected(new Set());
      await loadPhotos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function openAlbumDropdown() {
    setAlbumsLoading(true);
    setShowAlbumDropdown(true);
    try {
      const a = await api<Album[]>("/api/albums");
      setAlbums(a);
    } catch {
      // silently fail — albums already may be loaded
    } finally {
      setAlbumsLoading(false);
    }
  }

  async function addToAlbum(albumId: string) {
    setShowAlbumDropdown(false);
    try {
      await api(`/api/albums/${albumId}/photos`, {
        method: "POST",
        body: JSON.stringify({ photoIds: [...selected] }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add to album");
    }
  }

  const allSelected = photos.length > 0 && selected.size === photos.length;

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Photos</h1>

      {/* Upload zone */}
      <div
        style={{
          ...uploadZoneBase,
          background: dragOver ? "#FFF0C8" : colors.warmCream,
          borderColor: dragOver ? colors.kodakRed : colors.kodakGold,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📷</div>
        <div style={{ fontFamily: fonts.heading, fontSize: "18px", color: colors.darkBrown, marginBottom: "8px" }}>
          {dragOver ? "Drop photos here" : "Drag & drop photos here"}
        </div>
        <div style={{ color: colors.mediumBrown, fontSize: "13px", marginBottom: "16px" }}>
          or
        </div>
        <button
          style={{ ...buttonSecondaryStyle, pointerEvents: "none" }}
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          {uploading ? "Uploading…" : "Choose Files"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileInputChange}
          onClick={e => e.stopPropagation()}
        />
        {uploading && (
          <div style={{ color: colors.mediumBrown, marginTop: "12px", fontStyle: "italic" }}>
            Uploading…
          </div>
        )}
        {uploadError && (
          <div style={{ color: colors.danger, marginTop: "12px" }}>
            {uploadError}
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: colors.danger, marginBottom: "16px" }}>Error: {error}</div>
      )}

      {/* Toolbar */}
      {photos.length > 0 && (
        <div style={toolbarStyle}>
          <button
            style={{ ...buttonSecondaryStyle, background: allSelected ? colors.lightBrown : colors.mediumBrown }}
            onClick={toggleSelectAll}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>

          {selected.size > 0 && (
            <>
              <span style={{ color: colors.mediumBrown, fontSize: "13px" }}>
                {selected.size} selected
              </span>
              <button style={deleteButtonStyle} onClick={deleteSelected}>
                Delete Selected
              </button>
              <div style={{ position: "relative" }}>
                <button
                  style={buttonSecondaryStyle}
                  onClick={openAlbumDropdown}
                >
                  Add to Album ▾
                </button>
                {showAlbumDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      background: colors.cardBg,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: "8px",
                      boxShadow: `0 4px 12px ${colors.shadowDark}`,
                      zIndex: 100,
                      minWidth: "200px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: colors.mediumBrown,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        borderBottom: `1px solid ${colors.inputBorder}`,
                      }}
                    >
                      Select Album
                    </div>
                    {albumsLoading ? (
                      <div style={{ padding: "12px", color: colors.mediumBrown, fontStyle: "italic" }}>
                        Loading…
                      </div>
                    ) : albums.length === 0 ? (
                      <div style={{ padding: "12px", color: colors.mediumBrown, fontStyle: "italic" }}>
                        No albums yet
                      </div>
                    ) : (
                      albums.map(album => (
                        <button
                          key={album.id}
                          onClick={() => addToAlbum(album.id)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "10px 14px",
                            background: "none",
                            border: "none",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: fonts.body,
                            fontSize: "14px",
                            color: colors.darkBrown,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = colors.warmCream)}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        >
                          {album.name}
                        </button>
                      ))
                    )}
                    <button
                      onClick={() => setShowAlbumDropdown(false)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 14px",
                        background: "none",
                        border: "none",
                        borderTop: `1px solid ${colors.inputBorder}`,
                        textAlign: "center",
                        cursor: "pointer",
                        fontFamily: fonts.body,
                        fontSize: "12px",
                        color: colors.mediumBrown,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Photo grid */}
      {loading ? (
        <div style={{ color: colors.mediumBrown, fontStyle: "italic" }}>Loading photos…</div>
      ) : photos.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            color: colors.mediumBrown,
            fontStyle: "italic",
            padding: "48px",
          }}
        >
          No photos yet. Upload some above!
        </div>
      ) : (
        <div style={gridStyle}>
          {photos.map(photo => {
            const rotation = idToRotation(photo.id);
            const isSelected = selected.has(photo.id);
            return (
              <div
                key={photo.id}
                style={{
                  ...polaroidOuter(rotation),
                  boxShadow: isSelected
                    ? `0 0 0 3px ${colors.kodakRed}, 3px 3px 10px ${colors.shadowDark}`
                    : `3px 3px 10px ${colors.shadowDark}, 0 1px 3px ${colors.shadow}`,
                }}
                onClick={() => toggleSelect(photo.id)}
              >
                <input
                  type="checkbox"
                  style={checkboxOverlayStyle}
                  checked={isSelected}
                  onChange={() => toggleSelect(photo.id)}
                  onClick={e => e.stopPropagation()}
                  aria-label={`Select ${photo.filename}`}
                />
                <img
                  src={`/photos/${photo.id}.jpg`}
                  alt={photo.filename}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    display: "block",
                    background: colors.warmCream,
                  }}
                  loading="lazy"
                />
                <div style={photoFilenameStyle} title={photo.filename}>
                  {photo.filename}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
