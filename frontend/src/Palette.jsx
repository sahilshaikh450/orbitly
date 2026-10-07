import { useEffect, useRef, useState } from "react"; import { api } from "./api";
const NAV = [["home", "🏠 Go to Dashboard"], ["habits", "💪 Go to Habit Forge"], ["expenses", "💰 Go to Wealth Map"], ["todos", "✅ Go to Task Engine"], ["profile", "👤 Go to Profile"], ["journal", "📓 Go to Journal"], ["analytics", "📊 Go to Analytics"], ["settings", "⚙️ Go to Settings"]];
const td = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export default function Palette({ initial, onClose, onDone, toggleTheme, logout }) {
  const [q, setQ] = useState(initial || ""), [i, setI] = useState(0), ref = useRef(), [data, setData] = useState(null);
  useEffect(() => { ref.current.focus(); Promise.all(["habits", "todos", "expenses", "journal", "goals"].map((k) => api(`/${k}/`).catch(() => []))).then(([habits, todos, expenses, journal, goals]) => setData({ habits, todos, expenses, journal, goals })); }, []);
  const m = q.match(/^(task|habit|spent|income)\s+(.+)/i), cmds = [];
  if (m) { const k = m[1].toLowerCase(), rest = m[2].trim();
    if (k === "task") cmds.push([`➕ Add task: ${rest}`, () => api("/todos/", { method: "POST", body: { title: rest } }).then(() => onDone("todos"))]);
    if (k === "habit") cmds.push([`➕ Add habit: ${rest}`, () => api("/habits/", { method: "POST", body: { name: rest } }).then(() => onDone("habits"))]);
    if (k === "spent" || k === "income") { const a = rest.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (a) cmds.push([`${k === "spent" ? "💸 Add expense" : "💵 Add income"}: ${a[1]} ${a[2]}`, () => api("/expenses/", { method: "POST", body: { title: a[2] || k, amount: a[1], type: k === "spent" ? "EXPENSE" : "INCOME", date: td() } }).then(() => onDone("expenses"))]); } }
  const term = q.trim().toLowerCase();
  if (!m && term.length >= 2 && data) { const hit = (arr, tab, ic, f) => arr.filter((x) => f(x).toLowerCase().includes(term)).slice(0, 4).forEach((x) => cmds.push([`${ic} ${f(x).slice(0, 60)}`, () => onDone(tab)]));
    hit(data.habits, "habits", "💪", (x) => x.name); hit(data.todos, "todos", "✅", (x) => x.title); hit(data.expenses, "expenses", "💰", (x) => x.title); hit(data.journal, "journal", "📓", (x) => x.text || ""); hit(data.goals, "expenses", "🎯", (x) => x.name); }
  NAV.filter(([, l]) => l.toLowerCase().includes(q.toLowerCase())).forEach(([t, l]) => cmds.push([l, () => onDone(t)]));
  if ("toggle theme dark light mode".includes(q.toLowerCase())) cmds.push(["🌗 Toggle theme", toggleTheme]);
  if ("log out logout".includes(q.toLowerCase())) cmds.push(["🚪 Log out", logout]);
  const run = async (c) => { await c[1](); onClose(); };
  const key = (e) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowDown") setI((i + 1) % cmds.length); else if (e.key === "ArrowUp") setI((i - 1 + cmds.length) % cmds.length); else if (e.key === "Enter" && cmds[i]) run(cmds[i]); };
  return (<div className="overlay top" onClick={onClose}><div className="modal pal" onClick={(e) => e.stopPropagation()}>
    <input ref={ref} placeholder="Type a command or search..." value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={key} />
    {cmds.map((c, n) => <div key={n} className={"item " + (n === i ? "on" : "")} onClick={() => run(c)}>{c[0]}</div>)}
    <div className="muted small" style={{ marginTop: 10 }}>Try: <b>task</b> Buy milk · <b>habit</b> Read 10 pages · <b>spent</b> 250 Coffee · <b>income</b> 5000 Freelance · type to search everything · <b>/</b> search · <b>n</b> new task</div></div></div>);
}
