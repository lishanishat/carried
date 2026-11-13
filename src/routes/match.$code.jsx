import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import useMatch from "@/lib/useMatch";
import useCaster from "@/hooks/useCaster";
import { clearIdentity, getIdentity, saveIdentity } from "@/lib/identity";
import JoinGate from "@/components/match/JoinGate";
import MatchTopBar from "@/components/match/MatchTopBar";
import DemoBar from "@/components/match/DemoBar";
import LobbyScreen from "@/components/match/LobbyScreen";
import DraftScreen from "@/components/match/DraftScreen";
import LiveScreen from "@/components/match/LiveScreen";
import ResultsScreen from "@/components/match/ResultsScreen";

export const Route = createFileRoute("/match/$code")({
  ssr: false,
  head: () => ({ meta: [{ title: "Match — CARRIED" }] }),
  component: MatchPage,
});

function LoadingScreen({ label = "Syncing with your squad…" }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-signal/40 bg-signal/10 font-display text-xl text-signal">
        C
      </div>
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-signal" />
        {label}
      </p>
    </div>
  );
}

function MatchRoom({ code, identity, onSwitchPlayer }) {
  const navigate = useNavigate();
  const [casterEnabled, setCasterEnabled] = useState(false);
  const { state, error, loading, refresh } = useMatch(code, identity.token);

  useEffect(() => {
    try {
      setCasterEnabled(window.localStorage.getItem("carried:caster") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const casterAllowed = state?.match?.settings?.caster !== false;
  useCaster(state?.events, casterEnabled && casterAllowed);

  function toggleCaster() {
    const next = !casterEnabled;
    setCasterEnabled(next);
    try {
      window.localStorage.setItem("carried:caster", next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function leave() {
    clearIdentity(code);
    navigate({ to: "/" });
  }

  if (!state && loading) return <LoadingScreen />;

  if (!state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5 text-center">
        <AlertTriangle className="h-6 w-6 text-warn" />
        <p className="max-w-sm text-sm text-muted-foreground">
          {error || "We couldn't load this match."}
        </p>
        <div className="flex gap-2">
          <Link
            to="/join"
            search={{ code }}
            className="rounded-full bg-signal px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground"
          >
            Join again
          </Link>
          <Link
            to="/"
            className="rounded-full border border-border px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MatchTopBar
        match={state.match}
        casterEnabled={casterEnabled && casterAllowed}
        onToggleCaster={toggleCaster}
        onLeave={leave}
      />

      {identity.demo ? (
        <DemoBar
          code={code}
          identity={identity}
          players={identity.demo.players || []}
          currentId={identity.playerId}
          onSwitch={onSwitchPlayer}
          onReset={refresh}
        />
      ) : null}

      {state.match.status === "lobby" ? (
        <LobbyScreen state={state} code={code} token={identity.token} refresh={refresh} />
      ) : null}
      {state.match.status === "draft" ? (
        <DraftScreen state={state} code={code} token={identity.token} refresh={refresh} />
      ) : null}
      {state.match.status === "live" ? (
        <LiveScreen
          state={state}
          code={code}
          token={identity.token}
          refresh={refresh}
          casterEnabled={casterEnabled && casterAllowed}
        />
      ) : null}
      {state.match.status === "finished" ? <ResultsScreen state={state} code={code} /> : null}

      {!casterAllowed ? (
        <p className="pb-6 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
          The host turned off caster commentary for this match.
        </p>
      ) : null}
    </div>
  );
}

function MatchPage() {
  const { code } = Route.useParams();
  const [identity, setIdentity] = useState(undefined);

  useEffect(() => {
    setIdentity(getIdentity(code));
  }, [code]);

  if (identity === undefined) return <LoadingScreen label="Checking your seat…" />;
  if (!identity) return <JoinGate code={code} onJoined={setIdentity} />;

  function switchPlayer(player) {
    const next = {
      ...identity,
      token: player.token,
      playerId: player.id,
      name: player.name,
    };
    saveIdentity(code, next);
    setIdentity(next);
  }

  return (
    <MatchRoom
      key={identity.token}
      code={code}
      identity={identity}
      onSwitchPlayer={switchPlayer}
    />
  );
}
