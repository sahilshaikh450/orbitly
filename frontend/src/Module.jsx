import { useEffect, useState } from "react"; import { api } from "./api"; import { CFG, cur } from "./config"; import { Goals, Splits, Emi, Budgets, Trend, Recurring, Accounts } from "./Finance"; import { WeekChart, HabitDetail, Focus, TaskList, CalendarView, Num, Skel, confetti, undoable } from "./Extras";
const COLS = [["TODO", "To Do"], ["IN_PROGRESS", "In Progress"], ["DONE", "Done"]];
const SUBS = [["tx", "Transactions"], ["accounts", "Accounts"], ["goals", "Savings Goals"], ["split", "Split Tracker"], ["recurring", "Recurring"], ["budget", "Budgets"], ["emi", "EMI Calculator"]];
export default function Module({ kind }) {
  const cfg = CFG[kind], C = cur(), now = new Date().toISOString().slice(0, 10);
  const [items, setItems] = useState([]), [tpls, setTpls] = useState([]), [modal, setModal] = useState(null), [form, setForm] = useState({}),
    [sel, setSel] = useState(null), [flt, setFlt] = useState("ALL"), [q, setQ] = useState(""), [sub, setSub] = useState("tx"), [detail, setDetail] = useState(null), [view, setView] = useState("board"), [mon, setMon] = useState(new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0")), [sort, setSort] = useState("new"), [quick, setQuick] = useState(""), [loaded, setLoaded] = useState(false);
  const load = () => api(`/${kind}/`).then((r) => { setItems(r); setLoaded(true); });
  useEffect(() => { if (kind === "expenses") api("/recurring/run/", { method: "POST" }).finally(load); else load(); api(`/templates/${kind}/`).then(setTpls); }, []);
  const create = async (d) => { const b = { ...d }; Object.keys(b).forEach((k) => b[k] === "" && delete b[k]);
    if (kind === "expenses" && !b.date) b.date = now; try { await api(`/${kind}/`, { method: "POST", body: b }); setModal(null); setSel(null); load(); } catch (x) { alert(x.message); } };
  const del = async (id) => { const it = items.find((x) => x.id === id); await api(`/${kind}/${id}/`, { method: "DELETE" }); load();
    if (it) undoable(`${cfg.noun} deleted`, async () => { const b = {}; [...cfg.fields.map((f) => f[0]), "subtasks"].forEach((k) => { if (it[k] !== undefined && it[k] !== null && it[k] !== "") b[k] = it[k]; }); await api(`/${kind}/`, { method: "POST", body: b }); load(); }); };
  const patch = async (id, body) => { await api(`/${kind}/${id}/`, { method: "PATCH", body }); load(); };
  const check = async (id) => { await api(`/habits/${id}/check/`, { method: "POST" }); load(); };
  const openNew = () => { setForm(Object.fromEntries(cfg.fields.map((f) => [f[0], f[3]]))); setModal("new"); };
  const [fk, fopts] = cfg.filter; const main = kind !== "expenses" || sub === "tx";
  const mi = kind === "expenses" && mon !== "ALL" ? items.filter((x) => x.date.startsWith(mon)) : items;
  const shiftMon = (n) => { const [y, m] = mon.split("-").map(Number), d = new Date(y, m - 1 + n, 1); setMon(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")); };
  const monLabel = mon === "ALL" ? "All time" : new Date(mon + "-01T00:00:00").toLocaleString("en", { month: "long", year: "numeric" });
  const shown = mi.filter((i) => (flt === "ALL" || i[fk] === flt) && (i.name || i.title).toLowerCase().includes(q.toLowerCase()));
  const openEdit = (it) => { setForm(Object.fromEntries(cfg.fields.map((f) => [f[0], it[f[0]] ?? ""]))); setModal("edit:" + it.id); };
  const submitForm = async (e) => { e.preventDefault();
    if (modal === "new") return create(form);
    const b = { ...form }; cfg.fields.forEach((f) => { if (b[f[0]] === "") { if (f[2] === "number") delete b[f[0]]; else b[f[0]] = f[2] === "date" ? null : ""; } });
    try { await patch(Number(modal.split(":")[1]), b); setModal(null); } catch (x) { alert(x.message); } };
  const sorter = (a) => (sort === "streak" ? [...a].sort((x, y) => y.streak - x.streak) : sort === "name" ? [...a].sort((x, y) => x.name.localeCompare(y.name)) : a);
  const delBtn = (id) => <button className="icon-btn" onClick={() => del(id)}>🗑</button>;
  const cats = kind === "expenses" ? Object.entries(mi.filter((i) => i.type === "EXPENSE").reduce((m, i) => ((m[i.category] = (m[i.category] || 0) + Number(i.amount)), m), {})).sort((a, b) => b[1] - a[1]) : [];
  return (<div>
    <div className="head"><div><h1>{cfg.icon} {cfg.title}</h1><p className="muted">{cfg.sub}</p></div>
      {main && <div className="row"><button className="btn ghost" onClick={() => setModal("tpl")}>📋 Templates</button><button className="btn primary" onClick={openNew}>＋ New {cfg.noun}</button></div>}</div>
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
    <div className="stats">{cfg.stats(mi).map(([l, v]) => <div className="card stat" key={l}><span className="muted small">{l.toUpperCase()}</span><b><Num v={v} /></b></div>)}</div>
    <div className="row wrap"><input className="search" placeholder="🔍 Search..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">{["ALL", ...fopts].map((o) => <button key={o} className={"chip " + (flt === o ? "on" : "")} onClick={() => setFlt(o)}>{o}</button>)}</div></div>
    {kind === "habits" && <><WeekChart items={items} /><div className="chips"><span className="muted small">Sort:</span>{[["new", "Newest"], ["streak", "Best streak"], ["name", "Name"]].map(([k, l]) => <button key={k} className={"chip " + (sort === k ? "on" : "")} onClick={() => setSort(k)}>{l}</button>)}</div></>}
    {kind === "habits" && <div className="grid">{sorter(shown).map((h) => <div className="card habit" key={h.id}>
      <div className="big">{h.icon}</div><div className="grow"><b className="link" onClick={() => setDetail(h)}>{h.name}</b><div className="muted small">{h.description}</div>
        <div className="tags"><span className="tag">{h.frequency}</span><span className="tag">{h.category}</span><span className="tag fire">🔥 {h.streak}</span><span className={"tag " + (h.week.filter(Boolean).length >= h.weekly_target ? "met" : "")}>{h.week.filter(Boolean).length}/{h.weekly_target} this week</span></div>
        <div className="dots" title="Last 7 days">{h.week.map((d, i) => <i key={i} className={d ? "on" : ""} />)}</div></div>
      <button className={"check " + (h.done_today ? "done" : "")} onClick={(e) => { if (!h.done_today) confetti(e.clientX, e.clientY); check(h.id); }}>{h.done_today ? "✓" : "○"}</button><button className="icon-btn" title="Edit" onClick={() => openEdit(h)}>✏️</button>{delBtn(h.id)}</div>)}</div>}
    {kind === "expenses" && <>
      <Trend items={items} reload={load} />{cats.length > 0 && <div className="card"><b>Spending by category</b>{cats.map(([c, v]) => <div className="bar" key={c}><span>{c}</span><div><i style={{ width: (v / cats[0][1]) * 100 + "%" }} /></div><em>{C}{v}</em></div>)}</div>}
      <div className="list">{shown.map((x) => <div className="card rowi" key={x.id}><div className="grow"><b>{x.title}</b><div className="muted small">{x.date} · {x.payment_method}</div></div>
        <span className="tag">{x.category}</span><b className={x.type === "INCOME" ? "inc" : "exp"}>{x.type === "INCOME" ? "+" : "−"}{C}{x.amount}</b>{delBtn(x.id)}</div>)}</div></>}
    {kind === "todos" && <><Focus tasks={items} onDone={load} />
      <div className="row wrap"><input className="quick" placeholder="⚡ Quick add a task and press Enter" value={quick} onChange={(e) => setQuick(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && quick.trim()) { create({ title: quick.trim(), priority: "MEDIUM", status: "TODO" }); setQuick(""); } }} />
        <div className="tabs" style={{ margin: 0 }}>{[["board", "Board"], ["list", "List"], ["today", "Today"], ["calendar", "Calendar"]].map(([k, l]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{l}</button>)}</div></div></>}
    {kind === "todos" && view === "calendar" && <CalendarView items={shown} openEdit={openEdit} create={create} />}
    {kind === "todos" && (view === "list" || view === "today") && <TaskList items={shown} view={view} patch={patch} del={del} openEdit={openEdit} />}
    {kind === "todos" && view === "board" && <div className="kanban">{COLS.map(([s, label], ci) => <div className="col" key={s} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("id"); if (id) { if (s === "DONE") confetti(e.clientX, e.clientY); patch(Number(id), { status: s }); } }}><h3>{label} ({shown.filter((t) => t.status === s).length})</h3>
      {shown.filter((t) => t.status === s).map((t) => { const sb = t.subtasks || [];
        return <div className={"card task " + (s !== "DONE" && t.due_date && t.due_date < now ? "late" : "")} key={t.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", t.id)}><b className="link" onClick={() => openEdit(t)}>{t.title}</b><div className="muted small">{t.description}</div>
          <div className="tags"><span className={"tag p-" + t.priority}>{t.priority}</span>{t.due_date && <span className="tag">📅 {t.due_date}</span>}{t.tags && <span className="tag">#{t.tags}</span>}{t.focus_minutes > 0 && <span className="tag">⏱ {t.focus_minutes}m</span>}{t.repeat && t.repeat !== "NONE" && <span className="tag">🔁 {t.repeat}</span>}{sb.length > 0 && <span className="tag">{sb.filter((x) => x.done).length}/{sb.length}</span>}</div>
          <div className="subs">{sb.map((x, i) => <label key={i}><input type="checkbox" checked={x.done} onChange={() => patch(t.id, { subtasks: sb.map((y, j) => (j === i ? { ...y, done: !y.done } : y)) })} /><span className={x.done ? "strike" : ""}>{x.t}</span></label>)}
            <input className="mini" placeholder="+ Add subtask" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { patch(t.id, { subtasks: [...sb, { t: e.target.value.trim(), done: false }] }); e.target.value = ""; } }} /></div>
          <div className="row sp"><button className="icon-btn" disabled={ci === 0} onClick={() => patch(t.id, { status: COLS[ci - 1][0] })}>◀</button>{delBtn(t.id)}
            <button className="icon-btn" disabled={ci === 2} onClick={() => patch(t.id, { status: COLS[ci + 1][0] })}>▶</button></div></div>; })}</div>)}</div>}
    {loaded && items.length === 0 && <div className="empty"><div className="e-ic">{cfg.icon}</div><h3>Nothing here yet</h3><p className="muted">Start from a ready-made template or create your own.</p><button className="btn primary" onClick={() => setModal("tpl")}>📋 Browse templates</button></div>}</>}
    {detail && <HabitDetail h={items.find((x) => x.id === detail.id) || detail} onClose={() => setDetail(null)} onToggle={async (date) => { await api(`/habits/${detail.id}/check/`, { method: "POST", body: { date } }); load(); }} />}
    {modal && <div className="overlay" onClick={() => setModal(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="row sp"><h2>{modal === "tpl" ? `📋 ${cfg.noun} Templates` : `${modal === "new" ? "New" : "Edit"} ${cfg.noun}`}</h2><button className="icon-btn" onClick={() => setModal(null)}>✕</button></div>
      {modal === "tpl" ? <><p className="muted">Choose a template to get started quickly</p>
        <div className="tpl-grid">{tpls.map((t, i) => <div key={i} className={"card tpl " + (sel === i ? "sel" : "")} onClick={() => setSel(i)}>
          <b>{t.icon || (kind === "expenses" ? (t.type === "INCOME" ? "💵" : "💸") : "📌")} {t.name || t.title}</b><div className="muted small">{t.description || (t.amount ? C + t.amount : "")}</div>
          <div className="tags"><span className="tag">{t.frequency || t.type || t.priority}</span><span className="tag">{t.category || t.tags}</span></div></div>)}</div>
        <button className="btn primary wide" disabled={sel === null} onClick={() => create(tpls[sel])}>{sel === null ? "Select a template first" : "Add selected template"}</button></>
      : <form onSubmit={submitForm}>
        {cfg.fields.map(([k, l, type, , o]) => <label key={k}>{l}{type === "select" ? <select value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}>{o.map((x) => <option key={x}>{x}</option>)}</select>
          : <input type={type} value={form[k]} required={["title", "name", "amount"].includes(k)} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}</label>)}
        <button className="btn primary wide">Save</button></form>}</div></div>}
  </div>);
}
