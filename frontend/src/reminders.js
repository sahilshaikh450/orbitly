import { api } from "./api";
const pad = (n) => String(n).padStart(2, "0"), ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const getR = () => ({ on: false, habit: "20:00", task: "09:00", ...JSON.parse(localStorage.getItem("reminders") || "{}") });
export const setR = (r) => localStorage.setItem("reminders", JSON.stringify(r));
export async function notify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) reg.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png" }); else new Notification(title, { body, icon: "/icon-192.png" });
}
async function tick() {
  const r = getR(); if (!r.on || !localStorage.getItem("token")) return;
  const now = new Date(), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`, day = ymd(now), fired = JSON.parse(localStorage.getItem("rfired") || "{}");
  for (const k of ["habit", "task"]) {
    if (hm < r[k] || fired[k] === day) continue; fired[k] = day; localStorage.setItem("rfired", JSON.stringify(fired));
    try {
      if (k === "habit") { const n = (await api("/habits/")).filter((h) => !h.done_today).length; if (n) notify("Habit reminder ", `${n} habit${n > 1 ? "s" : ""} still pending today. Keep your streak alive!`); }
      else { const n = (await api("/todos/")).filter((t) => t.status !== "DONE" && t.due_date && t.due_date <= day).length; if (n) notify("Tasks due ", `You have ${n} task${n > 1 ? "s" : ""} due or overdue.`); }
    } catch (e) {}
  }
}
export function startReminders() { tick(); const id = setInterval(tick, 60000); return () => clearInterval(id); }
