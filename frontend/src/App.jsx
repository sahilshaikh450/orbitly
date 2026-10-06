import { useEffect, useState } from "react"; import Auth from "./Auth.jsx"; import Module from "./Module.jsx"; import { Profile, Settings } from "./Profile.jsx"; import { CFG } from "./config";
export default function App() {
  const [name, setName] = useState(localStorage.getItem("token") ? localStorage.getItem("name") : null);
  const [tab, setTab] = useState("habits"); const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme); }, [theme]);
  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("name"); setMenu(false); setName(null); };
  if (!name) return <Auth onLogin={setName} />;
  const go = (t) => { setTab(t); setMenu(false); };
  return (<div className="shell"><aside>
    <div className="logo">Life<span>OS</span></div>
    {Object.entries(CFG).map(([k, c]) => <button key={k} className={"nav " + (tab === k ? "on" : "")} onClick={() => go(k)}>{c.icon} {c.title}</button>)}
    <div className="grow" />
    {menu && <div className="menu"><button onClick={() => go("profile")}>👤 Profile</button><button onClick={() => go("settings")}>⚙️ Settings</button>
      <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}</button>
      <button className="red" onClick={logout}>🚪 Log out</button></div>}
    <button className="me" onClick={() => setMenu(!menu)}><span className="avatar sm">{(name || "?")[0].toUpperCase()}</span><span>{name}</span></button></aside>
    <main>{tab === "profile" ? <Profile /> : tab === "settings" ? <Settings theme={theme} setTheme={setTheme} onName={setName} logout={logout} /> : <Module key={tab} kind={tab} />}</main></div>);
}
