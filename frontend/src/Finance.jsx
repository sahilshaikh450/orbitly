import { useEffect, useState } from "react"; import { api } from "./api"; import { cur } from "./config";
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
