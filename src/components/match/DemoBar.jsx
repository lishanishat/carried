import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw } from "lucide-react";
import { resetDemo } from "@/lib/demo-fns";

export default function DemoBar({ code, identity, players = [], currentId, onSwitch, onReset }) {
  const reset = useServerFn(resetDemo);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ownerToken = identity?.demo?.ownerToken || "";

  async function doReset() {
    setError("");
    setBusy(true);
    try {
      const res = await reset({ data: { code, ownerToken } });
      if (!res?.ok) {
        setError(res?.error || "The demo couldn't be reset.");
        return;
      }
      setConfirming(false);
      await onReset?.();
    } catch (e) {
      setError(e?.message || "The demo couldn't be reset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-warn/30 bg-warn/[0.06]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6">
        <span className="rounded-[5px] border border-warn/50 bg-warn/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-warn">
          Demo
        </span>
        <p className="text-[10.5px] text-muted-foreground">
          Fictional squad · every action hits the real game engine
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
            Playing as
          </span>
          {players.map((player) => {
            const active = player.id === currentId;
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => onSwitch?.(player)}
                disabled={active || busy}
                className={`rounded-[6px] border px-2 py-1 text-[10.5px] transition-colors ${
                  active
                    ? "border-signal/60 bg-signal/15 font-semibold text-signal"
                    : "border-border text-muted-foreground hover:border-signal/40 hover:text-foreground"
                }`}
              >
                {player.name}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="hidden text-[10px] text-muted-foreground md:inline">
            Second device? Join with code{" "}
            <span className="num text-signal">{code}</span>
          </span>

          {ownerToken ? (
            confirming ? (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={doReset}
                  disabled={busy}
                  className="inline-flex h-7 items-center gap-1 rounded-[6px] bg-danger px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Confirm reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="inline-flex h-7 items-center rounded-[6px] border border-border px-2.5 text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-warn/45 px-2.5 text-[9.5px] uppercase tracking-[0.1em] text-warn transition-colors hover:bg-warn/10"
              >
                <RotateCcw className="h-3 w-3" />
                Reset demo
              </button>
            )
          ) : null}
        </div>

        {error ? <p className="w-full text-[10.5px] text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
