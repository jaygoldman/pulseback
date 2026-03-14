import React, { useContext, useEffect, useState } from "react";
import { api, getUser } from "../api";
import { ThemeContext, getStyles } from "../theme";

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

export function Users() {
  const { theme } = useContext(ThemeContext);
  const t = theme;
  const s = getStyles(t);

  const currentUser = getUser();
  const isAdmin = currentUser?.role === "admin";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [globalMessage, setGlobalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api<User[]>("/api/users")
      .then(setUsers)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!newUsername.trim() || !newPassword.trim()) {
      setAddError("Username and password are required.");
      return;
    }
    setAddLoading(true);
    try {
      const created = await api<User>("/api/users", {
        method: "POST",
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      setUsers((prev) => [...prev, created]);
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      setShowAddForm(false);
      setGlobalMessage({ type: "success", text: `User "${created.username}" created.` });
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(userId: string) {
    const adminCount = users.filter((u) => u.role === "admin").length;
    const target = users.find((u) => u.id === userId);
    if (target?.role === "admin" && adminCount <= 1) {
      setDeleteError("Cannot delete the last admin user.");
      setDeleteConfirmId(null);
      return;
    }
    setDeletingId(userId);
    setDeleteError(null);
    try {
      await api(`/api/users/${userId}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setGlobalMessage({ type: "success", text: "User deleted." });
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
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

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "14px",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left" as const,
    padding: "10px 14px",
    fontFamily: t.fonts.body,
    fontSize: "12px",
    fontWeight: 700,
    color: t.colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.8px",
    borderBottom: `2px solid ${t.colors.inputBorder}`,
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderBottom: `1px solid ${t.colors.inputBorder}`,
    color: t.colors.text,
    verticalAlign: "middle" as const,
  };

  const roleBadgeStyle = (role: string): React.CSSProperties => ({
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
    background: role === "admin" ? `${t.colors.primary}1A` : `${t.colors.textMuted}1A`,
    color: role === "admin" ? t.colors.primary : t.colors.textMuted,
  });

  const fieldGroupStyle: React.CSSProperties = {
    marginBottom: "16px",
  };

  const selectStyle: React.CSSProperties = {
    ...s.input,
    cursor: "pointer",
  };

  if (!isAdmin) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>Users</h1>
        <div
          style={{
            ...s.card,
            color: t.colors.danger,
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          Access denied. Admin privileges required.
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <h1 style={{ ...headingStyle, margin: 0 }}>Users</h1>
        <button
          style={s.button}
          onClick={() => { setShowAddForm((v) => !v); setAddError(null); }}
        >
          {showAddForm ? "Cancel" : "+ Add User"}
        </button>
      </div>
      <p style={{ color: t.colors.textMuted, margin: "0 0 24px 0", fontSize: "14px" }}>
        Manage who has access to Pulseback
      </p>

      {/* Add user form */}
      {showAddForm && (
        <div style={{ ...s.card, maxWidth: "480px", marginBottom: "24px" }}>
          <div style={{ fontFamily: t.fonts.heading, fontSize: "16px", fontWeight: 600, color: t.colors.text, marginBottom: "16px" }}>
            New User
          </div>
          <form onSubmit={handleAddUser}>
            <div style={fieldGroupStyle}>
              <label style={s.label}>Username</label>
              <input
                type="text"
                style={s.input}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                autoComplete="off"
                placeholder="Enter username"
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={s.label}>Password</label>
              <input
                type="password"
                style={s.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Enter password"
              />
            </div>
            <div style={fieldGroupStyle}>
              <label style={s.label}>Role</label>
              <select
                style={selectStyle}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {addError && (
              <div style={{ color: t.colors.danger, fontSize: "13px", marginBottom: "12px" }}>{addError}</div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="submit"
                style={{ ...s.button, opacity: addLoading ? 0.7 : 1 }}
                disabled={addLoading}
              >
                {addLoading ? "Creating…" : "Create User"}
              </button>
              <button
                type="button"
                style={s.buttonSecondary}
                onClick={() => { setShowAddForm(false); setAddError(null); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {globalMessage && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px 14px",
            borderRadius: t.borderRadius,
            fontSize: "14px",
            background: globalMessage.type === "success" ? `${t.colors.success}1A` : `${t.colors.danger}1A`,
            color: globalMessage.type === "success" ? t.colors.success : t.colors.danger,
            border: `1px solid ${globalMessage.type === "success" ? t.colors.success : t.colors.danger}`,
          }}
        >
          {globalMessage.text}
        </div>
      )}

      {deleteError && (
        <div style={{ color: t.colors.danger, marginBottom: "12px", fontSize: "13px" }}>{deleteError}</div>
      )}

      <div style={s.card}>
        {loading && (
          <div style={{ color: t.colors.textMuted, fontStyle: "italic", padding: "8px 0" }}>Loading…</div>
        )}
        {error && (
          <div style={{ color: t.colors.danger }}>{error}</div>
        )}
        {!loading && !error && (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ background: user.id === currentUser?.id ? `${t.colors.primary}08` : "transparent" }}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: user.id === currentUser?.id ? 700 : 400 }}>
                      {user.username}
                    </span>
                    {user.id === currentUser?.id && (
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: t.colors.textMuted }}>(you)</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={roleBadgeStyle(user.role)}>{user.role}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: "13px", color: t.colors.textMuted }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {deleteConfirmId === user.id ? (
                      <span style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: t.colors.danger }}>Confirm delete?</span>
                        <button
                          style={{ ...s.button, background: t.colors.danger, padding: "5px 10px", fontSize: "12px", opacity: deletingId === user.id ? 0.7 : 1 }}
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                        >
                          {deletingId === user.id ? "Deleting…" : "Yes, delete"}
                        </button>
                        <button
                          style={{ ...s.buttonSecondary, padding: "5px 10px", fontSize: "12px" }}
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        style={{
                          background: "none",
                          border: `1px solid ${t.colors.danger}`,
                          color: t.colors.danger,
                          borderRadius: t.borderRadius,
                          padding: "5px 12px",
                          fontSize: "12px",
                          cursor: user.id === currentUser?.id ? "not-allowed" : "pointer",
                          opacity: user.id === currentUser?.id ? 0.4 : 1,
                          fontFamily: t.fonts.body,
                          fontWeight: 600,
                        }}
                        onClick={() => {
                          if (user.id !== currentUser?.id) {
                            setDeleteConfirmId(user.id);
                            setDeleteError(null);
                          }
                        }}
                        disabled={user.id === currentUser?.id}
                        title={user.id === currentUser?.id ? "Cannot delete your own account" : "Delete user"}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: t.colors.textMuted, fontStyle: "italic" }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
