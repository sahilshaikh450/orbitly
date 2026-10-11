import Icon, { Face } from "./Icon.jsx";
import { useEffect, useRef, useState } from "react"; import { api } from "./api"; import { CFG, cur } from "./config"; import { Goals, Splits, Emi, Budgets, Trend, Recurring, Accounts } from "./Finance"; import { WeekChart, HabitDetail, Focus, TaskList, CalendarView, Num, Skel, confetti, undoable, sIc, CI } from "./Extras";
const COLS = [["TODO", "To Do"], ["IN_PROGRESS", "In Progress"], ["DONE", "Done"]];
const SUBS = [["tx", "Transactions"], ["accounts", "Accounts"], ["goals", "Savings Goals"], ["split", "Split Tracker"], ["recurring", "Recurring"], ["budget", "Budgets"], ["emi", "EMI Calculator"]];
export default function Module({ kind }) {
  const cfg = CFG[kind], C = cur(), now = new Date().toISOString().slice(0, 10);
  const ymdL = (n = 0) => { const d = new Date(Date.now() + n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const [items, setItems] = useState([]), [tpls, setTpls] = useState([]), [modal, setModal] = useState(null), [form, setForm] = useState({}),
    [sel, setSel] = useState(null), [flt, setFlt] = useState("ALL"), [q, setQ] = useState(""), [sub, setSub] = useState("tx"), [detail, setDetail] = useState(null), [view, setView] = useState("board"), [mon, setMon] = useState(new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0")), [sort, setSort] = useState("new"), [quick, setQuick] = useState(""), [loaded, setLoaded] = useState(false), [fz, setFz] = useState(0);
  const load = () => api(`/${kind}/`).then((r) => { setItems(r); setLoaded(true); if (kind === "habits") api("/profile/").then((p) => setFz(p.freezes)).catch(() => {}); });
  useEffect(() => { if (kind === "expenses") api("/recurring/run/", { method: "POST" }).finally(load); else load(); api(`/templates/${kind}/`).then(setTpls); }, []);
  const create = async (d) => { const b = { ...d }; Object.keys(b).forEach((k) => b[k] === "" && delete b[k]);
    if (kind === "expenses" && !b.date) b.date = now; try { await api(`/${kind}/`, { method: "POST", body: b }); setModal(null); setSel(null); load(); return true; } catch (x) { alert(x.message); return false; } };
  const del = async (id) => { const it = items.find((x) => x.id === id); await api(`/${kind}/${id}/`, { method: "DELETE" }); load();
    if (it) undoable(`${cfg.noun} deleted`, async () => { const b = {}; [...cfg.fields.map((f) => f[0]), "subtasks"].forEach((k) => { if (it[k] !== undefined && it[k] !== null && it[k] !== "") b[k] = it[k]; }); await api(`/${kind}/`, { method: "POST", body: b }); load(); }); };
  const patch = async (id, body) => { await api(`/${kind}/${id}/`, { method: "PATCH", body }); load(); };
  const check = async (id) => { await api(`/habits/${id}/check/`, { method: "POST" }); load(); };
  const openNew = () => { touched.current = { cat: false, type: false }; setSug(null); setForm(Object.fromEntries(cfg.fields.map((f) => [f[0], f[3]]))); setModal("new"); };
  const [fk, fopts] = cfg.filter; const main = kind !== "expenses" || sub === "tx";
  const mi = kind === "expenses" && mon !== "ALL" ? items.filter((x) => x.date.startsWith(mon)) : items;
  const shiftMon = (n) => { const [y, m] = mon.split("-").map(Number), d = new Date(y, m - 1 + n, 1); setMon(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")); };
  const monLabel = mon === "ALL" ? "All time" : new Date(mon + "-01T00:00:00").toLocaleString("en", { month: "long", year: "numeric" });
  const shown = mi.filter((i) => (flt === "ALL" || i[fk] === flt) && ((i.name || i.title) + " " + (i.tags || "") + " " + (i.description || "")).toLowerCase().includes(q.toLowerCase()));
  const ydayStr = (() => { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const freezeIt = async (id, date) => { try { await api(`/habits/${id}/freeze/`, { method: "POST", body: { date } }); load(); } catch (e) { alert(e.message); } };
  const [sug, setSug] = useState(null), [mlInfo, setMlInfo] = useState(null), touched = useRef({ cat: false, type: false });
  useEffect(() => { if (kind !== "expenses" || modal !== "new") { setSug(null); return; } const t = (form.title || "").trim(); if (t.length < 3) { setSug(null); return; }
    const h = setTimeout(() => api("/expenses/suggest/?title=" + encodeURIComponent(t)).then((r) => { if (!r.category) { setSug(null); return; } setSug(r);
      setForm((f) => ({ ...f, ...(r.confidence >= 0.6 && !touched.current.cat ? { category: r.category } : {}), ...(r.confidence >= 0.6 && !touched.current.type ? { type: r.type } : {}) })); }).catch(() => {}), 350);
    return () => clearTimeout(h); }, [form.title, modal]);
  useEffect(() => { if (kind === "expenses") api("/expenses/model/").then(setMlInfo).catch(() => {}); }, [items.length]);
  const MKEY = "orbitly:tpl:" + kind;
  const [mine, setMine] = useState(() => { try { return JSON.parse(localStorage.getItem(MKEY) || "[]"); } catch (e) { return []; } }), [tf, setTf] = useState(null), [saveTpl, setSaveTpl] = useState(false);
  const allTpls = [...mine.map((t) => ({ ...t, _mine: true })), ...tpls];
  const fieldsUI = (vals, setVals) => cfg.fields.map(([k, l, type, , o]) => <label key={k}>{l}{type === "select" ? <select value={vals[k]} onChange={(e) => { if (kind === "expenses" && vals === form) { if (k === "category") touched.current.cat = true; if (k === "type") touched.current.type = true; } setVals({ ...vals, [k]: e.target.value }); }}>{o.map((x) => <option key={x} value={x}>{x === "UPI" ? x : x.charAt(0) + x.slice(1).toLowerCase().replace("_", " ")}</option>)}</select>
          : <input type={type} value={vals[k]} autoFocus={k === "amount"} onFocus={(e) => k === "amount" && e.target.select()} required={["title", "name", "amount"].includes(k)} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />}{k === "due_date" && <div className="chips" style={{ margin: "0 0 10px" }}>{[["Today", 0], ["Tomorrow", 1], ["Next week", 7]].map(([n, d]) => <button type="button" key={n} className="chip" onClick={() => setVals({ ...vals, due_date: ymdL(d) })}>{n}</button>)}</div>}{k === "title" && kind === "expenses" && vals === form && sug && <div className="sug"><Icon name="zap" />
      <span>Suggested <b>{sug.category.charAt(0) + sug.category.slice(1).toLowerCase()}</b> · {Math.round(sug.confidence * 100)}%{sug.evidence.length > 0 && <span className="muted"> from “{sug.evidence.join("”, “")}”</span>}</span>
      {vals.category !== sug.category && <button type="button" className="chip" onClick={() => { touched.current.cat = true; setVals({ ...vals, category: sug.category, type: sug.type }); }}>Use</button>}</div>}</label>);
  const pickTpl = (t) => { const { _mine, ...rest } = t; setTf({ ...Object.fromEntries(cfg.fields.map((f) => [f[0], f[3]])), ...rest }); setSaveTpl(false); };
  const delMine = (i) => { const nm = mine.filter((_, j) => j !== i); setMine(nm); localStorage.setItem(MKEY, JSON.stringify(nm)); };
  const addTpl = async (e) => { e.preventDefault(); const b = { ...tf };
    if (saveTpl) { const keep = {}; cfg.fields.forEach(([k]) => { if (b[k] !== "" && b[k] !== undefined && k !== "date" && k !== "due_date") keep[k] = b[k]; });
      const nm = [keep, ...mine.filter((x) => (x.name || x.title) !== (keep.name || keep.title))].slice(0, 20); setMine(nm); localStorage.setItem(MKEY, JSON.stringify(nm)); }
    if (await create(b)) setTf(null); };
  const pin = async (t) => { try { await patch(t.id, { pinned: !t.pinned }); } catch (e) { alert(e.message); } };
  const openEdit = (it) => { setForm(Object.fromEntries(cfg.fields.map((f) => [f[0], it[f[0]] ?? ""]))); setModal("edit:" + it.id); };
  const submitForm = async (e) => { e.preventDefault();
    if (modal === "new") return create(form);
    const b = { ...form }; cfg.fields.forEach((f) => { if (b[f[0]] === "") { if (f[2] === "number") delete b[f[0]]; else b[f[0]] = f[2] === "date" ? null : ""; } });
    try { await patch(Number(modal.split(":")[1]), b); setModal(null); } catch (x) { alert(x.message); } };
  const sorter = (a) => (sort === "streak" ? [...a].sort((x, y) => y.streak - x.streak) : sort === "name" ? [...a].sort((x, y) => x.name.localeCompare(y.name)) : a);
  const delBtn = (id) => <button className="icon-btn" onClick={() => del(id)}><Icon name="trash" /></button>;
  const grp = []; [...shown].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id).forEach((x) => { const g = grp[grp.length - 1]; if (g && g.date === x.date) g.rows.push(x); else grp.push({ date: x.date, rows: [x] }); });
  const dayLabel = (d) => (d === ymdL(0) ? "Today" : d === ymdL(-1) ? "Yesterday" : new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }));
  const dayNet = (rows) => { const n = rows.reduce((s, x) => s + (x.type === "INCOME" ? 1 : -1) * Number(x.amount), 0); return (n < 0 ? "−" : "+") + C + Math.abs(n).toLocaleString("en-IN"); };
  const cats = kind === "expenses" ? Object.entries(mi.filter((i) => i.type === "EXPENSE").reduce((m, i) => ((m[i.category] = (m[i.category] || 0) + Number(i.amount)), m), {})).sort((a, b) => b[1] - a[1]) : [];
  return (<div>
    <div className="head"><div><h1><span className="h-ic"><Icon name={cfg.icon} /></span>{cfg.title}</h1><p className="muted">{cfg.sub}</p></div>
      {main && <div className="row"><button className="btn ghost" onClick={() => { setTf(null); setModal("tpl"); }}>Templates</button><button className="btn primary" onClick={openNew}><Icon name="plus" /> New {cfg.noun}</button></div>}</div>
    {kind === "expenses" && <div className="tabs">{SUBS.map(([k, l]) => <button key={k} className={sub === k ? "on" : ""} onClick={() => setSub(k)}>{l}</button>)}</div>}
    {kind === "expenses" && sub === "goals" && <Goals expenses={items} />}
    {kind === "expenses" && sub === "split" && <Splits />}
    {kind === "expenses" && sub === "emi" && <Emi />}
    {kind === "expenses" && sub === "budget" && <Budgets expenses={items} />}
    {kind === "expenses" && sub === "recurring" && <Recurring reload={load} />}
    {kind === "expenses" && sub === "accounts" && <Accounts />}
    {main && !loaded && <Skel />}
    {main && loaded && <>
    {kind === "expenses" && <div className="row" style={{ marginBottom: 12 }}><button className="btn" disabled={mon === "ALL"} onClick={() => shiftMon(-1)}>‹</button><b style={{ minWidth: 150, textAlign: "center" }}>{monLabel}</b>
      <button className="btn" disabled={mon === "ALL"} onClick={() => shiftMon(1)}>›</button><button className={"chip " + (mon === "ALL" ? "on" : "")} onClick={() => setMon(mon === "ALL" ? new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0") : "ALL")}>{mon === "ALL" ? "Back to month view" : "All time"}</button></div>}
    <div className="stats">{cfg.stats(mi).map(([l, v]) => <div className="card stat" key={l}><i className="si">{sIc(l)}</i><span className="muted small">{l.toUpperCase()}</span><b><Num v={v} /></b></div>)}</div>
    <div className="row wrap"><input className="search" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">{["ALL", ...fopts].map((o) => <button key={o} className={"chip " + (flt === o ? "on" : "")} onClick={() => setFlt(o)}>{o.charAt(0) + o.slice(1).toLowerCase().replace("_", " ")}</button>)}</div></div>
    {kind === "habits" && <><WeekChart items={items} /><div className="chips"><span className="tag ice-tag">{fz} streak freeze{fz === 1 ? "" : "s"} left</span><span className="muted small">Sort:</span>{[["new", "Newest"], ["streak", "Best streak"], ["name", "Name"]].map(([k, l]) => <button key={k} className={"chip " + (sort === k ? "on" : "")} onClick={() => setSort(k)}>{l}</button>)}</div></>}
    {kind === "habits" && <div className="grid">{sorter(shown).map((h) => <div className="card habit" key={h.id}>
      <div className="big">{h.icon}</div><div className="grow"><b className="link" onClick={() => setDetail(h)}>{h.name}</b><div className="muted small">{h.description}</div>
        <div className="tags">{h.frequency !== "DAILY" && <span className="tag">{h.frequency}</span>}<span className="tag">{CI[h.category] || ""} {h.category}</span><span className="tag fire"><Icon name="flame" size={12} /> {h.streak}</span><span className={"tag " + (h.week.filter(Boolean).length >= h.weekly_target ? "met" : "")}>{h.week.filter(Boolean).length}/{h.weekly_target} this week</span>{!h.week[5] && h.week[4] && !h.done_today && fz > 0 && !(h.frozen || []).includes(ydayStr) && <button className="chip ice" onClick={() => freezeIt(h.id, ydayStr)}>Save streak</button>}</div>
        <div className="dots" title="Last 7 days">{h.week.map((d, i) => <div key={i} className={"dc" + (d ? " on" : "")}><i /><span>{"SMTWTFS"[new Date(Date.now() - (6 - i) * 864e5).getDay()]}</span></div>)}</div></div>
      <button className={"check " + (h.done_today ? "done" : "")} onClick={(e) => { if (!h.done_today) confetti(e.clientX, e.clientY); check(h.id); }}>{h.done_today ? <Icon name="check" /> : null}</button><button className="icon-btn" title="Edit" onClick={() => openEdit(h)}><Icon name="edit" /></button>{delBtn(h.id)}</div>)}</div>}
    {kind === "expenses" && <>
      {mlInfo && <p className="model-note"><Icon name="zap" /> Smart categorization · {mlInfo.personalised ? `learned from ${mlInfo.samples} of your transactions` : "using built-in knowledge, improves as you add transactions"}{mlInfo.accuracy !== null && ` · ~${Math.round(mlInfo.accuracy * 100)}% accuracy`}</p>}<Trend items={items} reload={load} />{cats.length > 0 && <div className="card"><b>Spending by category</b>{cats.map(([c, v]) => <div className="bar" key={c}><span>{c.charAt(0) + c.slice(1).toLowerCase()}</span><div><i style={{ width: (v / cats[0][1]) * 100 + "%" }} /></div><em>{C}{Math.round(v).toLocaleString("en-IN")}</em></div>)}</div>}
      <div className="groups">{grp.map((g) => <section key={g.date}><div className="gh"><span>{dayLabel(g.date)}</span><span>{dayNet(g.rows)}</span></div><div className="list">{g.rows.map((x) => <div className="card rowi" key={x.id}><div className="grow"><b>{x.title}</b><div className="muted small">{x.payment_method}</div></div>
        <span className="tag">{CI[x.category] || ""} {x.category}</span><b className={x.type === "INCOME" ? "inc" : "exp"}>{x.type === "INCOME" ? "+" : "−"}{C}{Number(x.amount).toLocaleString("en-IN")}</b>{delBtn(x.id)}</div>)}</div></section>)}</div></>}
    {kind === "todos" && <><Focus tasks={items} onDone={load} />
      <div className="row wrap"><input className="quick" placeholder="Quick add a task and press Enter" value={quick} onChange={(e) => setQuick(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && quick.trim()) { create({ title: quick.trim(), priority: "MEDIUM", status: "TODO" }); setQuick(""); } }} />
        <div className="tabs" style={{ margin: 0 }}>{[["board", "Board"], ["list", "List"], ["today", "Today"], ["calendar", "Calendar"]].map(([k, l]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{l}</button>)}</div></div></>}
    {kind === "todos" && view === "calendar" && <CalendarView items={shown} openEdit={openEdit} create={create} />}
    {kind === "todos" && (view === "list" || view === "today") && <TaskList items={shown} view={view} patch={patch} del={del} openEdit={openEdit} />}
    {kind === "todos" && view === "board" && <div className="kanban">{COLS.map(([s, label], ci) => <div className="col" key={s} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("id"); if (id) { if (s === "DONE") confetti(e.clientX, e.clientY); patch(Number(id), { status: s }); } }}><h3>{label} ({shown.filter((t) => t.status === s).length})</h3>
      {shown.filter((t) => t.status === s).map((t) => { const sb = t.subtasks || [];
        return <div className={"card task " + (s !== "DONE" && t.due_date && t.due_date < now ? "late" : "") + (t.pinned ? " pinned" : "")} key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", t.id)}><b className="link" onClick={() => openEdit(t)}>{t.title}</b><div className="muted small">{t.description}</div>
          <div className="tags"><span className={"tag p-" + t.priority}>{t.priority}</span>{t.due_date && <span className="tag">{t.due_date}</span>}{t.tags && <span className="tag link" onClick={() => setQ(t.tags)}>#{t.tags}</span>}{t.focus_minutes > 0 && <span className="tag">{t.focus_minutes}m</span>}{t.repeat && t.repeat !== "NONE" && <span className="tag">{t.repeat}</span>}{sb.length > 0 && <span className="tag">{sb.filter((x) => x.done).length}/{sb.length}</span>}</div>
          <div className="subs">{sb.map((x, i) => <label key={i}><input type="checkbox" checked={x.done} onChange={() => patch(t.id, { subtasks: sb.map((y, j) => (j === i ? { ...y, done: !y.done } : y)) })} /><span className={x.done ? "strike" : ""}>{x.t}</span></label>)}
            <input className="mini" placeholder="+ Add subtask" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { patch(t.id, { subtasks: [...sb, { t: e.target.value.trim(), done: false }] }); e.target.value = ""; } }} /></div>
          <div className="row sp"><button className="icon-btn" disabled={ci === 0} onClick={() => patch(t.id, { status: COLS[ci - 1][0] })}><Icon name="chevron-left" /></button><button className={"icon-btn pin " + (t.pinned ? "on" : "")} title={t.pinned ? "Remove from today's focus" : "Focus today"} onClick={() => pin(t)}><Icon name="star" /></button>{delBtn(t.id)}
            <button className="icon-btn" disabled={ci === 2} onClick={() => patch(t.id, { status: COLS[ci + 1][0] })}><Icon name="chevron-right" /></button></div></div>; })}</div>)}</div>}
    {loaded && items.length === 0 && <div className="empty"><div className="e-ic"><Icon name={cfg.icon} /></div><h3>Nothing here yet</h3><p className="muted">Start from a ready-made template or create your own.</p><button className="btn primary" onClick={() => { setTf(null); setModal("tpl"); }}>Browse templates</button></div>}</>}
    {detail && <HabitDetail h={items.find((x) => x.id === detail.id) || detail} onClose={() => setDetail(null)} freezes={fz} onFreeze={(date) => freezeIt(detail.id, date)} onToggle={async (date) => { await api(`/habits/${detail.id}/check/`, { method: "POST", body: { date } }); load(); }} />}
    {modal && <div className="overlay" onClick={() => setModal(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="row sp"><h2>{modal === "tpl" ? (tf ? `Edit ${cfg.noun.toLowerCase()} details` : `${cfg.noun} Templates`) : `${modal === "new" ? "New" : "Edit"} ${cfg.noun}`}</h2><button className="icon-btn" onClick={() => setModal(null)}><Icon name="x" /></button></div>
      {modal === "tpl" ? (tf ? <form onSubmit={addTpl}>
        <p className="muted" style={{ marginBottom: 12 }}>Change anything before adding. The template is only a starting point.</p>
        {fieldsUI(tf, setTf)}
        <label className="chk"><input type="checkbox" checked={saveTpl} onChange={(e) => setSaveTpl(e.target.checked)} /> Save my changes as a new template</label>
        <div className="row" style={{ marginTop: 14 }}><button type="button" className="btn" onClick={() => setTf(null)}>Back</button><button className="btn primary grow">Add {cfg.noun.toLowerCase()}</button></div></form>
      : <><p className="muted">Pick a template, then edit the details before adding.</p>
        <div className="tpl-grid">{allTpls.map((t, i) => <div key={i} className="card tpl" onClick={() => pickTpl(t)}>
          {t._mine && <button type="button" className="icon-btn tpl-x" title="Delete my template" onClick={(e) => { e.stopPropagation(); delMine(i); }}><Icon name="x" /></button>}
          <b>{t.name || t.title}</b><div className="muted small">{t.description || (t.amount ? C + t.amount : "")}</div>
          <div className="tags">{t._mine && <span className="tag fire">mine</span>}<span className="tag">{t.frequency || t.type || t.priority}</span><span className="tag">{t.category || t.tags}</span></div></div>)}</div></>)
      : <form onSubmit={submitForm}>
        {fieldsUI(form, setForm)}
        <button className="btn primary wide">Save</button></form>}</div></div>}
  </div>);
}
