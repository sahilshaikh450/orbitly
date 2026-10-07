import { useEffect, useState } from "react"; import Auth from "./Auth.jsx"; import Module from "./Module.jsx"; import Home from "./Home.jsx"; import Palette from "./Palette.jsx"; import { Profile, Settings } from "./Profile.jsx"; import { CFG } from "./config";
export default function App() {
  const [name, setName] = useState(localStorage.getItem("token") ? localStorage.getItem("name") : null);
  const [tab, setTab] = useState("home"); const [menu, setMenu] = useState(false), [pal, setPal] = useState(false), [rev, setRev] = useState(0), [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme); }, [theme]);
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("name"); setMenu(false); setName(null); };
  useEffect(() => { const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPal((p) => !p); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  if (!name) return <Auth onLogin={setName} />;
  const go = (t) => { setTab(t); setMenu(false); setOpen(false); };
  return (<div className="shell"><div className="topbar"><button className="burger" onClick={() => setOpen(!open)}>☰</button><div className="logo">Life<span>OS</span></div></div>
    {open && <div className="scrim" onClick={() => setOpen(false)} />}<aside className={open ? "open" : ""}>
    <div className="logo">Life<span>OS</span></div>
    <button className={"nav " + (tab === "home" ? "on" : "")} onClick={() => go("home")}>🏠 Dashboard</button>{Object.entries(CFG).map(([k, c]) => <button key={k} className={"nav " + (tab === k ? "on" : "")} onClick={() => go(k)}>{c.icon} {c.title}</button>)}
    <div className="grow" />
    {menu && <div className="menu"><button onClick={() => go("profile")}>👤 Profile</button><button onClick={() => go("settings")}>⚙️ Settings</button>
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}</button>
      <button className="red" onClick={logout}>🚪 Log out</button></div>}
    <button className="nav" onClick={() => setPal(true)}>🔎 Quick actions <kbd>Ctrl K</kbd></button>
    <button className="me" onClick={() => setMenu(!menu)}><span className="avatar sm">{(name || "?")[0].toUpperCase()}</span><span>{name}</span></button></aside>
    <main>{tab === "home" ? <Home key={rev} name={name} go={go} /> : tab === "profile" ? <Profile /> : tab === "settings" ? <Settings theme={theme} setTheme={setTheme} onName={setName} logout={logout} /> : <Module key={tab + rev} kind={tab} />}</main>{pal && <Palette onClose={() => setPal(false)} onDone={(t) => { setTab(t); setRev((r) => r + 1); }} toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} logout={logout} />}</div>);
}
