import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LogIn, Users } from "lucide-react";
import FormShell from "@/components/match/FormShell";
import { joinMatch } from "@/lib/match-fns";
import { demoSeats, joinDemo } from "@/lib/demo-fns";
import { getRememberedName, rememberName, saveIdentity } from "@/lib/identity";

export default function JoinGate({ code, onJoined }) {
  const navigate = useNavigate();
  const join = useServerFn(joinMatch);
  const seatsFn = useServerFn(demoSeats);
  const claimFn = useServerFn(joinDemo);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [seats, setSeats] = useState(null);

  useEffect(() => {
    setName(getRememberedName());
  }, []);

  useEffect(() => {
    let alive = true;
    seatsFn({ data: { code } })
      .then((res) => {
        if (alive) setSeats(res?.ok && res.isDemo ? res.seats : []);
      })
      .catch(() => {
        if (alive) setSeats([]);
      });
    return () => {
      alive = false;
    };
  }, [code, seatsFn]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Add a display name.");
    setBusy(true);
    try {
      const res = await join({ data: { code, name: name.trim() } });
      if (!res?.ok) {
        setError(res?.error || "Could not join this match.");
        return;
      }
      rememberName(name.trim());
      const identity = { token: res.token, playerId: res.playerId, name: name.trim() };
      saveIdentity(res.code, identity);
      onJoined(identity);
      navigate({ to: "/match/$code", params: { code: res.code } });
    } catch (e) {
      setError(e?.message || "Could not join this match.");
    } finally {
      setBusy(false);
    }
  }

  async function claimSeat(seat) {
    setError("");
    setBusy(true);
    try {
      const res = await claimFn({ data: { code, playerId: seat.id } });
      if (!res?.ok) {
        setError(res?.error || "Could not take that seat.");
        return;
      }
      const identity = {
        token: res.token,
        playerId: res.playerId,
        name: res.name,
        demo: { players: res.players },
      };
      saveIdentity(res.code, identity);
      onJoined(identity);
    } catch (e) {
      setError(e?.message || "Could not take that seat.");
    } finally {
      setBusy(false);
    }
  }

  if (seats && seats.length) {
    return (
      <FormShell
        eyebrow={`Match ${code} · demo`}
        title="Pick a seat in the demo"
        subtitle="This is a fictional demo match. Pick the player this device acts as — your actions sync to every other device in the demo."
      >
        <div className="panel rounded-2xl p-6 sm:p-7">
          <p className="eyebrow mb-3 flex items-center gap-2 text-muted-foreground">
            <Users className="h-3 w-3 text-warn" />
            Demo players
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {seats.map((seat) => (
              <button
                key={seat.id}
                type="button"
                onClick={() => claimSeat(seat)}
                disabled={busy}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-warn/40 bg-warn/[0.07] text-[12.5px] font-semibold uppercase tracking-[0.1em] text-warn transition-colors hover:bg-warn/15 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {seat.name}
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">
            Resetting the demo is restricted to the device that opened it.
          </p>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell
      eyebrow={`Match ${code}`}
      title="You're invited"
      subtitle="Pick the name your squad will see on the scoreboard. This device remembers you."
    >
      <form onSubmit={onSubmit} className="panel rounded-2xl p-6 sm:p-7">
        <label htmlFor="gate-name" className="eyebrow mb-2 block text-muted-foreground">
          Display name
        </label>
        <input
          id="gate-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Kai"
          autoComplete="nickname"
          className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-signal/60 focus:outline-none focus:ring-2 focus:ring-signal/20"
        />
        {error ? (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-signal px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:shadow-[0_0_32px_-6px_hsl(var(--signal)/0.85)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {busy ? "Joining…" : "Enter the lobby"}
        </button>
      </form>
    </FormShell>
  );
}
