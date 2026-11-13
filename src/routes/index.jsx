import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import SiteHeader from "@/components/home/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CARRIED — Group Projects. Co-op Mode." },
      {
        name: "description",
        content:
          "Split the work. Tag in when plans change. Finish together. CARRIED turns group projects into a co-op match with missions, verified XP and a shared contribution record.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />

        <section className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8 sm:py-14">
          <div className="flex flex-col items-start justify-between gap-5 rounded-xl border border-border/80 bg-[hsl(240_9%_6%)] p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="min-w-0">
              <p className="eyebrow text-signal">Ready check</p>
              <h2 className="mt-2 font-display text-[1.75rem] uppercase leading-none tracking-[0.02em] text-foreground sm:text-[2rem]">
                Start the match. Stop carrying alone.
              </h2>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <Link to="/create" className="btn btn-primary group w-full sm:w-auto">
                Create match
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link to="/join" className="btn btn-outline w-full sm:w-auto">
                Join match
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-start justify-between gap-2 px-5 py-6 text-[11.5px] text-muted-foreground sm:flex-row sm:items-center sm:px-8">
          <span className="font-display text-[1.125rem] uppercase leading-none tracking-[0.06em] text-foreground/70">
            Carried
          </span>
          <p>Built for squads who are tired of doing it alone.</p>
        </div>
      </footer>
    </div>
  );
}
