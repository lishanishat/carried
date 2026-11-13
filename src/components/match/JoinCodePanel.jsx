import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function JoinCodePanel({ code, joined, teamSize }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrOk, setQrOk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUrl(`${window.location.origin}/join?code=${code}`);
  }, [code]);

  useEffect(() => {
    if (!url) return;
    const probe = new window.Image();
    probe.onload = () => setQrOk(true);
    probe.onerror = () => setQrOk(false);
    probe.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(
      url
    )}`;
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url || code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div className="panel-glow relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(80% 120% at 15% 0%, rgba(0,229,255,0.18) 0%, rgba(8,11,18,0) 60%)",
        }}
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Join code</p>
          <p className="num mt-2 text-5xl leading-none tracking-[0.24em] text-signal text-signal-glow sm:text-6xl">
            {code}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            {joined} of {teamSize} players in the lobby
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-signal/50 hover:bg-signal/5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-neon" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span className="max-w-[190px] truncate">{url || "/join"}</span>
            </span>
          </div>
        </div>

        {qrOk ? (
          <div className="shrink-0 self-start rounded-xl bg-white p-2.5 sm:self-center">
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(
                url
              )}`}
              alt={`QR code to join match ${code}`}
              fittingType="fit"
              className="h-28 w-28"
            />
          </div>
        ) : (
          <div className="shrink-0 self-start rounded-xl border border-border px-4 py-3 sm:self-center">
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Share</p>
            <p className="num mt-1 text-sm text-foreground">/join?code={code}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Open on any phone</p>
          </div>
        )}
      </div>
    </div>
  );
}
