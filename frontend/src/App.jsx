import { useEffect, useState } from "react";
import Auth from "./Auth.jsx"; import Module from "./Module.jsx"; import Home from "./Home.jsx"; import Journal from "./Journal.jsx"; import Analytics from "./Analytics.jsx"; import Palette from "./Palette.jsx";
import { Profile, Settings } from "./Profile.jsx"; import { api } from "./api"; import { startReminders } from "./reminders"; import { level, confetti } from "./Extras";
const NAV = [["Overview", [["home", "🏠", "Dashboard"]]], ["Track", [["habits", "💪", "Habit Forge"], ["expenses", "💰", "Wealth Map"], ["todos", "✅", "Task Engine"]]], ["Reflect", [["journal", "📓", "Journal"], ["analytics", "📊", "Analytics"]]]];
const FAB = [["✅", "Task", "task "], ["💪", "Habit", "habit "], ["💸", "Expense", "spent "], ["💵", "Income", "income "]];
export default function App() {
  const [name, setName] = useState(localStorage.getItem("token") ? localStorage.getItem("name") : null);
  const [tab, setTab] = useState("home"), [menu, setMenu] = useState(false), [pal, setPal] = useState(false), [palInit, setPalInit] = useState(""), [rev, setRev] = useState(0);
  const [open, setOpen] = useState(false), [notice, setNotice] = useState(""), [fab, setFab] = useState(false), [xp, setXp] = useState(null), [undo, setUndo] = useState(null), [rail, setRail] = useState(localStorage.getItem("rail") === "1");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark"), [accent, setAccent] = useState(localStorage.getItem("accent") || "emerald");
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => { document.documentElement.dataset.accent = accent; localStorage.setItem("accent", accent); }, [accent]);
  useEffect(() => { const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalInit(""); setPal((p) => !p); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) { if (e.key === "/") { e.preventDefault(); setPalInit(""); setPal(true); } else if (e.key === "n") { e.preventDefault(); setPalInit("task "); setPal(true); } } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  useEffect(() => { const t = new URLSearchParams(location.search).get("verify");
    if (t) { api("/auth/verify/", { method: "POST", body: { token: t } }).then(() => setNotice("Email verified ✓")).catch((e) => setNotice(e.message)); history.replaceState({}, "", location.pathname); } }, []);
  useEffect(() => { if (name) return startReminders(); }, [name]);
  useEffect(() => { if (name) api("/profile/").then((p) => setXp(p.total)).catch(() => {}); }, [name, rev, tab]);
  useEffect(() => { if (xp === null) return; const l = level(xp).l, key = "lvl:" + name, prev = +localStorage.getItem(key) || 0;
    if (prev && l > prev) { setNotice(`🎉 Level up! You reached Level ${l}`); confetti(innerWidth / 2, innerHeight / 3); } localStorage.setItem(key, l); }, [xp]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { const h = (e) => setUndo(e.detail); window.addEventListener("undo", h); return () => window.removeEventListener("undo", h); }, []);
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(t); }, [undo]);
  const logout = () => { const rt = localStorage.getItem("refresh"); if (rt) api("/auth/logout/", { method: "POST", body: { refresh: rt } }).catch(() => {}); ["token", "refresh", "name"].forEach((k) => localStorage.removeItem(k)); setMenu(false); setName(null); setXp(null); };
  const toast = notice && <div className="toast" onClick={() => setNotice("")}>{notice}</div>, resetToken = new URLSearchParams(location.search).get("reset");
  if (resetToken || !name) return <>{toast}<Auth onLogin={setName} resetToken={resetToken} /></>;
  const go = (t) => { setTab(t); setMenu(false); setOpen(false); }, openPal = (init) => { setPalInit(init); setPal(true); setFab(false); }, flip = () => setTheme(theme === "dark" ? "light" : "dark"), lv = level(xp ?? 0);
  return (<div className={"shell " + (rail ? "rail" : "")}><div className="topbar"><button className="burger" onClick={() => setOpen(!open)}>☰</button><div className="logo">Orbit<span>ly</span></div></div>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}
    <aside className={open ? "open" : ""}><div className="logo">Orbit<span>ly</span></div>
      {NAV.map(([sec, items]) => <div key={sec}><div className="nav-sec">{sec}</div>
        {items.map(([k, ic, l]) => <button key={k} className={"nav " + (tab === k ? "on" : "")} onClick={() => go(k)}><span className="ni">{ic}</span>{l}</button>)}</div>)}
      <div className="grow" />
      {menu && <div className="menu"><button onClick={() => go("profile")}>👤 Profile</button><button onClick={() => go("settings")}>⚙️ Settings</button>
        <button onClick={flip}>{theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}</button><button className="red" onClick={logout}>🚪 Log out</button></div>}
      <button className="me" onClick={() => setMenu(!menu)}><span className="avatar sm">{(name || "?")[0].toUpperCase()}</span>
        <span className="mcol"><b>{name}</b><small>Lv {lv.l} · {lv.name}</small><span className="xp"><i style={{ width: lv.pct + "%" }} /></span></span></button></aside>
    <main><div className="toolbar"><div className="row"><button className="icon-pill collapse" title="Collapse sidebar" onClick={() => { const v = !rail; setRail(v); localStorage.setItem("rail", v ? "1" : "0"); }}>{rail ? "»" : "«"}</button></div>
      <div className="row"><button className="pill" onClick={() => openPal("")}>🔎 <span>Search or command</span><kbd>Ctrl K</kbd></button><button className="icon-pill" onClick={flip} title="Toggle theme">{theme === "dark" ? "☀️" : "🌙"}</button></div></div>
      <div className="page" key={tab + rev}>{tab === "home" ? <Home key={rev} name={name} go={go} /> : tab === "journal" ? <Journal /> : tab === "analytics" ? <Analytics /> : tab === "profile" ? <Profile />
        : tab === "settings" ? <Settings theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} onName={setName} logout={logout} /> : <Module key={tab + rev} kind={tab} />}</div></main>
    {toast}{undo && <div className="toast undo"><span>{undo.msg}</span><button onClick={async () => { await undo.fn(); setUndo(null); }}>Undo</button></div>}{pal && <Palette initial={palInit} onClose={() => setPal(false)} onDone={(t) => { setTab(t); setRev((r) => r + 1); }} toggleTheme={flip} logout={logout} />}
    <div className={"fab " + (fab ? "open" : "")}>{FAB.map(([ic, l, pre], i) => <button key={l} className="fab-item" style={{ "--i": i }} onClick={() => openPal(pre)}><span>{l}</span>{ic}</button>)}
      <button className="fab-main" onClick={() => setFab(!fab)} aria-label="Quick add">＋</button></div></div>);
}
