import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Play } from "lucide-react";
import { startDemo } from "@/lib/demo-fns";
import { saveIdentity } from "@/lib/identity";

export default function PlayDemoButton() {
  const navigate = useNavigate();
  const start = useServerFn(startDemo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function play() {
    setError("");
    setBusy(true);
    try {
      const res = await start({ data: {} });
      if (!res?.ok) {
        setError(res?.error || "The demo couldn't start.");
        return;
      }
      saveIdentity(res.code, {
        token: res.token,
        playerId: res.playerId,
        name: res.name,
        demo: { ownerToken: res.ownerToken, players: res.players },
      });
      navigate({ to: "/match/$code", params: { code: res.code } });
    } catch (e) {
      setError(e?.message || "The demo couldn't start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={play}
        disabled={busy}
        className="btn w-full border border-warn/50 bg-warn/10 text-warn hover:border-warn/70 hover:bg-warn/15 sm:w-auto"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {busy ? "Loading demo…" : "Play demo"}
      </button>
      {error ? (
        <p className="mt-1.5 text-[11px] leading-snug text-danger">{error}</p>
      ) : (
        <p className="mt-1.5 text-[10.5px] leading-snug text-muted-foreground">
          Live demo · 4 fictional players
        </p>
      )}
    </div>
  );
}
