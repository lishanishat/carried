import { Timer } from "lucide-react";
import Countdown from "@/components/match/Countdown";
import HealthMeter, { ProgressStat } from "@/components/match/HealthMeter";

export default function MatchHeader({ match, health }) {
  return (
    <section className="panel rounded-xl px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2 text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-neon" />
            Live match
            <span className="text-muted-foreground/40">/</span>
            <span className="num text-signal">{match.code || match.join_code}</span>
          </p>
          <h1 className="mt-1.5 truncate font-display text-[1.875rem] uppercase leading-none tracking-[0.02em] text-foreground sm:text-[2.125rem]">
            {match.title}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:shrink-0 lg:gap-x-7">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <Timer className="h-3 w-3" />
              Deadline
            </p>
            <Countdown
              deadline={match.deadline}
              className="mt-1.5 block text-[13px] leading-none text-foreground"
            />
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              {new Date(match.deadline).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>

          <ProgressStat health={health} />

          <HealthMeter health={health} className="col-span-2 sm:col-span-1" />
        </div>
      </div>
    </section>
  );
}
