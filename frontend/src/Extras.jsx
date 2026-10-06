import { useEffect, useState } from "react"; import { api } from "./api";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const PRI = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
export function WeekChart({ items }) {
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return DN[d.getDay()]; });
  const counts = days.map((_, i) => items.filter((h) => h.week[i]).length), max = Math.max(1, items.length), today = counts[6];
  return (<div className="card"><div className="row sp"><b>This week</b><span className="muted small">Today: {today}/{items.length} done</span></div>
    <div className="wbars">{counts.map((c, i) => <div key={i}><i style={{ height: (c / max) * 70 + 4 }} /><span>{days[i]}</span><em>{c}</em></div>)}</div></div>);
}
export function HabitDetail({ h, onToggle, onClose }) {
  const set = new Set(h.logs), today = new Date(), start = new Date(today);
  start.setDate(start.getDate() - 118); start.setDate(start.getDate() - start.getDay());
  const weeks = []; let d = new Date(start), w = [];
  while (d <= today) { w.push(new Date(d)); if (w.length === 7) { weeks.push(w); w = []; } d.setDate(d.getDate() + 1); } if (w.length) weeks.push(w);
  return (<div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
    <div className="row sp"><h2>{h.icon} {h.name}</h2><button className="icon-btn" onClick={onClose}>✕</button></div><p className="muted">{h.description}</p>
    <div className="stats">{[["Streak", h.streak + " 🔥"], ["Best", h.best], ["30-day rate", h.rate30 + "%"], ["Total", h.total]].map(([l, v]) =>
      <div className="card stat" key={l}><span className="muted small">{l.toUpperCase()}</span><b>{v}</b></div>)}</div>
    <div className="card"><b>Last 17 weeks</b><span className="muted small"> · click a day to mark or unmark it</span>
      <div className="heatwrap"><div className="heat">{weeks.map((w, i) => <div className="wk" key={i}><span className="mo">{w[0].getDate() <= 7 ? MN[w[0].getMonth()] : ""}</span>
        {w.map((x) => { const k = ymd(x); return <i key={k} className={set.has(k) ? "c3" : ""} title={k} onClick={() => onToggle(k)} />; })}</div>)}</div></div></div></div></div>);
}
export function Focus({ tasks, onDone }) {
  const open = tasks.filter((t) => t.status !== "DONE");
  const [id, setId] = useState(""), [mins, setMins] = useState(25), [left, setLeft] = useState(1500), [on, setOn] = useState(false);
  useEffect(() => { if (!on) return; const t = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(t); }, [on]);
  useEffect(() => { if (on && left <= 0) { setOn(false); if (id) api(`/todos/${id}/focus/`, { method: "POST", body: { minutes: mins } }).then(onDone); setLeft(mins * 60); } }, [left]);
  const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(2, "0"), ss = String(Math.max(0, left) % 60).padStart(2, "0");
  return (<div className="card focus"><div><b>🍅 Focus timer</b><div className="timer">{mm}:{ss}</div>
    <div className="prog"><i style={{ width: (1 - left / (mins * 60)) * 100 + "%" }} /></div></div>
    <div className="grow"><select value={id} onChange={(e) => setId(e.target.value)}><option value="">Select a task to focus on</option>{open.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
      <div className="row wrap"><select style={{ width: 110 }} disabled={on} value={mins} onChange={(e) => { setMins(+e.target.value); setLeft(+e.target.value * 60); }}>{[15, 25, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
        <button className="btn primary" disabled={!id} onClick={() => setOn(!on)}>{on ? "Pause" : "Start"}</button>
        <button className="btn" onClick={() => { setOn(false); setLeft(mins * 60); }}>Reset</button></div>
      {!id && <div className="muted small">Pick a task to log focus time on it.</div>}</div></div>);
}
export function TaskList({ items, view, patch, del, openEdit }) {
  const now = ymd(new Date());
  let list = view === "today" ? items.filter((t) => t.status !== "DONE" && t.due_date && t.due_date <= now)
    : [...items].sort((a, b) => (a.status === "DONE") - (b.status === "DONE") || PRI[a.priority] - PRI[b.priority] || (a.due_date || "9").localeCompare(b.due_date || "9"));
  if (!list.length) return <p className="muted center">{view === "today" ? "Nothing due today. Enjoy your day 🎉" : "No tasks yet."}</p>;
  return (<div className="list">{list.map((t) => <div className="card rowi" key={t.id}>
    <input type="checkbox" checked={t.status === "DONE"} onChange={() => patch(t.id, { status: t.status === "DONE" ? "TODO" : "DONE" })} />
    <div className="grow"><b className={"link " + (t.status === "DONE" ? "strike" : "")} onClick={() => openEdit(t)}>{t.title}</b>
      <div className="muted small">{t.description}</div></div>
    {t.focus_minutes > 0 && <span className="tag">⏱ {t.focus_minutes}m</span>}
    {t.due_date && <span className={"tag " + (t.status !== "DONE" && t.due_date < now ? "p-URGENT" : "")}>📅 {t.due_date}</span>}
    <span className={"tag p-" + t.priority}>{t.priority}</span><button className="icon-btn" onClick={() => del(t.id)}>🗑</button></div>)}</div>);
}
