import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Loader2, RefreshCw, X } from "lucide-react";
import { ensureTrackers, type FaceResult, type PoseResult } from "@/lib/tracking";
import {
  FILTERS,
  drawFaceFilter,
  drawBodyFilter,
  drawBackgroundEffect,
  applyPostEffect,
  type FilterId,
  type FilterMeta,
} from "@/lib/filters";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio · Mirago" },
      { name: "description", content: "Live AR studio: face and body tracking with anime filters in your browser." },
    ],
  }),
  component: Studio,
});

const BG_FILTERS: FilterId[] = ["anime-bg", "neon-grid", "vaporwave"];
const POST_FILTERS: FilterId[] = ["noir", "vaporwave"];
const BODY_FILTERS: FilterId[] = ["body-glow", "wings"];

function Studio() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(-1);

  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fps, setFps] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Set<FilterId>>(new Set(["cat"]));
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [openGroup, setOpenGroup] = useState<FilterMeta["group"] | "All">("All");

  const start = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      await ensureTrackers();
      setStatus("ready");
    } catch (e: unknown) {
      console.error(e);
      setErrorMsg(e instanceof Error ? e.message : "Could not access camera");
      setStatus("error");
    }
  }, [facingMode]);

  useEffect(() => {
    start();
    return () => {
      const v = videoRef.current;
      if (v && v.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    if (status !== "ready") return;
    let lastFps = performance.now();
    let frames = 0;

    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d")!;
      const now = performance.now();
      const activeArr = Array.from(activeFilters);
      const useBg = activeArr.find((f) => BG_FILTERS.includes(f));

      let face: FaceResult | null = null;
      let pose: PoseResult | null = null;
      try {
        const { face: fl, pose: pl } = await ensureTrackers();
        if (now !== lastFrameTime.current) {
          face = fl.detectForVideo(video, now);
          pose = pl.detectForVideo(video, now);
          lastFrameTime.current = now;
        }
      } catch (err) {
        console.warn("track err", err);
      }

      // Background (replace) OR video draw (mirrored for selfie)
      ctx.save();
      if (facingMode === "user") {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      if (useBg) {
        drawBackgroundEffect(ctx, useBg, w, h, now);
        // composite a soft cutout of the subject over the bg using pose mask is heavy;
        // instead overlay video at lowered opacity center
        ctx.globalAlpha = 0.95;
        ctx.drawImage(video, 0, 0, w, h);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(video, 0, 0, w, h);
      }
      ctx.restore();

      // Foreground effects — also mirrored to match
      ctx.save();
      if (facingMode === "user") {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      for (const f of activeArr) {
        drawFaceFilter(ctx, f, face, w, h, now);
        if (BODY_FILTERS.includes(f)) drawBodyFilter(ctx, f, pose, w, h, now);
      }
      ctx.restore();

      // Post effects
      for (const f of activeArr) {
        if (POST_FILTERS.includes(f)) applyPostEffect(ctx, f, w, h);
      }

      frames++;
      if (now - lastFps > 500) {
        setFps(Math.round((frames * 1000) / (now - lastFps)));
        frames = 0;
        lastFps = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status, activeFilters, facingMode]);

  const toggleFilter = (id: FilterId) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (id === "none") return new Set<FilterId>();
      // exclusive groups: only one bg, only one post
      const meta = FILTERS.find((f) => f.id === id)!;
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (BG_FILTERS.includes(id)) BG_FILTERS.forEach((b) => next.delete(b));
        if (POST_FILTERS.includes(id)) POST_FILTERS.forEach((b) => next.delete(b));
        // also limit one per main group except Effect
        if (meta.group !== "Effect" && meta.group !== "Body") {
          FILTERS.filter((f) => f.group === meta.group).forEach((f) => next.delete(f.id));
        }
        next.add(id);
      }
      return next;
    });
  };

  const snapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `mirago-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const groups: (FilterMeta["group"] | "All")[] = useMemo(
    () => ["All", "Animal", "Accessory", "Anime", "Effect", "Background", "Body"],
    [],
  );
  const visibleFilters = useMemo(
    () => (openGroup === "All" ? FILTERS : FILTERS.filter((f) => f.group === openGroup || f.id === "none")),
    [openGroup],
  );

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black">
      <video ref={videoRef} playsInline muted className="hidden" />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-full glass text-foreground"
          aria-label="Back"
        >
          <X className="h-5 w-5" />
        </Link>
        <div className="rounded-full glass px-3 py-1.5 text-xs text-foreground">
          {status === "ready" ? (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE · {fps} FPS
            </span>
          ) : status === "loading" ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading
            </span>
          ) : (
            "Mirago"
          )}
        </div>
        <button
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          className="grid h-10 w-10 place-items-center rounded-full glass text-foreground"
          aria-label="Flip camera"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Canvas */}
      <div className="absolute inset-0 grid place-items-center">
        <canvas
          ref={canvasRef}
          className="h-full w-full object-cover"
        />
        {status !== "ready" && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 px-6 text-center">
            {status === "loading" && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-brand" />
                <p>Loading tracker models…</p>
                <p className="text-xs">First load downloads ~10 MB. Cached after.</p>
              </div>
            )}
            {status === "error" && (
              <div className="max-w-sm space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Camera unavailable</h2>
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
                <button
                  onClick={start}
                  className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Try again
                </button>
              </div>
            )}
            {status === "idle" && (
              <button
                onClick={start}
                className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground"
              >
                Enable camera
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {/* Group chips */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-3">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setOpenGroup(g)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                openGroup === g
                  ? "bg-gradient-brand text-primary-foreground"
                  : "glass text-foreground/80"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Filters carousel */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto px-3 pb-2">
          {visibleFilters.map((f) => {
            const active = activeFilters.has(f.id) || (f.id === "none" && activeFilters.size === 0);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`group flex shrink-0 flex-col items-center gap-1 ${
                  active ? "scale-105" : ""
                }`}
              >
                <div
                  className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl transition ${
                    active
                      ? "bg-gradient-brand text-primary-foreground ring-2 ring-white/40"
                      : "glass text-foreground"
                  }`}
                >
                  {f.emoji}
                </div>
                <span className="max-w-[64px] truncate text-[10px] text-foreground/80">
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Shutter */}
        <div className="flex items-center justify-center gap-6 px-4 pb-3">
          <button
            onClick={() => setActiveFilters(new Set())}
            className="grid h-12 w-12 place-items-center rounded-full glass text-foreground"
            aria-label="Clear filters"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={snapshot}
            disabled={status !== "ready"}
            className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-xl shadow-primary/40 ring-4 ring-white/40 transition-transform active:scale-95 disabled:opacity-50"
            aria-label="Capture"
          >
            <Camera className="h-8 w-8 text-black" />
          </button>
          <button
            onClick={snapshot}
            className="grid h-12 w-12 place-items-center rounded-full glass text-foreground"
            aria-label="Download"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
