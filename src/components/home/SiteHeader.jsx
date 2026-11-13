import { Link } from "@tanstack/react-router";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-signal/40 bg-signal/10 font-display text-[15px] leading-none text-signal">
            C
          </span>
          <span className="font-display text-[1.375rem] uppercase leading-none tracking-[0.04em] text-foreground">
            Carried
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] text-muted-foreground md:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <Link to="/join" className="transition-colors hover:text-foreground">
            Join match
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/join"
            className="btn btn-outline hidden h-10 px-4 text-[11.5px] sm:inline-flex"
          >
            Join
          </Link>
          <Link to="/create" className="btn btn-primary h-10 px-4 text-[11.5px]">
            Create match
          </Link>
        </div>
      </div>
    </header>
  );
}
