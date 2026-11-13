import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export default function FormShell({ eyebrow, title, subtitle, children, wide = false }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(64% 48% at 50% 0%, rgba(0,213,255,0.13) 0%, rgba(9,9,12,0) 66%)",
        }}
      />
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-25" />

      <div className="relative mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-signal/40 bg-signal/10 font-display text-[15px] leading-none text-signal">
            C
          </span>
          <span className="font-display text-[1.375rem] uppercase leading-none tracking-[0.04em] text-foreground">
            Carried
          </span>
        </Link>
        <Link to="/" className="btn btn-ghost h-9 gap-1.5 px-3 text-[11px]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      <main className="relative flex flex-1 justify-center px-5 pb-10 pt-2 sm:px-8 sm:pt-6">
        <div className={wide ? "w-full max-w-3xl" : "w-full max-w-[460px]"}>
          <div className="text-center">
            <p className="eyebrow text-signal">{eyebrow}</p>
            <h1 className="mt-2 font-display text-[2.5rem] uppercase leading-[0.92] text-foreground sm:text-[2.9rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mx-auto mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  );
}
