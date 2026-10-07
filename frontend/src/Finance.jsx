import { useEffect, useState } from "react"; import { api } from "./api"; import { cur } from "./config"; import { Num } from "./Extras";
const fmt = (n) => cur() + Math.round(n).toLocaleString("en-IN");
const PRESETS = [["🛟", "Emergency Fund", "EMERGENCY"], ["🏖️", "Vacation", "SAVING"], ["💻", "New Laptop", "SAVING"], ["🏠", "Down Payment", "SAVING"], ["🎓", "Education", "SAVING"], ["💍", "Wedding", "SAVING"]];
function GoalCard({ g, onAdd, onDel }) {
  const [amt, setAmt] = useState(""); const t = Number(g.target), s = Number(g.saved), pct = Math.min(100, Math.round((s / t) * 100));
  const months = g.deadline ? Math.max(1, Math.ceil((new Date(g.deadline) - new Date()) / 2592000000)) : 0;
  return (<div className="card goal"><div className="row sp"><b>{g.icon} {g.name}</b><span className="row"><span className="tag">{g.kind}</span><button className="icon-btn" onClick={onDel}>🗑</button></span></div>
    <div className="prog"><i style={{ width: pct + "%" }} /></div>
    <div className="row sp"><span>{fmt(s)} <span className="muted">of {fmt(t)}</span></span><b>{pct}%</b></div>
    {g.deadline && <div className="muted small">Due {g.deadline}{pct < 100 && ` · save ${fmt((t - s) / months)}/month`}</div>}
    <div className="row"><input type="number" placeholder="Amount (negative to withdraw)" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <button className="btn primary" onClick={() => { if (amt) { onAdd(amt); setAmt(""); } }}>Add</button></div></div>);
}
export function Goals({ expenses }) {
  const [g, setG] = useState([]); const [f, setF] = useState(null);
  const load = () => api("/goals/").then(setG); useEffect(() => { load(); }, []);
  const exp = expenses.filter((x) => x.type === "EXPENSE"); const months = new Set(exp.map((x) => x.date.slice(0, 7))).size || 1;
  const avg = exp.reduce((n, x) => n + Number(x.amount), 0) / months;
  const create = async (d) => { await api("/goals/", { method: "POST", body: { ...d, deadline: d.deadline || null, saved: d.saved || 0 } }); setF(null); load(); };
  const tS = g.reduce((n, x) => n + Number(x.saved), 0), tT = g.reduce((n, x) => n + Number(x.target), 0);
  return (<div>
    <div className="stats"><div className="card stat"><span className="muted small">TOTAL SAVED</span><b>{fmt(tS)}</b></div><div className="card stat"><span className="muted small">TOTAL TARGET</span><b>{fmt(tT)}</b></div>
      <div className="card stat"><span className="muted small">GOALS</span><b>{g.length}</b></div></div>
    {avg > 0 && <div className="card tip">🛟 Suggested emergency fund: <b>{fmt(avg * 6)}</b> <span className="muted">(6 × your average monthly spend of {fmt(avg)})</span>
      <button className="btn" onClick={() => create({ name: "Emergency Fund", icon: "🛟", kind: "EMERGENCY", target: Math.round(avg * 6) })}>Create goal</button></div>}
    <div className="chips">{PRESETS.map(([i, n, k]) => <button key={n} className="chip" onClick={() => setF({ icon: i, name: n, kind: k, target: "", saved: "", deadline: "" })}>{i} {n}</button>)}
      <button className="chip on" onClick={() => setF({ icon: "🎯", name: "", kind: "SAVING", target: "", saved: "", deadline: "" })}>＋ Custom goal</button></div>
    {f && <form className="card row wrap" onSubmit={(e) => { e.preventDefault(); create(f); }}>
      <input style={{ width: 60 }} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} /><input placeholder="Goal name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <input type="number" placeholder="Target" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} required /><input type="number" placeholder="Already saved" value={f.saved} onChange={(e) => setF({ ...f, saved: e.target.value })} />
      <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /><button className="btn primary">Save goal</button></form>}
    <div className="grid">{g.map((x) => <GoalCard key={x.id} g={x} onAdd={(a) => api(`/goals/${x.id}/add/`, { method: "POST", body: { amount: a } }).then(load)} onDel={() => api(`/goals/${x.id}/`, { method: "DELETE" }).then(load)} />)}</div>
    {g.length === 0 && <p className="muted center">No goals yet. Pick a preset above to start saving.</p>}</div>);
}
export function Splits() {
  const [s, setS] = useState([]); const [f, setF] = useState({ title: "", total: "", paid_by: "You", people: "" });
  const load = () => api("/splits/").then(setS); useEffect(() => { load(); }, []);
  const create = async (e) => { e.preventDefault(); const names = [...new Set(["You", f.paid_by.trim() || "You", ...f.people.split(",").map((x) => x.trim()).filter(Boolean)])];
    const paid = f.paid_by.trim() || "You"; await api("/splits/", { method: "POST", body: { title: f.title, total: f.total, paid_by: paid, members: names.map((n) => ({ name: n, settled: n === paid })), date: new Date().toISOString().slice(0, 10) } });
    setF({ title: "", total: "", paid_by: "You", people: "" }); load(); };
  const toggle = (x, i) => api(`/splits/${x.id}/`, { method: "PATCH", body: { members: x.members.map((m, j) => (j === i ? { ...m, settled: !m.settled } : m)) } }).then(load);
  const net = {}; s.forEach((x) => { const sh = Number(x.total) / x.members.length;
    if (x.paid_by === "You") x.members.forEach((m) => { if (m.name !== "You" && !m.settled) net[m.name] = (net[m.name] || 0) + sh; });
    else { const me = x.members.find((m) => m.name === "You"); if (me && !me.settled) net[x.paid_by] = (net[x.paid_by] || 0) - sh; } });
  const owed = Object.values(net).filter((v) => v > 0).reduce((a, b) => a + b, 0), owe = -Object.values(net).filter((v) => v < 0).reduce((a, b) => a + b, 0);
  return (<div>
    <div className="stats"><div className="card stat"><span className="muted small">YOU ARE OWED</span><b className="inc">{fmt(owed)}</b></div><div className="card stat"><span className="muted small">YOU OWE</span><b className="exp">{fmt(owe)}</b></div></div>
    {Object.keys(net).length > 0 && <div className="chips">{Object.entries(net).map(([n, v]) => <span className="chip on" key={n}>{n}: {v > 0 ? "owes you " : "you owe "}{fmt(Math.abs(v))}</span>)}</div>}
    <form className="card row wrap" onSubmit={create}><input placeholder="What was it for? (Dinner, Trip...)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      <input type="number" placeholder="Total amount" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} required />
      <input placeholder="Paid by" value={f.paid_by} onChange={(e) => setF({ ...f, paid_by: e.target.value })} />
      <input placeholder="Friends (comma separated)" value={f.people} onChange={(e) => setF({ ...f, people: e.target.value })} required /><button className="btn primary">Split equally</button></form>
    <div className="grid">{s.map((x) => <div className="card" key={x.id}><div className="row sp"><b>🤝 {x.title}</b><button className="icon-btn" onClick={() => api(`/splits/${x.id}/`, { method: "DELETE" }).then(load)}>🗑</button></div>
      <div className="muted small">{x.date} · {fmt(x.total)} paid by {x.paid_by} · {fmt(Number(x.total) / x.members.length)} each</div>
      {x.members.map((m, i) => <div className="act" key={i}><span className="grow">{m.name}</span>{m.name === x.paid_by ? <span className="tag">PAID</span> :
        <button className={"chip " + (m.settled ? "on" : "")} onClick={() => toggle(x, i)}>{m.settled ? "Settled ✓" : "Pending"}</button>}</div>)}</div>)}</div>
    {s.length === 0 && <p className="muted center">No splits yet. Add a shared expense above.</p>}</div>);
}
export function Emi() {
  const [p, setP] = useState(500000), [r, setR] = useState(8.5), [t, setT] = useState(5), [unit, setUnit] = useState("Years");
  const n = Math.max(1, unit === "Years" ? t * 12 : t), i = r / 1200;
  const emi = i ? (p * i * (1 + i) ** n) / ((1 + i) ** n - 1) : p / n, total = emi * n, interest = total - p, pf = p / total;
  const rows = []; let bal = p, yp = 0, yi = 0;
  for (let m = 1; m <= n; m++) { const it = bal * i, pr = emi - it; bal -= pr; yp += pr; yi += it;
    if (m % 12 === 0 || m === n) { rows.push([Math.ceil(m / 12), yp, yi, Math.max(0, bal)]); yp = 0; yi = 0; } }
  const C = 2 * Math.PI * 40;
  return (<div className="emi"><div className="card"><h3>Loan details</h3>
    {[["Loan amount", p, setP, 10000, 10000000, 10000], ["Interest rate (% p.a.)", r, setR, 1, 30, 0.1], [`Tenure (${unit.toLowerCase()})`, t, setT, 1, unit === "Years" ? 30 : 360, 1]].map(([l, v, set, a, b, st]) =>
      <label key={l}>{l}<div className="row"><input type="range" min={a} max={b} step={st} value={v} onChange={(e) => set(Number(e.target.value))} /><input style={{ width: 120 }} type="number" value={v} onChange={(e) => set(Number(e.target.value))} /></div></label>)}
    <div className="chips">{["Years", "Months"].map((u) => <button key={u} className={"chip " + (unit === u ? "on" : "")} onClick={() => setUnit(u)}>{u}</button>)}</div></div>
    <div className="card res"><svg viewBox="0 0 100 100" width="170"><circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="14" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="14" strokeDasharray={`${C * pf} ${C}`} transform="rotate(-90 50 50)" /></svg>
      <div><div className="muted small">MONTHLY EMI</div><h1>{fmt(emi)}</h1>
        <div>🟢 Principal <b>{fmt(p)}</b></div><div>🟠 Total interest <b>{fmt(interest)}</b></div><div>Total payment <b>{fmt(total)}</b></div></div></div>
    <div className="card" style={{ gridColumn: "1/-1", overflowX: "auto" }}><h3>Yearly breakdown</h3><table><thead><tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Balance</th></tr></thead>
      <tbody>{rows.map((x) => <tr key={x[0]}><td>{x[0]}</td><td>{fmt(x[1])}</td><td>{fmt(x[2])}</td><td>{fmt(x[3])}</td></tr>)}</tbody></table></div></div>);
}

