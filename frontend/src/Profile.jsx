import { useEffect, useState } from "react"; import { api } from "./api"; import { getR, setR, notify } from "./reminders";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lvl = (n) => (n === 0 ? 0 : n === 1 ? 1 : n < 4 ? 2 : n < 7 ? 3 : 4);
const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ICON = { HABIT: "💪", MONEY: "💰", TASK: "✅", GOAL: "🎯", SPLIT: "🤝" };
export function Profile() {
  const [p, setP] = useState(null); const [day, setDay] = useState(null);
  useEffect(() => { api("/profile/").then(setP); }, []);
  if (!p) return <p className="muted">Loading...</p>;
  const end = new Date(), start = new Date(end); start.setDate(start.getDate() - 364); start.setDate(start.getDate() - start.getDay());
  const weeks = []; let d = new Date(start), w = [];
  while (d <= end) { w.push(new Date(d)); if (w.length === 7) { weeks.push(w); w = []; } d.setDate(d.getDate() + 1); } if (w.length) weeks.push(w);
  const year = Object.values(p.by_day).reduce((a, b) => a + b, 0);
  const list = day ? p.items.filter((i) => i.date === day) : p.items.slice(0, 40);
  const groups = list.reduce((m, i) => ((m[i.date] = m[i.date] || []).push(i), m), {});
  return (<div>
    <div className="card prof"><div className="avatar">{(p.name || p.email)[0].toUpperCase()}</div>
      <div className="grow"><h1>{p.name || "Your name"}</h1><div className="muted">{p.email} · Joined {p.joined}</div><p>{p.bio || "Add a bio in Settings."}</p></div></div>
    <div className="stats">{[["Current streak", p.current_streak + " days 🔥"], ["Longest streak", p.longest_streak + " days"], ["Total activities", p.total], ["Active days", p.active_days]].map(([l, v]) =>
      <div className="card stat" key={l}><span className="muted small">{l.toUpperCase()}</span><b>{v}</b></div>)}</div>
    <div className="card"><b>Achievements</b><div className="badges">{[["🌱", "First step", p.total >= 1], ["🔥", "3-day streak", p.longest_streak >= 3], ["⚡", "7-day streak", p.longest_streak >= 7], ["🏆", "30-day streak", p.longest_streak >= 30],
      ["📅", "30 active days", p.active_days >= 30], ["💯", "100 activities", p.total >= 100], ["🎯", "Goal setter", (p.kinds.GOAL || 0) >= 1], ["🤝", "Split master", (p.kinds.SPLIT || 0) >= 1]].map(([i, n, on]) =>
      <div key={n} className={"badge " + (on ? "on" : "")}><span>{i}</span><small>{n}</small></div>)}</div></div>
    <div className="card"><div className="row sp"><b>{year} activities in the last year</b>
      <div className="row small muted">Less {[0,1,2,3,4].map((c) => <i key={c} className={"sq c" + c} />)} More</div></div>
      <div className="heatwrap"><div className="heat">{weeks.map((w, i) => <div className="wk" key={i}><span className="mo">{w[0].getDate() <= 7 ? MN[w[0].getMonth()] : ""}</span>
        {w.map((x) => { const k = ymd(x), n = p.by_day[k] || 0;
          return <i key={k} className={"c" + lvl(n) + (day === k ? " pick" : "")} title={`${k}: ${n} activities`} onClick={() => setDay(day === k ? null : k)} />; })}</div>)}</div></div>
      <div className="chips">{Object.entries(p.kinds).map(([k, n]) => <span className="chip on" key={k}>{ICON[k]} {k} · {n}</span>)}</div></div>
    <div className="card"><div className="row sp"><b>{day ? `Activity on ${day}` : "Recent activity"}</b>{day && <a onClick={() => setDay(null)}>Clear</a>}</div>
      {list.length === 0 && <p className="muted">Nothing here yet. Complete a habit or task to start your streak.</p>}
      {Object.entries(groups).map(([dt, a]) => <div key={dt}><div className="day">{dt}</div>
        {a.map((i) => <div className="act" key={i.id}><span>{ICON[i.kind]}</span><span className="grow">{i.text}</span><span className="muted small">{i.time}</span></div>)}</div>)}</div></div>);
}
export function Settings({ theme, setTheme, onName, logout }) {
  const [f, setF] = useState(null); const [msg, setMsg] = useState(""); const [r, setRs] = useState(getR()); const [pw, setPw] = useState({ old_password: "", new_password: "" });
  useEffect(() => { api("/profile/").then((p) => setF({ name: p.name, bio: p.bio, currency: p.currency, email: p.email })); }, []);
  if (!f) return <p className="muted">Loading...</p>;
  const save = async (e) => { e.preventDefault(); await api("/profile/", { method: "PATCH", body: { name: f.name, bio: f.bio, currency: f.currency } });
    localStorage.setItem("cur", f.currency); localStorage.setItem("name", f.name); onName(f.name || f.email); setMsg("Saved ✓"); };
  const upd = (n) => { setR(n); setRs(n); };
  const toggleR = async () => { if (!r.on && "Notification" in window && Notification.permission !== "granted") { if ((await Notification.requestPermission()) !== "granted") { setMsg("Notifications are blocked in your browser settings."); return; } } upd({ ...r, on: !r.on }); };
  const changePw = async (e) => { e.preventDefault(); try { await api("/auth/password/", { method: "POST", body: pw }); setMsg("Password updated ✓"); setPw({ old_password: "", new_password: "" }); } catch (x) { setMsg(x.message); } };
  const exportData = async () => { const all = {}; for (const k of ["habits", "expenses", "todos", "goals", "splits"]) all[k] = await api(`/${k}/`);
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: "application/json" })); a.download = "lifeos-export.json"; a.click(); };
  return (<div className="settings"><h1>⚙️ Settings</h1>{msg && <div className="ok">{msg}</div>}
    <form className="card" onSubmit={save}><h3>Profile</h3>
      <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>Email<input value={f.email} disabled /></label>
      <label>Bio<input value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="Tell us about yourself" /></label>
      <label>Currency<select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{["₹", "$", "€", "£", "¥", "AED"].map((c) => <option key={c}>{c}</option>)}</select></label>
      <button className="btn primary">Save changes</button></form>
    <div className="card"><h3>Appearance</h3><div className="row sp"><span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
      <button className={"switch " + (theme === "light" ? "on" : "")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><i /></button></div></div>
    <div className="card"><h3>Reminders &amp; app</h3>
      <div className="row sp"><span>Daily reminders</span><button className={"switch " + (r.on ? "on" : "")} onClick={toggleR}><i /></button></div>
      {r.on && <div className="row wrap"><label style={{ flex: 1 }}>Habit reminder<input type="time" value={r.habit} onChange={(e) => upd({ ...r, habit: e.target.value })} /></label>
        <label style={{ flex: 1 }}>Task reminder<input type="time" value={r.task} onChange={(e) => upd({ ...r, task: e.target.value })} /></label></div>}
      <div className="row wrap"><button type="button" className="btn" onClick={() => notify("Orbitly", "Notifications are working 🎉")}>Send test notification</button>
        {window.__bip && <button type="button" className="btn primary" onClick={() => window.__bip.prompt()}>Install app</button>}</div>
      <p className="muted small">Reminders fire while Orbitly is open in a browser tab or as an installed app.</p></div>
    <form className="card" onSubmit={changePw}><h3>Change password</h3>
      <input type="password" placeholder="Current password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} required />
      <input type="password" placeholder="New password (min 6)" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required />
      <button className="btn">Update password</button></form>
    <div className="card"><h3>Data &amp; account</h3><div className="row"><button className="btn" onClick={exportData}>⬇ Export my data</button><button className="btn red" onClick={logout}>Log out</button></div></div></div>);
}
