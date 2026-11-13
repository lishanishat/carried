import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import FormShell from "@/components/match/FormShell";
import { joinMatch } from "@/lib/match-fns";
import { getRememberedName, rememberName, saveIdentity } from "@/lib/identity";

export const Route = createFileRoute("/join")({
  validateSearch: (search) => ({
    code: typeof search?.code === "string" ? search.code.toUpperCase().slice(0, 4) : "",
  }),
  head: () => ({ meta: [{ title: "Join a match — CARRIED" }] }),
  component: JoinMatch,
});

function MatchCodeInput({ value, onChange, onBlur, invalid }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const chars = value.split("");
  const active = value.length >= 4 ? -1 : value.length;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor="code" className="text-[12.5px] font-medium text-foreground">
          Match code
        </label>
        <span className="text-[11px] text-muted-foreground">4 letters</span>
      </div>

      <div
        className={`relative rounded-[10px] transition-shadow ${
          focused ? "ring-2 ring-signal/40 ring-offset-2 ring-offset-card" : ""
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          id="code"
          value={value}
          onChange={(e) =>
            onChange(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4))
          }
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          placeholder="KQZB"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={4}
          aria-invalid={invalid || undefined}
          aria-describedby="code-hint"
          className="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-transparent caret-transparent focus:outline-none"
        />
        <div className="grid grid-cols-4 gap-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => {
            const char = chars[i];
            const isActive = focused && i === active;
            return (
              <span
                key={i}
                className={[
                  "num flex h-[54px] items-center justify-center rounded-[10px] border text-[22px] leading-none transition-colors",
                  char
                    ? "border-border bg-secondary/60 text-foreground"
                    : "border-border/80 bg-secondary/30 text-muted-foreground/40",
                  isActive ? "border-signal/70 bg-signal/[0.07]" : "",
                  invalid && !char ? "border-danger/50" : "",
                ].join(" ")}
              >
                {char || "–"}
              </span>
            );
          })}
        </div>
      </div>

      <p
        id="code-hint"
        className={`mt-1.5 text-[11.5px] ${invalid ? "text-danger" : "text-muted-foreground"}`}
      >
        {invalid ? "Enter all four letters of your match code." : "Paste or type the code your host shared."}
      </p>
    </div>
  );
}

function JoinMatch() {
  const navigate = useNavigate();
  const join = useServerFn(joinMatch);
  const { code: codeParam } = Route.useSearch();

  const [code, setCode] = useState(codeParam || "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(getRememberedName());
  }, []);

  useEffect(() => {
    if (codeParam) setCode(codeParam);
  }, [codeParam]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setCodeError(false);
    setNameError(false);

    const clean = code.trim().toUpperCase();
    if (clean.length !== 4) {
      setCodeError(true);
      return;
    }
    if (!name.trim()) {
      setNameError(true);
      return;
    }

    setBusy(true);
    try {
      const res = await join({ data: { code: clean, name: name.trim() } });
      if (!res?.ok) {
        setError(res?.error || "Could not join that match.");
        return;
      }
      rememberName(name.trim());
      saveIdentity(res.code, { token: res.token, playerId: res.playerId, name: name.trim() });
      navigate({ to: "/match/$code", params: { code: res.code } });
    } catch (e) {
      setError(e?.message || "Could not join that match.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell
      eyebrow="Join a match"
      title="Your squad is waiting."
      subtitle="Enter the code your host shared, then the name that shows on the scoreboard."
    >
      <form
        onSubmit={onSubmit}
        noValidate
        className="panel rounded-xl p-4 sm:p-5"
        aria-busy={busy}
      >
        <MatchCodeInput
          value={code}
          invalid={codeError}
          onChange={(next) => {
            setCode(next);
            if (codeError) setCodeError(false);
          }}
          onBlur={() => {
            if (code.length === 4) setCodeError(false);
          }}
        />

        <div className="mt-3.5">
          <label htmlFor="player-name" className="mb-2 block text-[12.5px] font-medium text-foreground">
            Display name
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            maxLength={24}
            placeholder="e.g. Kai"
            autoComplete="nickname"
            aria-invalid={nameError || undefined}
            className={`field ${nameError ? "border-danger/60" : ""}`}
          />
          <p className={`mt-1.5 text-[11.5px] ${nameError ? "text-danger" : "text-muted-foreground"}`}>
            {nameError ? "Add the name your squad will see." : "Keep it short — teammates see this."}
          </p>
        </div>

        {error ? (
          <p className="mt-3 flex items-start gap-2 rounded-[10px] border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] leading-relaxed text-danger">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className="btn btn-primary mt-4 w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {busy ? "Joining…" : "Join match"}
        </button>

        <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
          Hosting instead?{" "}
          <Link to="/create" className="font-medium text-signal hover:underline">
            Create a match
          </Link>
        </p>
      </form>
    </FormShell>
  );
}
