import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import MatchPreview from "@/components/home/MatchPreview";
import PlayDemoButton from "@/components/home/PlayDemoButton";

const META = ["2–4 players", "No sign-up", "AI referee"];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(72% 88% at 22% 18%, rgba(0,213,255,0.16) 0%, rgba(0,213,255,0.05) 38%, rgba(9,9,12,0) 70%)",
        }}
      />
      <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto w-full max-w-[1240px] px-5 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-12">
        <div className="grid items-center gap-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-12">
          {/* copy */}
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon" />
              </span>
              <span className="eyebrow">Co-op project engine</span>
            </p>

            <h1 className="mt-4 font-display text-[clamp(2.6rem,7.2vw,4.5rem)] uppercase leading-[0.9] text-foreground">
              Group projects.
              <br />
              <span className="text-signal">Co-op mode.</span>
            </h1>

            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Split the work. Tag in when plans change. Finish together.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link to="/create" className="btn btn-primary group w-full sm:w-auto">
                Create match
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link to="/join" className="btn btn-outline group w-full sm:w-auto">
                Join match
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <PlayDemoButton />
            </div>
            <p className="mt-3 text-[10.5px] uppercase tracking-[0.12em] text-warn/80">
              Demo for judges — a live match with a Tag-In you can play
            </p>

            <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-muted-foreground">
              {META.map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-signal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* product preview */}
          <div className="min-w-0">
            <MatchPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
