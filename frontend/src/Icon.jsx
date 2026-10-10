const c = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const P = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  flame: "M12 3c.5 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2 .8-3.2 2-4.2.2 1.4.9 2.2 1.8 2.4C11.3 8.6 11.4 5.6 12 3z",
  wallet: "M3 7.5A2.5 2.5 0 0 1 5.5 5H19v3M3 7.5V18a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5zM16 14h2",
  "check-square": "M4 5h16v14H4zM8.5 12l2.5 2.5 4.5-5",
  book: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6",
  chart: "M5 20V11M12 20V4M19 20v-6",
  user: c(12, 8, 4) + "M4 21a8 8 0 0 1 16 0",
  sliders: "M4 7h8M16 7h4M4 12h3M11 12h9M4 17h10M18 17h2" + c(14, 7, 2) + c(9, 12, 2) + c(16, 17, 2),
  search: c(11, 11, 7) + "M21 21l-4.5-4.5",
  plus: "M12 5v14M5 12h14",
  sun: c(12, 12, 4) + "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  target: c(12, 12, 9) + c(12, 12, 5) + c(12, 12, 1),
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  "trend-up": "M3 17l6-6 4 4 8-8M15 7h6v6",
  "trend-down": "M3 7l6 6 4-4 8 8M15 17h6v-6",
  card: "M3 6h18v12H3zM3 10h18M7 15h3",
  bank: "M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18",
  clock: c(12, 12, 9) + "M12 7v5l3 2",
  zap: "M13 3L5 14h6l-1 7 8-11h-6z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  "chevron-left": "M15 5l-7 7 7 7",
  "chevron-right": "M9 5l7 7-7 7",
  menu: "M4 7h16M4 12h16M4 17h16",
  logout: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
  snowflake: "M12 3v18M4.2 7.5l15.6 9M19.8 7.5L4.2 16.5",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1.5A3.5 3.5 0 0 0 7.5 11M16 6h4v1.5A3.5 3.5 0 0 1 16.5 11M12 13v4M8 20h8M10 17h4",
  users: c(9, 8, 3.5) + "M2.5 20a6.5 6.5 0 0 1 13 0M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14a6.5 6.5 0 0 1 3.5 6",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  award: c(12, 9, 6) + "M8.5 14L7 21l5-3 5 3-1.5-7",
  receipt: "M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6",
  coin: c(12, 12, 9) + "M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4.5",
  percent: "M19 5L5 19" + c(7, 7, 2) + c(17, 17, 2),
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  dot: c(12, 12, 2),
  "arrow-up": "M12 19V5M6 11l6-6 6 6",
  "arrow-down": "M12 5v14M6 13l6 6 6-6",
  smile: c(12, 12, 9) + "M8.5 14c1 1.5 6 1.5 7 0M9 10h.01M15 10h.01",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
};
export default function Icon({ name, size, className = "" }) {
  const d = P[name] || P.dot;
  return (<svg className={"ico " + className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>);
}
const MOUTH = ["M8.5 17c1-2 6-2 7 0", "M9 16.5c1-1 5-1 6 0", "M9 15.5h6", "M8.5 14.5c1.2 1.8 5.8 1.8 7 0", "M8 14c1.3 3 6.7 3 8 0"];
export function Face({ n }) {
  return (<svg className="face" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.2" /><path d={MOUTH[n - 1]} /></svg>);
}
