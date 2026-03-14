const BASE = "";

function getToken(): string | null {
  return localStorage.getItem("kps_token");
}

export function setToken(token: string): void {
  localStorage.setItem("kps_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("kps_token");
}

export function getUser(): { id: string; username: string; role: string } | null {
  const raw = localStorage.getItem("kps_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setUser(user: { id: string; username: string; role: string }): void {
  localStorage.setItem("kps_user", JSON.stringify(user));
}

export function clearUser(): void {
  localStorage.removeItem("kps_user");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === "admin";
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    clearUser();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}
