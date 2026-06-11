import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Sparkles, UserCircle2, Wand2, Zap, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mirago — Live AR Face & Body Filters in your Browser" },
      { name: "description", content: "Mirago is a free live VTuber studio. Real-time face and full-body tracking, anime avatars and AR filters. No app, no account, no API keys." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-bold tracking-tight">Mirago</span>
        </Link>
        <Link
          to="/studio"
          className="rounded-full bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03]"
        >
          Open Studio
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:pt-20">
        <section className="grid items-center gap-12 sm:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Runs 100% in your browser · no signup
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Become anyone.
              <br />
              <span className="text-gradient">Live, in your browser.</span>
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              Mirago is a real-time AR studio. Track your face and full body, swap into anime
              avatars, drop on cinematic filters — no install, no account, no API keys.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-transform hover:scale-[1.03]"
              >
                <Camera className="h-4 w-4" /> Launch Studio
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-medium text-foreground hover:bg-card"
              >
                What's inside
              </a>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Camera stays on device</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> WebGL · WASM</span>
            </div>
          </div>

          <div className="relative">
            <HeroPreview />
          </div>
        </section>

        <section id="features" className="mt-28 grid gap-4 sm:grid-cols-3">
          <Feature
            icon={<UserCircle2 className="h-5 w-5" />}
            title="Precision face mesh"
            text="468-point facial landmarks with head pose and blendshapes drive every filter — no flat overlays."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Full-body tracking"
            text="33-point body pose lets effects, costumes and avatars follow your every move, not just your face."
          />
          <Feature
            icon={<Wand2 className="h-5 w-5" />}
            title="VTube anime avatars"
            text="Step into 3D anime characters rigged to your expressions and motion in real time."
          />
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo small /> <span>Mirago · made for creators</span>
          </div>
          <div>© {new Date().getFullYear()} Mirago</div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 ring-glow">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Logo({ small = false }: { small?: boolean }) {
  const s = small ? 18 : 28;
  return (
    <div
      className="grid place-items-center rounded-xl bg-gradient-brand text-primary-foreground"
      style={{ width: s + 8, height: s + 8 }}
    >
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M4 14c4 0 4-6 8-6s4 6 8 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="8" cy="10" r="1.5" fill="currentColor" />
        <circle cx="16" cy="10" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem] border border-border bg-card ring-glow">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/30 via-transparent to-brand-2/30" />
      <svg viewBox="0 0 200 250" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="oklch(0.78 0.20 330)" />
            <stop offset="1" stopColor="oklch(0.70 0.22 200)" />
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="100" rx="55" ry="68" fill="url(#g)" opacity="0.85" />
        <circle cx="80" cy="95" r="6" fill="#fff" />
        <circle cx="120" cy="95" r="6" fill="#fff" />
        <path d="M80 125 Q100 140 120 125" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M60 60 Q70 30 100 35 Q130 30 140 60 L135 70 Q120 55 100 55 Q80 55 65 70 Z" fill="url(#g)" />
        <path d="M100 170 L100 230 M70 200 L130 200" stroke="url(#g)" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl glass px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          LIVE · Anime mode
        </div>
        <div className="text-xs text-muted-foreground">60 FPS</div>
      </div>
    </div>
  );
}
