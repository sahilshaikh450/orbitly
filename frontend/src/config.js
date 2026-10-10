export const cur = () => localStorage.getItem("cur") || "₹";
const today = () => new Date().toISOString().slice(0, 10);
const opts = (s) => s.split(" ");
export const CFG = {
  habits: { title: "Habit Forge", icon: "repeat", sub: "Build atomic habits. Transform your life.", noun: "Habit",
    fields: [["icon","Icon","text","🎯"],["name","Name","text",""],["description","Description","text",""],
      ["frequency","Frequency","select","DAILY",opts("DAILY WEEKLY MONTHLY")],
      ["weekly_target","Weekly target (days)","number","7"],["category","Category","select","HEALTH",opts("HEALTH FITNESS MINDFULNESS LEARNING PRODUCTIVITY SOCIAL FINANCE CREATIVITY OTHER")]],
    filter: ["category", opts("HEALTH FITNESS MINDFULNESS LEARNING PRODUCTIVITY SOCIAL OTHER")],
    stats: (a) => [["Total", a.length], ["Done Today", a.filter(x=>x.done_today).length],
      ["Best Streak", Math.max(0,...a.map(x=>x.streak)) + " days"],
      ["Completion", (a.length ? Math.round(a.filter(x=>x.done_today).length*100/a.length) : 0) + "%"]] },
  expenses: { title: "Wealth Map", icon: "wallet", sub: "Track every rupee. Grow your wealth.", noun: "Transaction",
    fields: [["title","Title","text",""],["amount","Amount","number",""],["type","Type","select","EXPENSE",opts("EXPENSE INCOME")],
      ["category","Category","select","FOOD",opts("FOOD HOME BILLS TRAVEL SHOPPING ENTERTAINMENT HEALTH INVEST SALARY OTHER")],
      ["payment_method","Payment","select","UPI",opts("UPI CARD CASH BANK")],["date","Date","date",today()]],
    filter: ["type", opts("INCOME EXPENSE")],
    stats: (a) => { const s=(t)=>a.filter(x=>x.type===t).reduce((n,x)=>n+Number(x.amount),0);
      return [["Income",cur()+s("INCOME")],["Expense",cur()+s("EXPENSE")],["Balance",cur()+(s("INCOME")-s("EXPENSE"))],["Entries",a.length]]; } },
  todos: { title: "Task Engine", icon: "check-square", sub: "Plan it. Move it. Finish it.", noun: "Task",
    fields: [["title","Title","text",""],["description","Description","text",""],
      ["priority","Priority","select","MEDIUM",opts("LOW MEDIUM HIGH URGENT")],["status","Status","select","TODO",opts("TODO IN_PROGRESS DONE")],
      ["due_date","Due date","date",""],["repeat","Repeat","select","NONE",opts("NONE DAILY WEEKLY MONTHLY")],["tags","Tags","text",""]],
    filter: ["priority", opts("LOW MEDIUM HIGH URGENT")],
    stats: (a) => { const d=a.filter(x=>x.status==="DONE").length;
      return [["Total",a.length],["Done",d],["Overdue",a.filter(x=>x.status!=="DONE"&&x.due_date&&x.due_date<today()).length],
        ["Progress",(a.length?Math.round(d*100/a.length):0)+"%"]]; } },
};
