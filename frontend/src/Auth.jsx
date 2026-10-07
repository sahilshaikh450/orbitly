import { useState } from "react"; import { api } from "./api";
const T = { login: ["Welcome back 👋", "Log in to Orbitly"], register: ["Create your account 🚀", "Get started in 30 seconds"], forgot: ["Forgot password? 🔑", "We'll email you a reset link"], reset: ["Set a new password 🔒", "Choose a new password for your account"] };
export default function Auth({ onLogin, resetToken }) {
  const [mode, setMode] = useState(resetToken ? "reset" : "login"); const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(""), [info, setInfo] = useState(""), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  const go = (m) => { setErr(""); setInfo(""); setMode(m); };
  const submit = async (e) => { e.preventDefault(); setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "forgot") { await api("/auth/forgot/", { method: "POST", body: { email: f.email } }); setInfo("If that email is registered, a reset link has been sent. Check your inbox."); }
      else if (mode === "reset") { await api("/auth/reset/", { method: "POST", body: { token: resetToken, password: f.password } }); alert("Password updated. Please log in."); location.href = location.pathname; }
      else { const r = await api(`/auth/${mode}/`, { method: "POST", body: f });
        localStorage.setItem("token", r.access); localStorage.setItem("refresh", r.refresh); localStorage.setItem("name", r.name); onLogin(r.name); }
    } catch (x) { setErr(x.message); } setBusy(false); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div className="auth">
    <div className="auth-hero"><div className="orb o1"/><div className="orb o2"/>
      <h1>Orbit<span>ly</span></h1><p>Habits, money and tasks. One place, one dashboard.</p>
      <ul><li>💪 Streaks, heatmaps and daily check-ins</li><li>💰 Budgeting, savings goals, split tracker, EMI calculator</li><li>✅ Kanban board, calendar and focus timer</li><li>🔔 Reminders and installable on your phone</li></ul></div>
    <form className="auth-card" onSubmit={submit}>
      <h2>{T[mode][0]}</h2><p className="muted">{T[mode][1]}</p>
      {mode === "register" && <input placeholder="Full name" value={f.name} onChange={set("name")} required />}
      {mode !== "reset" && <input type="email" placeholder="Email" value={f.email} onChange={set("email")} required />}
      {mode !== "forgot" && <div className="pw"><input type={show ? "text" : "password"} placeholder={mode === "reset" ? "New password (min 6 characters)" : "Password (min 6 characters)"} value={f.password} onChange={set("password")} required />
        <a onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</a></div>}
      {mode === "login" && <div style={{ textAlign: "right", marginBottom: 8 }}><a onClick={() => go("forgot")}>Forgot password?</a></div>}
      {err && <div className="err">{err}</div>}{info && <div className="ok">{info}</div>}
      <button className="btn primary" disabled={busy}>{busy ? "Please wait..." : { login: "Log in", register: "Sign up", forgot: "Send reset link", reset: "Update password" }[mode]}</button>
      <p className="muted center">{mode === "login" ? <>New here? <a onClick={() => go("register")}>Create an account</a></> :
        mode === "register" ? <>Already have an account? <a onClick={() => go("login")}>Log in</a></> : <a onClick={() => go("login")}>Back to log in</a>}</p>
    </form></div>);
}