const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], CATS = "FOOD HOME BILLS TRAVEL SHOPPING ENTERTAINMENT HEALTH INVEST OTHER".split(" ");
const mk = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const DC = "FOOD HOME BILLS TRAVEL SHOPPING ENTERTAINMENT HEALTH INVEST SALARY OTHER".split(" ");
const parseCSV = (t) => { const rows = []; let r = [], c = "", q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { r.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; r.push(c); rows.push(r); r = []; c = ""; } else c += ch; }
  if (c || r.length) { r.push(c); rows.push(r); } return rows.filter((x) => x.some((y) => y.trim())); };
const normCSV = (rows) => { const h = rows[0].map((x) => x.trim().toLowerCase().replace(/ /g, "_")), ix = (...n) => h.findIndex((x) => n.includes(x)), p2 = (n) => String(n).padStart(2, "0");
  const ti = ix("title", "description", "name", "narration", "details"), ai = ix("amount", "value"), di = ix("date", "txn_date", "transaction_date"), tyi = ix("type"), ci = ix("category"), pi = ix("payment_method", "payment", "method");
  if (ti < 0 || ai < 0 || di < 0) throw new Error("The CSV needs title, amount and date columns");
  return rows.slice(1).map((r, n) => { const amt = parseFloat(String(r[ai] || "").replace(/[^0-9.\-]/g, "")); if (!isFinite(amt) || amt === 0) throw new Error(`Row ${n + 2}: invalid amount`);
    let dt = String(r[di] || "").trim(), m = dt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) dt = `${m[1]}-${p2(m[2])}-${p2(m[3])}`; else { m = dt.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/); if (!m) throw new Error(`Row ${n + 2}: unrecognised date "${dt}"`); dt = `${m[3]}-${p2(m[2])}-${p2(m[1])}`; }
    const ty = (tyi >= 0 && r[tyi] || "").trim().toUpperCase(), cat = (ci >= 0 && r[ci] || "").trim().toUpperCase(), pm = (pi >= 0 && r[pi] || "").trim().toUpperCase();
    return { title: String(r[ti] || "").trim().slice(0, 120) || "Imported", amount: Math.abs(amt).toFixed(2), type: ty === "INCOME" ? "INCOME" : "EXPENSE", category: DC.includes(cat) ? cat : "OTHER", payment_method: ["UPI", "CARD", "CASH", "BANK"].includes(pm) ? pm : "UPI", date: dt }; }); };
