import { useEffect, useState } from "react"; import { api } from "./api"; import { Num, Skel } from "./Extras";
const MOODS = [["😞", "Awful"], ["😕", "Low"], ["😐", "Okay"], ["🙂", "Good"], ["😄", "Great"]], COL = ["#ef4444", "#fb923c", "#facc15", "#34d399", "#10b981"];
const PROMPTS = ["What are you grateful for today?", "What was the highlight of your day?", "What drained your energy today?", "What did you learn today?", "What would make tomorrow great?"];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function Journal() {
  const today = ymd(new Date());
  const [list, setList] = useState(null), [acts, setActs] = useState([]), [day, setDay] = useState(today), [f, setF] = useState({ mood: 3, text: "", tags: "" }), [q, setQ] = useState(""), [msg, setMsg] = useState("");
  const load = () => Promise.all([api("/journal/"), api("/profile/")]).then(([j, p]) => { setList(j); setActs(p.items); });
  useEffect(() => { load(); }, []);
  useEffect(() => { const e = list && list.find((x) => x.date === day); setF(e ? { mood: e.mood, text: e.text, tags: e.tags } : { mood: 3, text: "", tags: "" }); }, [day, list]);
  if (!list) return <Skel />;
  const save = async (e) => { e.preventDefault(); await api("/journal/", { method: "POST", body: { ...f, date: day } }); setMsg("Saved ✓"); setTimeout(() => setMsg(""), 2000); load(); };
  const by = Object.fromEntries(list.map((e) => [e.date, e])), set = new Set(list.map((e) => e.date));
  const end = new Date(), start = new Date(end); start.setDate(start.getDate() - 83); start.setDate(start.getDate() - start.getDay());
  const weeks = []; let d = new Date(start), w = []; while (d <= end) { w.push(new Date(d)); if (w.length === 7) { weeks.push(w); w = []; } d.setDate(d.getDate() + 1); } if (w.length) weeks.push(w);
  let s = new Date(); if (!set.has(ymd(s))) s.setDate(s.getDate() - 1); let streak = 0; while (set.has(ymd(s))) { streak++; s.setDate(s.getDate() - 1); }
  const cut = ymd(new Date(Date.now() - 29 * 864e5)), rec = list.filter((e) => e.date >= cut), avg = (a) => (a.length ? a.reduce((n, e) => n + e.mood, 0) / a.length : null);
  const hc = {}; acts.forEach((a) => { if (a.kind === "HABIT" && a.text.startsWith("Completed")) hc[a.date] = (hc[a.date] || 0) + 1; });
  const hi = list.filter((e) => (hc[e.date] || 0) >= 2), lo = list.filter((e) => (hc[e.date] || 0) < 2);
  const shown = list.filter((e) => (e.text + e.tags).toLowerCase().includes(q.toLowerCase()));
  return (<div><div className="head"><div><h1>📓 Journal &amp; Mood</h1><p className="muted">Reflect daily. Spot what lifts your mood.</p></div></div>
    <div className="stats">{[["Entries", list.length], ["Writing streak", streak + " 🔥"], ["30-day mood", avg(rec) ? avg(rec).toFixed(1) + " / 5" : "—"], ["This week", list.filter((e) => e.date >= ymd(new Date(Date.now() - 6 * 864e5))).length + " entries"]].map(([l, v]) =>
      <div className="card stat" key={l}><span className="muted small">{l.toUpperCase()}</span><b><Num v={v} /></b></div>)}</div>
    {hi.length >= 2 && lo.length >= 2 && <div className="card tip">💡 On days you complete 2+ habits your mood averages <b>{avg(hi).toFixed(1)}</b> vs <b>{avg(lo).toFixed(1)}</b> on other days.</div>}
    <form className="card" onSubmit={save}><div className="row sp wrap"><b>How was your day?</b><input type="date" style={{ width: 170 }} max={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} /></div>
      <div className="moods">{MOODS.map(([em, l], i) => <button type="button" key={l} className={"mood-btn " + (f.mood === i + 1 ? "on" : "")} onClick={() => setF({ ...f, mood: i + 1 })}>{em}<small>{l}</small></button>)}</div>
      <textarea rows="6" maxLength="5000" placeholder={PROMPTS[new Date(day + "T00:00:00").getDate() % PROMPTS.length]} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <input placeholder="Tags (comma separated), e.g. work, family" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} />
      <div className="row"><button className="btn primary">{by[day] ? "Update entry" : "Save entry"}</button>{msg && <span className="inc">{msg}</span>}</div></form>
    <div className="card"><b>Mood calendar</b><span className="muted small"> · last 12 weeks, click a day to open it</span>
      <div className="heatwrap"><div className="heat">{weeks.map((w, i) => <div className="wk" key={i}><span className="mo" />{w.map((x) => { const k = ymd(x), e = by[k];
        return <i key={k} className={day === k ? "pick" : ""} style={e ? { background: COL[e.mood - 1] } : undefined} title={e ? `${k}: ${MOODS[e.mood - 1][1]}` : k} onClick={() => setDay(k)} />; })}</div>)}</div></div>
      <div className="row small muted" style={{ marginTop: 8 }}>{MOODS.map(([em, l], i) => <span key={l}><i className="sq" style={{ background: COL[i] }} /> {l}</span>)}</div></div>
    <input className="search" placeholder="🔍 Search your entries..." value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="list">{shown.map((e) => <div className="card rowi" key={e.id}><span style={{ fontSize: 30 }}>{MOODS[e.mood - 1][0]}</span>
      <div className="grow link" onClick={() => { setDay(e.date); scrollTo({ top: 0, behavior: "smooth" }); }}><b>{e.date}</b><div className="muted small">{e.text.slice(0, 160) || "No text"}{e.text.length > 160 ? "…" : ""}</div>
        {e.tags && <div className="tags">{e.tags.split(",").filter(Boolean).map((t) => <span className="tag" key={t}>#{t.trim()}</span>)}</div>}</div>
      <button className="icon-btn" onClick={() => api(`/journal/${e.id}/`, { method: "DELETE" }).then(load)}>🗑</button></div>)}</div>
    {list.length === 0 && <p className="muted center">No entries yet. Write your first one above ✍️</p>}</div>);
}
