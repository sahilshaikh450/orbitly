import { useState } from "react"; import { api } from "./api";
export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("login"); const [f, setF] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [show, setShow] = useState(false);
  const submit = async (e) => { e.preventDefault(); setErr(""); setBusy(true);
    try { const r = await api(`/auth/${mode}/`, { method: "POST", body: f });
      localStorage.setItem("token", r.access); localStorage.setItem("name", r.name); onLogin(r.name);
    } catch (x) { setErr(x.message); } setBusy(false); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div className="auth">
    <div className="auth-hero"><div className="orb o1"/><div className="orb o2"/>
      <h1>Life<span>OS</span></h1><p>Habits, money and tasks. One place, one dashboard.</p>
      <ul><li>💪 Streaks, heatmaps and daily check-ins</li><li>💰 Budgeting, savings goals, split tracker, EMI calculator</li><li>✅ Kanban board with subtasks</li><li>👤 Profile with a full activity history</li></ul></div>
    <form className="auth-card" onSubmit={submit}>
      <h2>{mode === "login" ? "Welcome back 👋" : "Create your account 🚀"}</h2>
      <p className="muted">{mode === "login" ? "Log in to your Life OS" : "Get started in 30 seconds"}</p>
      {mode === "register" && <input placeholder="Full name" value={f.name} onChange={set("name")} required />}
      <input type="email" placeholder="Email" value={f.email} onChange={set("email")} required />
      <div className="pw"><input type={show ? "text" : "password"} placeholder="Password (min 6 characters)" value={f.password} onChange={set("password")} required />
        <a onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</a></div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}</button>
      <p className="muted center">{mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <a onClick={() => { setErr(""); setMode(mode === "login" ? "register" : "login"); }}>{mode === "login" ? "Create an account" : "Log in"}</a></p>
    </form></div>);
}
