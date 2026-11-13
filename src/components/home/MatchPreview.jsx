import { ArrowRight, AlertTriangle, ArrowDownRight, Mic } from "lucide-react";

const AVATARS = ["187 100% 55%", "265 88% 72%", "330 82% 70%"];

const PLAYERS = [
  { name: "Maya", role: "Research", xp: 120 },
  { name: "Kai", role: "Build", xp: 95 },
  { name: "Dev", role: "Deck", xp: 60 },
];

function Avatar({ name, hue, size = "md" }) {
  const dims = size === "sm" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[11px]";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-[7px] font-semibold ${dims}`}
      style={{ backgroundColor: `hsl(${hue} / 0.16)`, color: `hsl(${hue})`, boxShadow: `inset 0 0 0 1px hsl(${hue} / 0.35)` }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export default function MatchPreview() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-6 opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 70% 30%, rgba(0,213,255,0.16) 0%, rgba(10,10,12,0) 70%)",
        }}
      />

      <div className="panel relative rounded-xl p-3.5 sm:p-4">
        {/* label */}
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow rounded-[6px] border border-border px-2 py-1 text-muted-foreground">
            Demo preview
          </span>
          <span className="eyebrow text-muted-foreground/80">Sample data</span>
        </div>

        {/* project header */}
        <div className="flex items-start justify-between gap-3 rounded-[10px] border border-border/80 bg-[hsl(240_9%_5%)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-foreground">
              Renewable energy deck
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              6 missions · 3 players · code <span className="num text-foreground/80">KQZB</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="eyebrow text-muted-foreground">Deadline</p>
            <p className="num mt-1 text-[12px] text-warn">02d 14h 09m</p>
          </div>
        </div>

        {/* players */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PLAYERS.map((p, i) => (
            <div
              key={p.name}
              className="rounded-[10px] border border-border/80 bg-[hsl(240_9%_5%)] px-2.5 py-2"
            >
              <div className="flex items-center gap-2">
                <Avatar name={p.name} hue={AVATARS[i]} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium leading-tight text-foreground">
                    {p.name}
                  </p>
                  <p className="truncate text-[10px] leading-tight text-muted-foreground">
                    {p.role}
                  </p>
                </div>
              </div>
              <p className="num mt-1.5 text-[11px] text-signal">{p.xp} XP</p>
            </div>
          ))}
        </div>

        {/* mission */}
        <div className="mt-2 rounded-[10px] border border-border/80 bg-[hsl(240_9%_5%)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow text-muted-foreground">Mission 03</span>
            <span className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              Owner
              <span className="flex items-center gap-1 text-foreground/85">
                <Avatar name="Maya" hue={AVATARS[0]} size="sm" />
                Maya
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-foreground">
            Lock the source list
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            <span className="text-muted-foreground/70">Acceptance:</span> 3 credible sources,
            APA format, published within 5 years.
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <div className="h-full rounded-full bg-signal" style={{ width: "66%" }} />
            </div>
            <span className="num shrink-0 text-[10.5px] text-muted-foreground">2 / 3 checks</span>
          </div>
        </div>

        {/* tag-in */}
        <div className="mt-2 flex items-start gap-2.5 rounded-[10px] border border-warn/40 bg-warn/[0.08] px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-warn">Maya needs backup.</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Stuck on the citation check — tag-in is open.
            </p>
          </div>
        </div>

        {/* handoff */}
        <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] border border-border/80 bg-[hsl(240_9%_5%)] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[12px] text-foreground">
            <Avatar name="Maya" hue={AVATARS[0]} size="sm" />
            Maya
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Avatar name="Kai" hue={AVATARS[1]} size="sm" />
            Kai
          </span>
          <span className="flex items-center gap-1 rounded-[6px] bg-neon/15 px-1.5 py-0.5 text-[10px] font-medium text-neon">
            <ArrowDownRight className="h-2.5 w-2.5" />
            Handoff
          </span>
        </div>

        {/* caster */}
        <div className="mt-2 border-l-2 border-neon/60 pl-2.5">
          <p className="flex items-center gap-1.5 eyebrow text-neon">
            <Mic className="h-2.5 w-2.5" />
            Caster
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-foreground/80">
            Clean handoff — Maya passes the citation block, Kai is on the clock. No XP lost.
          </p>
        </div>
      </div>
    </div>
  );
}
