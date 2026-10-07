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
    <input type="checkbox" checked={t.status === "DONE"} onChange={(e) => { if (t.status !== "DONE") { const b = e.target.getBoundingClientRect(); confetti(b.x + 8, b.y + 8); } patch(t.id, { status: t.status === "DONE" ? "TODO" : "DONE" }); }} />
    <div className="grow"><b className={"link " + (t.status === "DONE" ? "strike" : "")} onClick={() => openEdit(t)}>{t.title}</b>
      <div className="muted small">{t.description}</div></div>
    {t.focus_minutes > 0 && <span className="tag">⏱ {t.focus_minutes}m</span>}
    {t.due_date && <span className={"tag " + (t.status !== "DONE" && t.due_date < now ? "p-URGENT" : "")}>📅 {t.due_date}</span>}
    <span className={"tag p-" + t.priority}>{t.priority}</span><button className="icon-btn" onClick={() => del(t.id)}>🗑</button></div>)}</div>);
}

export function CalendarView({ items, openEdit, create }) {
  const [cur, setCur] = useState(() => { const d = new Date(); d.setDate(1); return d; }), [sel, setSel] = useState(ymd(new Date())), [txt, setTxt] = useState("");
  const y = cur.getFullYear(), m = cur.getMonth(), first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), today = ymd(new Date());
  const cells = [...Array(first).fill(null), ...[...Array(dim)].map((_, i) => ymd(new Date(y, m, i + 1)))], on = (k) => items.filter((t) => t.due_date === k);
  return (<div><div className="row sp" style={{ marginTop: 12 }}><button className="btn" onClick={() => setCur(new Date(y, m - 1, 1))}>‹</button><b>{MN[m]} {y}</b><button className="btn" onClick={() => setCur(new Date(y, m + 1, 1))}>›</button></div>
    <div className="cal">{DN.map((d) => <div className="cal-h" key={d}>{d}</div>)}
      {cells.map((k, i) => k ? <div key={k} className={"cal-c " + (k === today ? "today " : "") + (k === sel ? "sel" : "")} onClick={() => setSel(k)}><span>{+k.slice(8)}</span>
        {on(k).slice(0, 2).map((t) => <i key={t.id} className={"p-" + t.priority + (t.status === "DONE" ? " done" : "")}>{t.title}</i>)}{on(k).length > 2 && <small>+{on(k).length - 2} more</small>}</div> : <div key={"e" + i} />)}</div>
    <div className="card"><b>Tasks on {sel}</b>
      {on(sel).length === 0 && <p className="muted small">No tasks on this day.</p>}
      {on(sel).map((t) => <div className="act" key={t.id}><span className={"grow link " + (t.status === "DONE" ? "strike" : "")} onClick={() => openEdit(t)}>{t.title}</span><span className={"tag p-" + t.priority}>{t.priority}</span><span className="tag">{t.status}</span></div>)}
      <input placeholder="+ Add a task for this day and press Enter" value={txt} onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && txt.trim()) { create({ title: txt.trim(), due_date: sel, priority: "MEDIUM", status: "TODO" }); setTxt(""); } }} /></div></div>);
}

export function Num({ v }) {
  const s = String(v), m = s.match(/^([^\d-]*)(-?[\d,]*\.?\d+)([\s\S]*)$/), target = m ? parseFloat(m[2].replace(/,/g, "")) : 0, [x, setX] = useState(0);
  useEffect(() => { if (!m) return; if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setX(target); return; }
    let raf, t0; const step = (t) => { t0 = t0 || t; const p = Math.min(1, (t - t0) / 800); setX(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf); }, [target]);
  if (!m) return s;
  const dec = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return <>{m[1]}{x.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: false })}{m[3]}</>;
}
export function Ring({ pct, size = 120 }) {
  const [p, setP] = useState(0), C = 2 * Math.PI * 52;
  useEffect(() => { const t = setTimeout(() => setP(pct), 150); return () => clearTimeout(t); }, [pct]);
  return (<svg className="ring" width={size} height={size} viewBox="0 0 120 120"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#10b981" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c0)" strokeWidth="10" />
    <circle className="v" cx="60" cy="60" r="52" fill="none" stroke="url(#rg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(p / 100) * C} ${C}`} transform="rotate(-90 60 60)" />
    <text x="60" y="69" textAnchor="middle" fontSize="30" fontWeight="800" fill="currentColor"><Num v={pct} /></text></svg>);
}
export const Skel = () => <div>{[120, 90, 90].map((h, i) => <div className="skel" key={i} style={{ height: h }} />)}</div>;
export function confetti(x, y) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cols = ["#10b981", "#34d399", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6"];
  for (let i = 0; i < 28; i++) { const e = document.createElement("i"); e.className = "cf"; e.style.cssText = `left:${x}px;top:${y}px;background:${cols[i % 6]}`; document.body.appendChild(e);
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 100;
    e.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 70}px) rotate(${Math.random() * 540}deg) scale(.4)`, opacity: 0 }],
      { duration: 700 + Math.random() * 500, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => e.remove(); }
}

export const level = (n) => { const l = Math.floor(Math.sqrt(n / 5)) + 1, lo = 5 * (l - 1) ** 2, hi = 5 * l ** 2;
  return { l, pct: Math.round(((n - lo) / (hi - lo)) * 100), left: hi - n, name: ["Novice", "Explorer", "Achiever", "Pro", "Master", "Legend"][Math.min(5, Math.floor((l - 1) / 2))] }; };
