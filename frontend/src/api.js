const BASE = import.meta.env.VITE_API || "http://localhost:8000/api";
let refreshing = null;
const logout = () => { ["token", "refresh", "name"].forEach((k) => localStorage.removeItem(k)); location.reload(); };
async function refresh() {
  const r = localStorage.getItem("refresh"); if (!r) return false;
  const res = await fetch(BASE + "/auth/refresh/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh: r }) });
  if (!res.ok) return false; localStorage.setItem("token", (await res.json()).access); return true;
}
export async function api(path, opts = {}, retry = true) {
  const { method = "GET", body } = opts, token = localStorage.getItem("token");
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && token && retry) {
    refreshing = refreshing || refresh().finally(() => { refreshing = null; });
    if (await refreshing) return api(path, opts, false);
    logout(); return;
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail || "Something went wrong");
  return data;
}
