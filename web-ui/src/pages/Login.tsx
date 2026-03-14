import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, setToken, setUser } from "../api";
import { colors, fonts, cardStyle, buttonStyle, inputStyle, labelStyle } from "../theme";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    try {
      const data = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      setUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, width: "100%", maxWidth: "420px", padding: 0, overflow: "hidden" }}>
        {/* Kodak branded header */}
        <div style={headerStyle}>
          <span style={logoStyle}>KODAK</span>
          <span style={subheadStyle}>Pulse Server</span>
        </div>

        <div style={{ padding: "32px" }}>
          <h2 style={headingStyle}>Sign In</h2>
          <p style={descStyle}>Welcome back. Sign in to manage your Kodak Pulse frames.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="username" style={labelStyle}>Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                disabled={loading}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...buttonStyle, width: "100%", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <p style={footerStyle}>
            First time setup?{" "}
            <Link to="/setup" style={linkStyle}>
              Create admin account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: colors.warmCream,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  fontFamily: fonts.body,
};

const headerStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, ${colors.kodakRed} 0%, #A00F27 100%)`,
  padding: "28px 32px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
};

const logoStyle: React.CSSProperties = {
  fontFamily: fonts.heading,
  fontSize: "36px",
  fontWeight: 700,
  color: "white",
  letterSpacing: "6px",
  textShadow: "0 2px 4px rgba(0,0,0,0.3)",
};

const subheadStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "12px",
  fontWeight: 500,
  color: "rgba(255,255,255,0.8)",
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
};

const headingStyle: React.CSSProperties = {
  fontFamily: fonts.heading,
  fontSize: "22px",
  color: colors.darkBrown,
  margin: "0 0 8px 0",
};

const descStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "13px",
  color: colors.mediumBrown,
  margin: "0 0 24px 0",
  lineHeight: 1.5,
};

const errorStyle: React.CSSProperties = {
  background: "#FDF0EF",
  border: `1px solid ${colors.danger}`,
  borderRadius: "8px",
  color: colors.danger,
  fontFamily: fonts.body,
  fontSize: "13px",
  padding: "10px 14px",
  marginBottom: "16px",
};

const footerStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: "13px",
  color: colors.mediumBrown,
  textAlign: "center" as const,
  marginTop: "20px",
  marginBottom: 0,
};

const linkStyle: React.CSSProperties = {
  color: colors.kodakRed,
  textDecoration: "none",
  fontWeight: 600,
};
