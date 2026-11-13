import { useEffect, useState } from "react";

function remaining(deadline) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return { text: "—", tone: "text-muted-foreground" };
  if (ms <= 0) return { text: "DEADLINE PASSED", tone: "text-danger" };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const text =
    d > 0 ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`
      : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const tone = ms < 12 * 3600000 ? "text-danger" : ms < 48 * 3600000 ? "text-warn" : "text-foreground";
  return { text, tone, ms };
}

export default function Countdown({ deadline, className = "" }) {
  const [tick, setTick] = useState(null);

  useEffect(() => {
    setTick(remaining(deadline));
    const id = setInterval(() => setTick(remaining(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <span className={`num ${tick?.tone || "text-muted-foreground"} ${className}`}>
      {tick?.text || "—"}
    </span>
  );
}

export function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