export function Trend({ items, reload }) {
  const imp = async (e) => { const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { if (f.size > 1e6) throw new Error("File is too large (max 1 MB)"); const rows = normCSV(parseCSV(await f.text())); if (!rows.length) throw new Error("No rows found");
      if (rows.length > 500) throw new Error("Import up to 500 rows at a time"); if (!confirm(`Import ${rows.length} transactions?`)) return;
      await api("/expenses/bulk/", { method: "POST", body: rows }); reload(); } catch (x) { alert(x.message); } };
  const data = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); const m = mk(d);
    const s = (t) => items.filter((x) => x.type === t && x.date.startsWith(m)).reduce((n, x) => n + Number(x.amount), 0); return [MS[d.getMonth()], s("INCOME"), s("EXPENSE")]; });
  const max = Math.max(1, ...data.flatMap((x) => [x[1], x[2]]));
  const csv = () => { const rows = [["title", "amount", "type", "category", "payment_method", "date"], ...items.map((x) => [/^[=+\-@]/.test(x.title) ? "'" + x.title : x.title, x.amount, x.type, x.category, x.payment_method, x.date])];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv" })); a.download = "transactions.csv"; a.click(); };
  return (<div className="card"><div className="row sp"><b>Last 6 months</b><div className="row small muted"><span className="inc">■</span> Income <span className="exp">■</span> Expense <button className="btn" onClick={csv}>⬇ CSV</button><label className="btn" style={{ cursor: "pointer" }}>⬆ Import<input type="file" accept=".csv,text/csv" hidden onChange={imp} /></label></div></div>
    <div className="tr">{data.map(([m, i, e]) => <div key={m}><div className="pair"><i className="gi" style={{ height: (i / max) * 80 + 2 }} title={fmt(i)} /><i className="ri" style={{ height: (e / max) * 80 + 2 }} title={fmt(e)} /></div>{m}</div>)}</div></div>);
}
export function Budgets({ expenses }) {
  const [b, setB] = useState([]), [f, setF] = useState({ category: "FOOD", limit: "" }), m = mk(new Date());
  const load = () => api("/budgets/").then(setB); useEffect(() => { load(); }, []);
  const spent = (c) => expenses.filter((x) => x.type === "EXPENSE" && x.category === c && x.date.startsWith(m)).reduce((n, x) => n + Number(x.amount), 0);
  const save = async (e) => { e.preventDefault(); const ex = b.find((x) => x.category === f.category);
    await api(ex ? `/budgets/${ex.id}/` : "/budgets/", { method: ex ? "PATCH" : "POST", body: f }); setF({ ...f, limit: "" }); load(); };
  const tL = b.reduce((n, x) => n + Number(x.limit), 0), tS = b.reduce((n, x) => n + spent(x.category), 0);
  return (<div><div className="stats"><div className="card stat"><span className="muted small">MONTHLY BUDGET</span><b>{fmt(tL)}</b></div><div className="card stat"><span className="muted small">SPENT</span><b>{fmt(tS)}</b></div>
    <div className="card stat"><span className="muted small">REMAINING</span><b className={tL - tS >= 0 ? "inc" : "exp"}>{fmt(tL - tS)}</b></div></div>
    <form className="card row wrap" onSubmit={save}><select style={{ width: 180 }} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
      <input type="number" placeholder="Monthly limit" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} required /><button className="btn primary">Set budget</button></form>
    <div className="grid">{b.map((x) => { const s = spent(x.category), l = Number(x.limit), p = Math.round((s / l) * 100), col = p >= 100 ? "#ef4444" : p >= 75 ? "#f59e0b" : "#10b981";
      return <div className="card" key={x.id}><div className="row sp"><b>{x.category}</b><button className="icon-btn" onClick={() => api(`/budgets/${x.id}/`, { method: "DELETE" }).then(load)}>🗑</button></div>
        <div className="prog"><i style={{ width: Math.min(100, p) + "%", background: col }} /></div>
        <div className="row sp small"><span>{fmt(s)} of {fmt(l)}</span><b style={{ color: col }}>{p >= 100 ? `Over by ${fmt(s - l)}` : `${fmt(l - s)} left`}</b></div></div>; })}</div>
    {b.length === 0 && <p className="muted center">No budgets yet. Pick a category and set a monthly limit.</p>}</div>);
}

