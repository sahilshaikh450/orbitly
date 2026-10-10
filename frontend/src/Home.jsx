import Icon, { Face } from "./Icon.jsx";
import { useEffect, useState } from "react"; import { api } from "./api"; import { cur } from "./config"; import { Num, Ring, Skel, confetti, sIc } from "./Extras";
const Q = ["Small steps every day.", "Discipline beats motivation.", "Done is better than perfect.", "You are what you repeatedly do.", "Progress, not perfection.", "Start where you are.", "Consistency compounds."];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function Home({ name, go }) {
  const [d, setD] = useState(null), C = cur();
  const load = async () => { const [h, t, e, g, p, rc, bg] = await Promise.all(["habits", "todos", "expenses", "goals", "profile", "recurring", "budgets"].map((k) => api(`/${k}/`))); setD({ h, t, e, g, p, rc, bg }); };
  useEffect(() => { load(); }, []);
  if (!d) return <Skel />;
  const now = new Date(), today = ymd(now), month = today.slice(0, 7), hr = now.getHours();
  const doneH = d.h.filter((x) => x.done_today).length, due = d.t.filter((t) => t.status !== "DONE" && t.due_date && t.due_date <= today);
  const sum = (ty) => d.e.filter((x) => x.type === ty && x.date.startsWith(month)).reduce((n, x) => n + Number(x.amount), 0);
  const inc = sum("INCOME"), exp = sum("EXPENSE");
  const in7 = ymd(new Date(now.getTime() + 7 * 864e5)), cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  const bills = d.rc.filter((r) => r.active && r.type === "EXPENSE" && r.next_date <= in7).sort((a, b) => a.next_date.localeCompare(b.next_date)).slice(0, 4);
  const budgetRows = d.bg.map((b) => ({ category: b.category, pct: Math.round((d.e.filter((x) => x.type === "EXPENSE" && x.category === b.category && x.date.startsWith(month)).reduce((n, x) => n + Number(x.amount), 0) * 100) / Number(b.limit)) })).sort((a, b) => b.pct - a.pct).slice(0, 3);
  const focus = d.t.filter((t) => t.pinned && t.status !== "DONE").slice(0, 3);
  const lm = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7), wk = ymd(new Date(now.getTime() - 6 * 864e5));
  const expLast = d.e.filter((x) => x.type === "EXPENSE" && x.date.startsWith(lm)).reduce((n, x) => n + Number(x.amount), 0), catM = {};
  d.e.filter((x) => x.type === "EXPENSE" && x.date.startsWith(month)).forEach((x) => { catM[x.category] = (catM[x.category] || 0) + Number(x.amount); });
  const top = Object.entries(catM).sort((a, b) => b[1] - a[1])[0], best = [...d.h].sort((a, b) => b.rate30 - a.rate30)[0];
  const doneT = d.p.items.filter((i) => i.date === today && i.text.startsWith("Completed task")).length;
  const parts = [d.h.length ? doneH / d.h.length : null, doneT + due.length ? doneT / (doneT + due.length) : null].filter((x) => x !== null);
  const score = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0, atRisk = d.p.current_streak > 0 && !d.p.by_day[today];
  const wkItems = d.p.items.filter((i) => i.date >= wk && i.text.startsWith("Completed")), ins = [];
  if (expLast > 0) ins.push(`${exp > expLast ? "" : ""} Spending is ${Math.abs(Math.round(((exp - expLast) * 100) / expLast))}% ${exp > expLast ? "higher" : "lower"} than last month`);
  if (top) ins.push(`Top spending category this month: ${top[0]} (${C}${Math.round(top[1])})`);
  if (inc > 0) ins.push(`Savings rate this month: ${Math.round(((inc - exp) * 100) / inc)}%`);
  ins.push(`${wkItems.filter((i) => i.kind === "TASK").length} tasks and ${wkItems.filter((i) => i.kind === "HABIT").length} habit check-ins in the last 7 days`);
  if (best && best.rate30 > 0) ins.push(`Most consistent habit: ${best.name} (${best.rate30}% over 30 days)`);
  return (<div className="bento"><div className="head"><div><h1>{hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening"}, {name} </h1>
    <p className="muted">“{Q[now.getDate() % Q.length]}”</p></div></div>
    {!d.p.verified && <div className="card tip">Please verify your email address. <button className="btn" onClick={() => api("/auth/resend/", { method: "POST" }).then(() => alert("Verification email sent. Check your inbox."))}>Resend email</button></div>}
    <div className="card scorecard"><Ring pct={score} /><div><div className="muted small">TODAY'S SCORE</div>
      <h2>{score >= 90 ? "Crushing it! " : score >= 60 ? "Great progress " : score > 0 ? "Good start, keep going" : "Let's get started"}</h2>
      <p className="muted">{doneH}/{d.h.length} habits · {doneT} tasks done · {due.length} still due</p></div></div>
    {atRisk && <div className="card tip warn">Your {d.p.current_streak}-day streak ends tonight! Complete one habit or task to keep it alive.</div>}
    <div className="stats">
      <div className="card stat"><i className="si">{sIc("HABITS TODAY")}</i><span className="muted small">HABITS TODAY</span><b><Num v={doneH + "/" + d.h.length} /></b><div className="prog"><i style={{ width: (d.h.length ? (doneH / d.h.length) * 100 : 0) + "%" }} /></div></div>
      <div className="card stat"><i className="si">{sIc("TASKS DUE")}</i><span className="muted small">TASKS DUE</span><b><Num v={due.length} /></b></div>
      <div className="card stat"><i className="si">{sIc("MONTH BALANCE")}</i><span className="muted small">MONTH BALANCE</span><b className={inc - exp >= 0 ? "inc" : "exp"}><Num v={C + Math.round(inc - exp)} /></b></div>
      <div className="card stat"><i className="si">{sIc("CURRENT STREAK")}</i><span className="muted small">CURRENT STREAK</span><b><Num v={d.p.current_streak + " days"} /></b></div></div>
    <div className="card insights"><b className="ch"><Icon name="zap" />Insights</b><div className="ins-grid">{ins.map((t, i) => <div className="ins" key={i}><span className="ins-dot" />{t}</div>)}</div></div>
    <div className="dash">
      <div className="card"><div className="row sp"><b className="ch"><Icon name="star" />Today's focus</b><a onClick={() => go("todos")}>Open</a></div>
        {focus.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>Pin up to 3 tasks with the star in Task Engine to focus on them today.</p>}
        {focus.map((t) => <div className="act" key={t.id}><input type="checkbox" onChange={(e) => { const b = e.target.getBoundingClientRect(); confetti(b.x + 8, b.y + 8); api(`/todos/${t.id}/`, { method: "PATCH", body: { status: "DONE" } }).then(load); }} />
          <span className="grow">{t.title}</span>{t.due_date && <span className={"tag " + (t.due_date < today ? "p-URGENT" : "")}>{t.due_date}</span>}</div>)}</div>
      <div className="card"><div className="row sp"><b className="ch"><Icon name="repeat" />Today's habits</b><a onClick={() => go("habits")}>Open</a></div>
        {d.h.length === 0 && <p className="muted">No habits yet.</p>}
        {d.h.slice(0, 7).map((h) => <div className="act" key={h.id}><span className={"grow " + (h.done_today ? "strike" : "")}>{h.name}</span><span className="tag fire"><Icon name="flame" size={12} /> {h.streak}</span>
          <button className={"check sm " + (h.done_today ? "done" : "")} onClick={(e) => { if (!h.done_today) confetti(e.clientX, e.clientY); api(`/habits/${h.id}/check/`, { method: "POST" }).then(load); }}>{h.done_today ? <Icon name="check" /> : null}</button></div>)}</div>
      <div className="card"><div className="row sp"><b className="ch"><Icon name="clock" />Due &amp; overdue tasks</b><a onClick={() => go("todos")}>Open</a></div>
        {due.length === 0 && <p className="muted">Nothing due. You're all caught up </p>}
        {due.slice(0, 7).map((t) => <div className="act" key={t.id}><input type="checkbox" onChange={(e) => { const b = e.target.getBoundingClientRect(); confetti(b.x + 8, b.y + 8); api(`/todos/${t.id}/`, { method: "PATCH", body: { status: "DONE" } }).then(load); }} />
          <span className="grow">{t.title}</span><span className={"tag " + (t.due_date < today ? "p-URGENT" : "")}>{t.due_date}</span></div>)}</div>
      <div className="card"><div className="row sp"><b className="ch"><Icon name="receipt" />Upcoming bills</b><a onClick={() => go("expenses")}>Open</a></div>
        {bills.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>No bills due in the next 7 days.</p>}
        {bills.map((r) => <div className="act" key={r.id}><span className="grow">{r.title}</span><span className="muted small">{r.next_date}</span><b>{C}{Number(r.amount).toLocaleString("en-IN")}</b></div>)}</div>
      <div className="card"><div className="row sp"><b className="ch"><Icon name="percent" />Budgets</b><a onClick={() => go("expenses")}>Open</a></div>
        {budgetRows.length === 0 && <p className="muted small" style={{ marginTop: 10 }}>No budgets yet. Set monthly limits in Wealth Map.</p>}
        {budgetRows.map((b) => <div key={b.category} style={{ marginTop: 10 }}><div className="row sp small"><span>{cap(b.category)}</span><b className={b.pct >= 100 ? "exp" : ""}>{b.pct}%</b></div>
          <div className="prog"><i style={{ width: Math.min(100, b.pct) + "%", background: b.pct >= 100 ? "var(--danger)" : b.pct >= 80 ? "#f5a524" : undefined }} /></div></div>)}</div>
      <div className="card"><div className="row sp"><b className="ch"><Icon name="target" />Savings goals</b><a onClick={() => go("expenses")}>Open</a></div>
        {d.g.length === 0 && <p className="muted">No goals yet.</p>}
        {d.g.slice(0, 4).map((g) => { const p = Math.min(100, Math.round((g.saved / g.target) * 100)); return <div key={g.id} style={{ marginTop: 10 }}><div className="row sp small"><span>{g.name}</span><b>{p}%</b></div><div className="prog"><i style={{ width: p + "%" }} /></div></div>; })}</div>
      <div className="card"><b className="ch"><Icon name="wallet" />This month</b><div className="act"><span className="grow">Income</span><b className="inc">+{C}{Math.round(inc).toLocaleString("en-IN")}</b></div>
        <div className="act"><span className="grow">Expenses</span><b className="exp">−{C}{Math.round(exp).toLocaleString("en-IN")}</b></div>
        <div className="act"><span className="grow">Activities logged (all time)</span><b>{d.p.total}</b></div></div></div></div>);
}
