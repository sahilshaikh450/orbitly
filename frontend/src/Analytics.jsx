import { useEffect, useState } from "react"; import { api } from "./api"; import { cur } from "./config"; import { Num, Skel, sIc } from "./Extras";
const PAL = ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6", "#ef4444", "#ec4899", "#14b8a6", "#a3a3a3"], MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (n) => cur() + Math.round(n).toLocaleString("en-IN");
export default function Analytics() {
  const [d, setD] = useState(null), [range, setRange] = useState("30");
  useEffect(() => { Promise.all([api("/expenses/"), api("/habits/"), api("/profile/")]).then(([e, h, p]) => setD({ e, h, p })); }, []);
  if (!d) return <Skel />;
  const cut = range === "all" ? "0000" : ymd(new Date(Date.now() - (+range - 1) * 864e5)), inR = d.e.filter((x) => x.date >= cut);
  const exp = inR.filter((x) => x.type === "EXPENSE"), spent = exp.reduce((n, x) => n + Number(x.amount), 0), income = inR.filter((x) => x.type === "INCOME").reduce((n, x) => n + Number(x.amount), 0);
  const cats = Object.entries(exp.reduce((m, x) => ((m[x.category] = (m[x.category] || 0) + Number(x.amount)), m), {})).sort((a, b) => b[1] - a[1]);
  const days = range === "all" ? Math.max(1, Math.ceil((Date.now() - new Date(d.e.reduce((m, x) => (x.date < m ? x.date : m), ymd(new Date())) + "T00:00:00")) / 864e5)) : +range, big = [...exp].sort((a, b) => b.amount - a.amount)[0];
  const C = 2 * Math.PI * 40; let off = 0;
  const months = [...Array(12)].map((_, i) => { const t = new Date(); t.setDate(1); t.setMonth(t.getMonth() - (11 - i)); return [ymd(t).slice(0, 7), MS[t.getMonth()]]; });
  const sum = (ty, m) => d.e.filter((x) => x.type === ty && x.date.startsWith(m)).reduce((n, x) => n + Number(x.amount), 0), inc = months.map(([m]) => sum("INCOME", m)), ex = months.map(([m]) => sum("EXPENSE", m));
  const mx = Math.max(1, ...inc, ...ex), X = (i) => 30 + i * (540 / 11), Y = (v) => 170 - (v / mx) * 150, pts = (a) => a.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const wd = Array(7).fill(0); d.p.items.forEach((a) => { wd[new Date(a.date + "T00:00:00").getDay()]++; }); const wmax = Math.max(1, ...wd), best = wd.indexOf(Math.max(...wd));
  const d7 = ymd(new Date(Date.now() - 6 * 864e5)), d14 = ymd(new Date(Date.now() - 13 * 864e5)), tom = ymd(new Date(Date.now() + 864e5));
  const cnt = (f, lo, hi) => d.p.items.filter((a) => a.date >= lo && a.date < hi && f(a)).length, sp = (lo, hi) => d.e.filter((x) => x.type === "EXPENSE" && x.date >= lo && x.date < hi).reduce((n, x) => n + Number(x.amount), 0);
  const isH = (a) => a.kind === "HABIT" && a.text.startsWith("Completed"), isT = (a) => a.kind === "TASK" && a.text.startsWith("Completed"), byDay = {};
  d.p.items.forEach((a) => { if (a.date >= d7) byDay[a.date] = (byDay[a.date] || 0) + 1; }); const bd = Object.entries(byDay).sort((p, q) => q[1] - p[1])[0];
  const rv = { a: cnt(() => true, d7, tom), pa: cnt(() => true, d14, d7), h: cnt(isH, d7, tom), ph: cnt(isH, d14, d7), t: cnt(isT, d7, tom), pt: cnt(isT, d14, d7), s: sp(d7, tom), ps: sp(d14, d7), best: bd ? DN[new Date(bd[0] + "T00:00:00").getDay()] : null };
  const wk = Array(8).fill(0); d.p.items.forEach((a) => { if (a.kind === "TASK" && a.text.startsWith("Completed")) { const n = Math.floor((Date.now() - new Date(a.date + "T00:00:00")) / (7 * 864e5)); if (n >= 0 && n < 8) wk[7 - n]++; } }); const kmax = Math.max(1, ...wk);
  return (<div><div className="head"><div><h1><span className="h-ic">📊</span>Analytics</h1><p className="muted">See where your money, time and energy go.</p></div></div>
    <div className="card review"><div className="row sp"><b>✨ Your week in review</b><span className="muted small">last 7 days vs the 7 before</span></div>
      <div className="rv">{[["Activities", rv.a, rv.pa], ["Habit check-ins", rv.h, rv.ph], ["Tasks done", rv.t, rv.pt], ["Spent", rv.s, rv.ps, true]].map(([l, v, p, money]) => <div key={l}><span className="muted small">{l}</span><b><Num v={money ? fmt(v) : v} /></b>
        <em className={(money ? v <= p : v >= p) ? "up" : "down"}>{v === p ? "no change" : (v > p ? "▲ " : "▼ ") + (money ? fmt(Math.abs(v - p)) : Math.abs(v - p))}</em></div>)}</div>
      <p className="muted">{rv.a ? `You were most active on ${rv.best}. Keep the momentum going!` : "No activity yet this week. Start small today!"}</p></div>
    <div className="tabs">{[["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All time"]].map(([k, l]) => <button key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{l}</button>)}</div>
    <div className="stats">{[["Spent", fmt(spent)], ["Income", fmt(income)], ["Avg / day", fmt(spent / days)], ["Savings rate", income ? Math.round(((income - spent) * 100) / income) + "%" : "—"]].map(([l, v]) =>
      <div className="card stat" key={l}><i className="si">{sIc(l)}</i><span className="muted small">{l.toUpperCase()}</span><b><Num v={v} /></b></div>)}</div>
    {big && <p className="muted small" style={{ marginBottom: 12 }}>Biggest expense: <b>{big.title}</b> ({fmt(big.amount)} on {big.date})</p>}
    <div className="charts">
      <div className="card"><b>🥧 Spending by category</b>{cats.length === 0 ? <p className="muted">No expenses in this range.</p> : <div className="donut-wrap">
        <svg viewBox="0 0 100 100" width="170">{cats.map(([k, v], i) => { const len = (v / spent) * C, el = <circle key={k} cx="50" cy="50" r="40" fill="none" stroke={PAL[i % 8]} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" />; off += len; return el; })}
          <text x="50" y="54" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor">{fmt(spent)}</text></svg>
        <div className="legend">{cats.slice(0, 8).map(([k, v], i) => <div key={k}><i style={{ background: PAL[i % 8] }} />{k} · {Math.round((v / spent) * 100)}%</div>)}</div></div>}</div>
      <div className="card"><b>📈 Income vs expense · 12 months</b><svg viewBox="0 0 600 200" width="100%"><line x1="30" y1="170" x2="570" y2="170" stroke="var(--bd)" />
        <polyline className="line" points={pts(inc)} fill="none" stroke="#10b981" strokeWidth="3" /><polyline className="line" points={pts(ex)} fill="none" stroke="#ef4444" strokeWidth="3" />
        {months.map(([, l], i) => <text key={l + i} x={X(i)} y="190" textAnchor="middle" fontSize="11" fill="var(--mu)">{l}</text>)}</svg>
        <div className="row small muted"><span className="inc">■</span> Income <span className="exp">■</span> Expense</div></div>
      <div className="card"><b>🗓️ Activity by weekday</b><span className="muted small"> · most active: {DN[best]}</span><div className="wbars">{wd.map((c, i) => <div key={i}><i style={{ height: (c / wmax) * 70 + 4, opacity: i === best ? 1 : 0.55 }} /><span>{DN[i]}</span><em>{c}</em></div>)}</div></div>
      <div className="card"><b>✅ Tasks completed · last 8 weeks</b><div className="wbars">{wk.map((c, i) => <div key={i}><i style={{ height: (c / kmax) * 70 + 4 }} /><span>{i === 7 ? "Now" : `-${7 - i}w`}</span><em>{c}</em></div>)}</div></div>
      <div className="card" style={{ gridColumn: "1/-1" }}><b>💪 Habit consistency · last 30 days</b>{d.h.length === 0 && <p className="muted">No habits yet.</p>}
        {[...d.h].sort((a, b) => b.rate30 - a.rate30).map((h) => <div className="bar" key={h.id}><span>{h.icon} {h.name.slice(0, 14)}</span><div><i style={{ width: h.rate30 + "%" }} /></div><em>{h.rate30}%</em></div>)}</div></div></div>);
}
