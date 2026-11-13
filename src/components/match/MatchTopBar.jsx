import { Link } from "@tanstack/react-router";
import { LogOut, Volume2, VolumeX } from "lucide-react";

const STATUS_COPY = {
  lobby: "Lobby",
  draft: "Draft day",
  live: "Live",
  finished: "Final",
};

function statusTone(status) {
  if (status === "live") return "text-neon";
  if (status === "finished") return "text-signal";
  return "text-warn";
}

export default function MatchTopBar({ match, casterEnabled, onToggleCaster, onLeave }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-signal/40 bg-signal/10 font-display text-[15px] leading-none text-signal"
            title="CARRIED home"
          >
            C
          </Link>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-none text-foreground">
              {match.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="num text-signal">{match.code}</span>
              <span className="text-muted-foreground/40">/</span>
              <span className={statusTone(match.status)}>
                {STATUS_COPY[match.status] || match.status}
              </span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleCaster}
            title={casterEnabled ? "Mute caster" : "Enable caster voice"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-2.5 text-[9.5px] uppercase tracking-[0.12em] transition-colors ${
              casterEnabled
                ? "border-neon/40 bg-neon/10 text-neon"
                : "border-border text-muted-foreground hover:border-signal/40 hover:text-foreground"
            }`}
          >
            {casterEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            <span className="hidden sm:inline">{casterEnabled ? "Caster" : "Muted"}</span>
          </button>
          <button
            type="button"
            onClick={onLeave}
            title="Leave this device"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-border text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      </div>
    </header>
  );
}
