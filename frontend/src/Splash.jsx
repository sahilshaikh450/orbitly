import { useEffect, useState } from "react";
export default function Splash({ onDone }) {
  const [out, setOut] = useState(false);
  const finish = () => { setOut(true); setTimeout(onDone, 500); };
  useEffect(() => { if (matchMedia("(prefers-reduced-motion: reduce)").matches) { onDone(); return; } const t = setTimeout(finish, 2300); return () => clearTimeout(t); }, []);
  return (<div className={"splash " + (out ? "out" : "")} onClick={finish}>
    <div className="orb o1" /><div className="orb o2" />
    <svg viewBox="0 0 120 120" className="sp-svg"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
      <circle className="sp-ring" cx="60" cy="60" r="40" fill="none" stroke="url(#sg)" strokeWidth="5" strokeLinecap="round" />
      <g className="sp-spin"><circle cx="100" cy="60" r="7" fill="#fff" /></g><circle className="sp-core" cx="60" cy="60" r="12" fill="#fff" /></svg>
    <h1 className="sp-logo">{"Orbitly".split("").map((c, i) => <span key={i} style={{ animationDelay: `${0.6 + i * 0.08}s` }}>{c}</span>)}</h1>
    <p className="sp-tag">Habits · Money · Tasks</p><div className="sp-bar"><i /></div></div>);
}
