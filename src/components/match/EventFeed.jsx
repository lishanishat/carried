import { Mic, Radio } from "lucide-react";
import { EVENT_LABEL } from "@/lib/xp";

function clock(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export default function EventFeed({ events = [], casterOn }) {
  return (
    <div className="panel overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <Radio className="h-3 w-3 text-signal" />
          Team activity
        </p>
        <span
          className={`num flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] ${
            casterOn ? "text-neon" : "text-muted-foreground/60"
          }`}
        >
          <Mic className="h-2.5 w-2.5" />
          {casterOn ? "caster on" : "muted"}
        </span>
      </div>

      <div className="max-h-[460px] overflow-y-auto no-scrollbar">
        {events.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[11.5px] text-muted-foreground">
            Nothing has happened yet. Start a mission.
          </p>
        ) : null}
        <ul>
          {events.map((event) => (
            <li
              key={event.id}
              className="flex gap-2.5 border-b border-border/50 px-3.5 py-2.5 last:border-0"
            >
              <span className="num shrink-0 pt-0.5 text-[9.5px] text-muted-foreground/60">
                {clock(event.created_date)}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-[11.5px] leading-relaxed ${
                    event.caster_text ? "text-foreground/90" : "text-muted-foreground"
                  }`}
                >
                  {event.caster_text || EVENT_LABEL[event.type] || event.type}
                </p>
                <p className="mt-0.5 text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/60">
                  {EVENT_LABEL[event.type] || event.type}
                  {event.actor_name ? ` · ${event.actor_name}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
