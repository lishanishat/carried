const STEPS = [
  {
    n: "01",
    title: "Draft your missions",
    body: "Paste the brief. AI splits it into fair missions with acceptance criteria.",
  },
  {
    n: "02",
    title: "Complete tasks and help your squad",
    body: "Earn verified XP, send a rescue, or tag in and take over cleanly.",
  },
  {
    n: "03",
    title: "Finish with a shared contribution record",
    body: "One scoreboard, one receipt — everyone's actual contribution, in writing.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="border-b border-border/60">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8 sm:py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-[1.75rem] uppercase leading-none tracking-[0.02em] text-foreground sm:text-[2rem]">
            How a match runs
          </h2>
          <p className="eyebrow text-muted-foreground">Three moves</p>
        </div>

        <ol className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {STEPS.map(({ n, title, body }) => (
            <li
              key={n}
              className="rounded-xl border border-border/80 bg-[hsl(240_9%_6%)] p-4 transition-colors hover:border-border"
            >
              <div className="flex items-center gap-2.5">
                <span className="num flex h-6 min-w-6 items-center justify-center rounded-[6px] border border-signal/30 bg-signal/10 px-1 text-[10px] text-signal">
                  {n}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <h3 className="mt-3 text-[13.5px] font-semibold leading-snug text-foreground">
                {title}
              </h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