const tdy = () => { const d = new Date(); return `${mk(d)}-${String(d.getDate()).padStart(2, "0")}`; };
const RP = [["Rent", 12000, "EXPENSE", "HOME", "MONTHLY"], ["Netflix", 499, "EXPENSE", "ENTERTAINMENT", "MONTHLY"], ["Salary", 50000, "INCOME", "SALARY", "MONTHLY"], ["SIP", 5000, "EXPENSE", "INVEST", "MONTHLY"], ["Internet", 799, "EXPENSE", "BILLS", "MONTHLY"], ["Insurance", 12000, "EXPENSE", "HEALTH", "YEARLY"]];
export function Recurring({ reload }) {
  const [r, setR] = useState([]), [f, setF] = useState(null), [msg, setMsg] = useState("");
  const load = () => api("/recurring/").then(setR); useEffect(() => { load(); }, []);
  const mo = (x) => Number(x.amount) * (x.frequency === "WEEKLY" ? 52 / 12 : x.frequency === "YEARLY" ? 1 / 12 : 1);
  const sum = (t) => r.filter((x) => x.active && x.type === t).reduce((n, x) => n + mo(x), 0);
  const save = async (e) => { e.preventDefault(); await api("/recurring/", { method: "POST", body: f }); setF(null); load(); };
  const run = async () => { const x = await api("/recurring/run/", { method: "POST" }); setMsg(`${x.created} transaction(s) added`); reload(); load(); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<div><div className="stats"><div className="card stat"><span className="muted small">MONTHLY INCOME</span><b className="inc">{fmt(sum("INCOME"))}</b></div>
    <div className="card stat"><span className="muted small">MONTHLY BILLS</span><b className="exp">{fmt(sum("EXPENSE"))}</b></div><div className="card stat"><span className="muted small">NET</span><b>{fmt(sum("INCOME") - sum("EXPENSE"))}</b></div></div>
    <p className="muted small">Recurring items are added to your transactions automatically when they fall due.</p>
    <div className="chips">{RP.map(([t, a, ty, c, fr]) => <button key={t} className="chip" onClick={() => setF({ title: t, amount: a, type: ty, category: c, payment_method: "UPI", frequency: fr, next_date: tdy() })}>{t}</button>)}
      <button className="chip on" onClick={() => setF({ title: "", amount: "", type: "EXPENSE", category: "BILLS", payment_method: "UPI", frequency: "MONTHLY", next_date: tdy() })}>＋ Custom</button>
      <button className="chip" onClick={run}>↻ Run due now</button>{msg && <span className="muted small">{msg}</span>}</div>
    {f && <form className="card row wrap" onSubmit={save}><input placeholder="Title" value={f.title} onChange={set("title")} required /><input type="number" placeholder="Amount" value={f.amount} onChange={set("amount")} required />
      <select value={f.type} onChange={set("type")}><option>EXPENSE</option><option>INCOME</option></select><select value={f.category} onChange={set("category")}>{[...CATS, "SALARY"].map((c) => <option key={c}>{c}</option>)}</select>
      <select value={f.frequency} onChange={set("frequency")}>{["WEEKLY", "MONTHLY", "YEARLY"].map((c) => <option key={c}>{c}</option>)}</select><input type="date" value={f.next_date} onChange={set("next_date")} /><button className="btn primary">Save</button></form>}
    <div className="list">{r.map((x) => <div className="card rowi" key={x.id} style={{ opacity: x.active ? 1 : 0.5 }}><div className="grow"><b>🔁 {x.title}</b><div className="muted small">Next: {x.next_date} · {x.category}</div></div>
      <span className="tag">{x.frequency}</span><b className={x.type === "INCOME" ? "inc" : "exp"}>{x.type === "INCOME" ? "+" : "−"}{fmt(x.amount)}</b>
      <button className="chip" onClick={() => api(`/recurring/${x.id}/`, { method: "PATCH", body: { active: !x.active } }).then(load)}>{x.active ? "Pause" : "Resume"}</button>
      <button className="icon-btn" onClick={() => api(`/recurring/${x.id}/`, { method: "DELETE" }).then(load)}>🗑</button></div>)}</div>
    {r.length === 0 && <p className="muted center">No recurring items yet. Pick a preset above.</p>}</div>);
}

