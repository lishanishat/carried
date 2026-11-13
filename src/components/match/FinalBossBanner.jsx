import { Skull, Sparkles } from "lucide-react";

export default function FinalBossBanner({ health, active, isHost, onActivate, busy }) {
  const hp = Math.max(0, 100 - (health?.completion || 0));
  const defeated = hp === 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-danger/30">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 140% at 20% 0%, rgba(255,77,94,0.28) 0%, rgba(8,11,18,0) 65%), linear-gradient(180deg, rgba(255,77,94,0.10), rgba(8,11,18,0.6))",
        }}
      />
      <div className="stripes pointer-events-none absolute inset-x-0 top-0 h-1 opacity-70" />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-danger/40 bg-danger/15 text-danger">
              <Skull className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-xl uppercase leading-none tracking-wide text-foreground">
                {defeated ? "Boss defeated" : "Final boss"}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-danger">
                {defeated ? "Every mission confirmed" : `${hp}% of the work still standing`}
              </p>
            </div>
          </div>
          {!active && isHost ? (
            <button
              type="button"
              onClick={onActivate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-danger/50 bg-danger/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-danger transition-colors hover:bg-danger/20 disabled:opacity-60"
            >
              <Sparkles className="h-3 w-3" />
              Activate
            </button>
          ) : null}
        </div>

        <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${hp}%`,
              background: "linear-gradient(90deg, #FF4D5E, #FF8A5B)",
              boxShadow: "0 0 18px -2px rgba(255,77,94,0.9)",
            }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Boss health drops every time a mission is confirmed. Unfinished missions are boss missions.
        </p>
      </div>
    </div>
  );
}
