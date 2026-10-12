import Icon, { Face } from "./Icon.jsx";
import { useEffect, useState } from "react"; import { api } from "./api"; import { cur } from "./config"; import { Num, Skel, sIc } from "./Extras";
const PAL = ["#3ecf8e", "#6e8bff", "#e5a336", "#b784d9", "#ef6b73", "#4cc3d9", "#9aa5b1", "#7dd3a8"], MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (n) => cur() + Math.round(n).toLocaleString("en-IN");
export default function Analytics() {
  const [d, setD] = useState(null), [range, setRange] = useState("30");
  useEffect(() => { Promise.all([api("/expenses/"), api("/habits/"), api("/profile/"), api("/todos/"), api("/expenses/insights/"), api("/budgets/")]).then(([e, h, p, t, ins, bg]) => setD({ e, h, p, t, ins, bg })); }, []);
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
  const focusTotal = d.t.reduce((n, t) => n + (t.focus_minutes || 0), 0), topFocus = [...d.t].filter((t) => t.focus_minutes > 0).sort((a, b) => b.focus_minutes - a.focus_minutes).slice(0, 5);
  const d7 = ymd(new Date(Date.now() - 6 * 864e5)), d14 = ymd(new Date(Date.now() - 13 * 864e5)), tom = ymd(new Date(Date.now() + 864e5));
  const cnt = (f, lo, hi) => d.p.items.filter((a) => a.date >= lo && a.date < hi && f(a)).length, sp = (lo, hi) => d.e.filter((x) => x.type === "EXPENSE" && x.date >= lo && x.date < hi).reduce((n, x) => n + Number(x.amount), 0);
  const isH = (a) => a.kind === "HABIT" && a.text.startsWith("Completed"), isT = (a) => a.kind === "TASK" && a.text.startsWith("Completed"), byDay = {};
  d.p.items.forEach((a) => { if (a.date >= d7) byDay[a.date] = (byDay[a.date] || 0) + 1; }); const bd = Object.entries(byDay).sort((p, q) => q[1] - p[1])[0];
  const rv = { a: cnt(() => true, d7, tom), pa: cnt(() => true, d14, d7), h: cnt(isH, d7, tom), ph: cnt(isH, d14, d7), t: cnt(isT, d7, tom), pt: cnt(isT, d14, d7), s: sp(d7, tom), ps: sp(d14, d7), best: bd ? DN[new Date(bd[0] + "T00:00:00").getDay()] : null };
  const wk = Array(8).fill(0); d.p.items.forEach((a) => { if (a.kind === "TASK" && a.text.startsWith("Completed")) { const n = Math.floor((Date.now() - new Date(a.date + "T00:00:00")) / (7 * 864e5)); if (n >= 0 && n < 8) wk[7 - n]++; } }); const kmax = Math.max(1, ...wk);
  return (<div><div className="head"><div><h1><span className="h-ic"><Icon name="chart" /></span>Analytics</h1><p className="muted">See where your money, time and energy go.</p></div></div>
    <Forecast fc={d.ins.forecast} anomalies={d.ins.anomalies} budget={d.bg.reduce((n, b) => n + Number(b.limit), 0)} />
    <div className="card review"><div className="row sp"><b>Your week in review</b><span className="muted small">last 7 days vs the 7 before</span></div>
      <div className="rv">{[["Activities", rv.a, rv.pa], ["Habit check-ins", rv.h, rv.ph], ["Tasks done", rv.t, rv.pt], ["Spent", rv.s, rv.ps, true]].map(([l, v, p, money]) => <div key={l}><span className="muted small">{l}</span><b><Num v={money ? fmt(v) : v} /></b>
        <em className={(money ? v <= p : v >= p) ? "up" : "down"}>{v === p ? "no change" : (v > p ? "▲ " : "▼ ") + (money ? fmt(Math.abs(v - p)) : Math.abs(v - p))}</em></div>)}</div>
      <p className="muted">{rv.a ? `You were most active on ${rv.best}. Keep the momentum going!` : "No activity yet this week. Start small today!"}</p></div>
    <div className="tabs">{[["30", "30 days"], ["90", "90 days"], ["365", "1 year"], ["all", "All time"]].map(([k, l]) => <button key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{l}</button>)}</div>
    <div className="stats">{[["Spent", fmt(spent)], ["Income", fmt(income)], ["Avg / day", fmt(spent / days)], ["Savings rate", income ? Math.round(((income - spent) * 100) / income) + "%" : "—"]].map(([l, v]) =>
      <div className="card stat" key={l}><i className="si">{sIc(l)}</i><span className="muted small">{l.toUpperCase()}</span><b><Num v={v} /></b></div>)}</div>
    {big && <p className="muted small" style={{ marginBottom: 12 }}>Biggest expense: <b>{big.title}</b> ({fmt(big.amount)} on {big.date})</p>}
    <div className="charts">
      <div className="card"><b>Spending by category</b>{cats.length === 0 ? <p className="muted">No expenses in this range.</p> : <div className="donut-wrap">
        <svg viewBox="0 0 100 100" width="170">{cats.map(([k, v], i) => { const len = (v / spent) * C, el = <circle key={k} cx="50" cy="50" r="40" fill="none" stroke={PAL[i % 8]} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" />; off += len; return el; })}
          <text x="50" y="54" textAnchor="middle" fontSize="11" fontWeight="800" fill="currentColor">{fmt(spent)}</text></svg>
        <div className="legend">{cats.slice(0, 8).map(([k, v], i) => <div key={k}><i style={{ background: PAL[i % 8] }} />{k} · {Math.round((v / spent) * 100)}%</div>)}</div></div>}</div>
      <div className="card"><b>Income vs expense · 12 months</b><svg viewBox="0 0 600 200" width="100%"><line x1="30" y1="170" x2="570" y2="170" stroke="var(--bd)" />
        <polygon points={`${X(0)},170 ${pts(inc)} ${X(11)},170`} fill="var(--ac)" opacity=".1" /><polyline className="line" points={pts(inc)} fill="none" stroke="var(--ac)" strokeWidth="3" /><polyline className="line" points={pts(ex)} fill="none" stroke="var(--danger)" strokeWidth="3" />
        {months.map(([, l], i) => <text key={l + i} x={X(i)} y="190" textAnchor="middle" fontSize="11" fill="var(--mu)">{l}</text>)}</svg>
        <div className="row small muted"><span className="inc">■</span> Income <span className="exp">■</span> Expense</div></div>
      <div className="card"><b>Activity by weekday</b><span className="muted small"> · most active: {DN[best]}</span><div className="wbars">{wd.map((c, i) => <div key={i}><i style={{ height: (c / wmax) * 70 + 4, opacity: i === best ? 1 : 0.55 }} /><span>{DN[i]}</span><em>{c}</em></div>)}</div></div>
      <div className="card"><b>Tasks completed · last 8 weeks</b><div className="wbars">{wk.map((c, i) => <div key={i}><i style={{ height: (c / kmax) * 70 + 4 }} /><span>{i === 7 ? "Now" : `-${7 - i}w`}</span><em>{c}</em></div>)}</div></div>
      <div className="card"><b className="ch"><Icon name="clock" />Focus time</b>
        <div className="row" style={{ alignItems: "baseline", margin: "8px 0 4px" }}><span style={{ fontSize: 28, fontWeight: 650 }}>{Math.floor(focusTotal / 60)}h {focusTotal % 60}m</span><span className="muted small">across all tasks</span></div>
        {topFocus.length === 0 && <p className="muted small">Run the focus timer on a task to see it here.</p>}
        {topFocus.map((t) => <div className="bar" key={t.id}><span>{t.title.length > 16 ? t.title.slice(0, 15) + "…" : t.title}</span><div><i style={{ width: (t.focus_minutes / topFocus[0].focus_minutes) * 100 + "%" }} /></div><em>{t.focus_minutes}m</em></div>)}</div>
      <div className="card"><b>Habit consistency · last 30 days</b>{d.h.length === 0 && <p className="muted">No habits yet.</p>}
        {[...d.h].sort((a, b) => b.rate30 - a.rate30).map((h) => <div className="bar" key={h.id}><span>{h.name.length > 16 ? h.name.slice(0, 15) + "…" : h.name}</span><div><i style={{ width: h.rate30 + "%" }} /></div><em>{h.rate30}%</em></div>)}</div></div></div>);
}

function Forecast({ fc, anomalies, budget }) {
  const dim = fc.days_in_month, ymax = Math.max(fc.high, budget || 0, 1) * 1.08, X = (d) => 40 + ((d - 1) / Math.max(dim - 1, 1)) * 540, Y = (v) => 180 - (v / ymax) * 160;
  const act = fc.series.actual.map((v, i) => `${X(i + 1)},${Y(v)}`).join(" "), proj = fc.series.projected.map((v, i) => `${X(fc.day + i)},${Y(v)}`).join(" ");
  const band = `${X(fc.day)},${Y(fc.spent)} ${X(dim)},${Y(fc.high)} ${X(dim)},${Y(fc.low)}`, diff = budget ? fc.projected - budget : 0, cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  const rows = [["Spent so far", fc.breakdown.so_far], ["Daily spending ahead", fc.breakdown.daily_spending], ["Bills still expected", fc.breakdown.upcoming_bills]];
  return (<><div className="card fc"><div className="row sp wrap"><b className="ch"><Icon name="trend-up" />Month-end forecast</b><span className="muted small">Day {fc.day} of {dim}</span></div>
    <div className="fc-grid"><div>
      <div className="muted small">Projected spend</div><div className="fc-big">{fmt(fc.projected)}</div><div className="muted small">Likely between {fmt(fc.low)} and {fmt(fc.high)}</div>
      <div className="tags" style={{ marginTop: 10 }}>{fc.vs_last_month_pct !== null && <span className={"tag " + (fc.vs_last_month_pct > 0 ? "p-URGENT" : "met")}>{Math.round(fc.vs_last_month_pct) === 0 ? "In line with last month" : `${fc.vs_last_month_pct > 0 ? "▲" : "▼"} ${Math.abs(Math.round(fc.vs_last_month_pct))}% vs last month`}</span>}
        {budget > 0 && <span className={"tag " + (diff > 0 ? "p-URGENT" : "met")}>{diff > 0 ? `${fmt(diff)} over budget` : `${fmt(-diff)} under budget`}</span>}</div>
      <div className="fc-rows">{rows.map(([l, v]) => <div key={l}><span className="muted">{l}</span><b>{fmt(v)}</b></div>)}</div></div>
      <svg viewBox="0 0 600 210" width="100%" className="fc-chart"><line x1="40" y1="180" x2="580" y2="180" stroke="var(--bd)" />
        {budget > 0 && <><line x1="40" x2="580" y1={Y(budget)} y2={Y(budget)} stroke="var(--danger)" strokeDasharray="4 4" opacity=".7" /><text x="46" y={Y(budget) - 5} textAnchor="start" fontSize="10" fill="var(--danger)">Budget {fmt(budget)}</text></>}
        <polygon points={band} fill="var(--ac)" opacity=".14" /><polygon points={`${X(1)},180 ${act} ${X(fc.day)},180`} fill="var(--ac)" opacity=".12" />
        <polyline className="line" points={act} fill="none" stroke="var(--ac)" strokeWidth="2.5" /><polyline points={proj} fill="none" stroke="var(--ac)" strokeWidth="2" strokeDasharray="5 5" />
        <line x1={X(fc.day)} x2={X(fc.day)} y1="20" y2="180" stroke="var(--mu)" strokeDasharray="2 3" opacity=".6" /><circle cx={X(fc.day)} cy={Y(fc.spent)} r="4" fill="var(--ac)" />
        {[1, 8, 15, 22, dim].map((d) => <text key={d} x={X(d)} y="198" textAnchor="middle" fontSize="10" fill="var(--mu)">{d}</text>)}</svg></div></div>
    <div className="charts"><div className="card"><b className="ch"><Icon name="zap" />Unusual spending</b>
      {anomalies.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>Nothing unusual in the last 90 days. Your spending is consistent.</p>}
      {anomalies.map((a) => <div className="act" key={a.id}><div className="grow"><b>{a.title}</b><div className="muted small">{cap(a.category)} · {a.date}</div></div><div style={{ textAlign: "right" }}><b>{fmt(a.amount)}</b><div className="muted small">{a.ratio}× usual ({fmt(a.usual)})</div></div></div>)}</div>
      <div className="card"><b className="ch"><Icon name="list" />How these are calculated</b>
        <p className="muted small" style={{ marginTop: 10, lineHeight: 1.6 }}><b>Forecast:</b> spent so far + your typical daily spending (outliers removed) × days left + bills you usually pay later in the month, based on your last 3 months. The shaded band is an 80% range.</p>
        <p className="muted small" style={{ marginTop: 8, lineHeight: 1.6 }}><b>Unusual:</b> a transaction at least 2× your median for that category and a robust z-score above 3.5 (median and MAD, so one big purchase does not hide the next).</p></div></div></>);
}
