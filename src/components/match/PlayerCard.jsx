import { useEffect, useRef, useState } from "react";
import { Crown, LifeBuoy, Star, Zap } from "lucide-react";

const HUES = ["187 100% 58%", "265 88% 74%", "330 82% 72%", "84 88% 62%"];

function hueFor(name = "") {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return HUES[sum % HUES.length];
}

export default function PlayerCard({ player, role, isMe, progress, compact = false }) {
  const xp = player.stats?.xp || 0;
  const prevXp = useRef(xp);
  const [gained, setGained] = useState(0);

  useEffect(() => {
    if (xp > prevXp.current) {
      setGained(xp - prevXp.current);
      const timer = setTimeout(() => setGained(0), 1600);
      prevXp.current = xp;
      return () => clearTimeout(timer);
    }
    prevXp.current = xp;
  }, [xp]);

  const confirmed = player.stats?.confirmed || 0;
  const assists = player.stats?.assists || 0;
  const pct = Math.round(progress || 0);
  const online = player.last_seen && Date.now() - new Date(player.last_seen).getTime() < 70000;
  const hue = hueFor(player.name);

  return (
    <div
      className={`relative overflow-hidden rounded-[10px] border px-3 py-2.5 transition-colors ${
        isMe
          ? "border-signal/45 bg-signal/[0.05]"
          : "border-border/80 bg-[hsl(240_9%_6%)] hover:border-border"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-[12px] font-semibold"
          style={{
            backgroundColor: `hsl(${hue} / 0.16)`,
            color: `hsl(${hue})`,
            boxShadow: `inset 0 0 0 1px hsl(${hue} / 0.35)`,
          }}
        >
          {player.name.slice(0, 1)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
              {player.name}
            </p>
            {player.is_host ? <Crown className="h-3 w-3 shrink-0 text-warn" /> : null}
            {isMe ? <span className="text-[10px] uppercase tracking-[0.1em] text-signal">you</span> : null}
          </div>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            {role?.title || "No role yet"}
          </p>
        </div>

        <div className="relative shrink-0 text-right">
          {gained > 0 ? (
            <span className="absolute -top-3.5 right-0 animate-rise whitespace-nowrap rounded-[5px] bg-neon/15 px-1.5 py-0.5 text-[10px] font-semibold text-neon">
              +{gained} XP
            </span>
          ) : null}
          <p
            className={`num text-[12.5px] leading-none transition-colors duration-500 ${
              gained > 0 ? "text-neon" : "text-signal"
            }`}
          >
            {xp.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">XP</p>
        </div>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? "hsl(var(--neon))" : "hsl(var(--signal))",
          }}
        />
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <Zap className="h-2.5 w-2.5 text-neon" />
            <span className="num">{confirmed}</span>
          </span>
          <span className="flex items-center gap-1">
            <LifeBuoy className="h-2.5 w-2.5 text-signal" />
            <span className="num">{assists}</span>
          </span>
          {compact ? null : (
            <span className="num text-muted-foreground/70">{pct}%</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {isMe ? <Star className="h-2.5 w-2.5 text-warn" /> : null}
          <span
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-neon" : "bg-muted-foreground/40"}`}
          />
          <span className="uppercase tracking-[0.1em]">{online ? "on" : "away"}</span>
        </span>
      </div>
    </div>
  );
}