const AK = { CASH: "Cash", BANK: "Bank", WALLET: "Wallet", INVESTMENT: "Investments", CREDIT: "Credit card", LOAN: "Loan" }, LIAB = ["CREDIT", "LOAN"];
const AP = [["🏦", "Savings Account", "BANK"], ["💵", "Cash in hand", "CASH"], ["📱", "UPI wallet", "WALLET"], ["📈", "Mutual funds", "INVESTMENT"], ["💳", "Credit card", "CREDIT"], ["🏠", "Home loan", "LOAN"]];
export function Accounts() {
  const [a, setA] = useState([]), [f, setF] = useState(null), [ed, setEd] = useState({});
  const load = () => api("/accounts/").then(setA); useEffect(() => { load(); }, []);
  const sg = (x) => (LIAB.includes(x.kind) ? -1 : 1), assets = a.filter((x) => sg(x) > 0).reduce((n, x) => n + Number(x.balance), 0), liab = a.filter((x) => sg(x) < 0).reduce((n, x) => n + Number(x.balance), 0);
  const ymd = (d) => `${mk(d)}-${String(d.getDate()).padStart(2, "0")}`, at = (x, ds) => { let b = 0; (x.history || []).forEach(([d, v]) => { if (d <= ds) b = v; }); return b; };
  const pts = [...Array(6)].map((_, i) => { const d = i === 5 ? new Date() : new Date(new Date().getFullYear(), new Date().getMonth() - (4 - i), 0), ds = ymd(d); return a.reduce((n, x) => n + sg(x) * at(x, ds), 0); });
  const lo = Math.min(...pts), hi = Math.max(...pts), X = (i) => 10 + i * 56, Y = (v) => 70 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * 55;
  const byKind = Object.entries(a.filter((x) => sg(x) > 0).reduce((m, x) => ((m[x.kind] = (m[x.kind] || 0) + Number(x.balance)), m), {})).sort((p, q) => q[1] - p[1]);
  const save = async (e) => { e.preventDefault(); try { await api("/accounts/", { method: "POST", body: f }); setF(null); load(); } catch (x) { alert(x.message); } };
  return (<div><div className="stats"><div className="card stat"><span className="muted small">NET WORTH</span><b className={assets - liab >= 0 ? "inc" : "exp"}><Num v={fmt(assets - liab)} /></b></div>
    <div className="card stat"><span className="muted small">ASSETS</span><b><Num v={fmt(assets)} /></b></div><div className="card stat"><span className="muted small">LIABILITIES</span><b className="exp"><Num v={fmt(liab)} /></b></div></div>
    {a.length > 0 && <div className="charts"><div className="card"><b>Net worth · last 6 months</b><svg viewBox="0 0 290 90" width="100%"><polyline className="line" fill="none" stroke="var(--ac)" strokeWidth="3" strokeLinecap="round" points={pts.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} />
        {pts.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r="3.5" fill="var(--ac2)" />)}</svg><div className="muted small">Builds up as you update balances over time.</div></div>
      <div className="card"><b>Where your assets are</b>{byKind.map(([k, v]) => <div className="bar" key={k}><span>{AK[k]}</span><div><i style={{ width: (v / byKind[0][1]) * 100 + "%" }} /></div><em>{fmt(v)}</em></div>)}</div></div>}
    <div className="chips" style={{ marginTop: 14 }}>{AP.map(([i, n, k]) => <button key={n} className="chip" onClick={() => setF({ icon: i, name: n, kind: k, balance: "" })}>{i} {n}</button>)}<button className="chip on" onClick={() => setF({ icon: "🏦", name: "", kind: "BANK", balance: "" })}>＋ Custom</button></div>
    {f && <form className="card row wrap" onSubmit={save}><input style={{ width: 60 }} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} /><input placeholder="Account name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
      <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(AK).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <input type="number" step="0.01" min="0" placeholder={LIAB.includes(f.kind) ? "Amount owed" : "Balance"} value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} required /><button className="btn primary">Add account</button></form>}
    <div className="grid">{a.map((x) => <div className="card" key={x.id}><div className="row sp"><b>{x.icon} {x.name}</b><span className="row"><span className="tag">{AK[x.kind]}</span><button className="icon-btn" onClick={() => api(`/accounts/${x.id}/`, { method: "DELETE" }).then(load)}>🗑</button></span></div>
      <h2 className={sg(x) < 0 ? "exp" : ""} style={{ margin: "10px 0" }}>{sg(x) < 0 ? "−" : ""}{fmt(x.balance)}</h2>
      <div className="row"><input type="number" step="0.01" min="0" placeholder="Update balance" value={ed[x.id] ?? ""} onChange={(e) => setEd({ ...ed, [x.id]: e.target.value })} />
        <button className="btn" onClick={() => { if (ed[x.id] !== undefined && ed[x.id] !== "") api(`/accounts/${x.id}/`, { method: "PATCH", body: { balance: ed[x.id] } }).then(() => { setEd({ ...ed, [x.id]: "" }); load(); }).catch((e) => alert(e.message)); }}>Update</button></div></div>)}</div>
    {a.length === 0 && <div className="empty"><div className="e-ic">🏦</div><h3>Track your net worth</h3><p className="muted">Add your bank, cash, investments and loans to see the full picture.</p></div>}</div>);
}
