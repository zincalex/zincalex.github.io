"use client";

import Link from "next/link";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { site } from "@/content/site";
import {
  focusRange,
  panFraming,
  PHOTO_ADMIN_PORT,
  photoAspect,
  PHOTO_FRAMING_LIMITS,
  type ResolvedPhotoFraming,
  visibleFraming,
} from "@/lib/photo-framing";
import { cn } from "@/lib/utils";
import { focusRing, hudLabel } from "@/themes/atlas/atlas-ui";
import { PhotoOrbit } from "@/themes/atlas/landing/split/photo-orbit";
import { SplitHero } from "@/themes/atlas/landing/split/split-hero";
import { ThemeToggle } from "@/themes/atlas/theme-toggle";

const SAVE_URL = `http://127.0.0.1:${PHOTO_ADMIN_PORT}`;
const ZOOM = PHOTO_FRAMING_LIMITS.zoom;
const SIZE = PHOTO_FRAMING_LIMITS.size;
/** Width / height of profile.jpg (site.person.photo.width/height). */
const ASPECT = photoAspect(site.person.photo);

/** The save server only answers pages served from localhost (not the dev server's Network URL). */
function onLocalhost() {
  return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}
/** Same page on localhost (same port), the address the save server accepts. */
function localhostUrl() {
  const { port, pathname } = window.location;
  return `http://localhost${port ? `:${port}` : ""}${pathname}`;
}

type ServerState = "checking" | "online" | "offline" | "wrong-host";
type Status = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

function clampZoom(z: number) {
  return Math.round(Math.min(ZOOM.max, Math.max(ZOOM.min, z)) * 100) / 100;
}

function sameFraming(a: ResolvedPhotoFraming, b: ResolvedPhotoFraming) {
  return a.size === b.size && a.zoom === b.zoom && a.x === b.x && a.y === b.y;
}

const button = cn(
  "inline-flex h-10 items-center justify-center border border-line px-4 font-mono text-[11px] font-medium tracking-[0.15em] uppercase transition-colors hover:bg-invert-bg hover:text-invert-fg disabled:pointer-events-none disabled:opacity-50",
  focusRing,
);

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const disabled = max - min < step;
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={cn(hudLabel, "text-muted-foreground")}>
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm text-foreground tabular-nums">
          {value}
          {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("w-full accent-primary disabled:opacity-40", focusRing)}
      />
    </div>
  );
}

/**
 * Dev-only editor for site.person.photo.framing: the real hero portrait (PhotoOrbit) with a
 * drag / zoom surface on the photo, sliders, and Save, which posts to the local save server
 * (scripts/admin-server.mjs) that writes src/content/photo-framing.json.
 */
export function PhotoAdmin({ photoAvailable, saved: savedProp }: { photoAvailable: boolean; saved: ResolvedPhotoFraming }) {
  const [saved, setSaved] = useState(savedProp);
  const [framing, setFraming] = useState(savedProp);
  const [server, setServer] = useState<ServerState>("checking");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const surfaceRef = useRef<HTMLDivElement>(null);
  const helpId = useId();

  // Pointers on the photo: one drags, two pinch-zoom. Gesture start values live in refs.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ framing: ResolvedPhotoFraming; x: number; y: number; dist: number } | null>(null);

  const visible = visibleFraming(framing, ASPECT);
  const range = focusRange(framing.zoom, ASPECT);
  const dirty = !sameFraming(visible, visibleFraming(saved, ASPECT));

  // Is `npm run admin` running? Re-check every few seconds while it is not.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!onLocalhost()) {
      // Set after mount: window is not available while the page is rendered on the server.
      queueMicrotask(() => setServer("wrong-host"));
      return;
    }
    const check = async () => {
      let ok = false;
      try {
        ok = (await fetch(`${SAVE_URL}/health`, { cache: "no-store" })).ok;
      } catch {
        ok = false;
      }
      if (cancelled) return;
      setServer(ok ? "online" : "offline");
      if (!ok) timer = setTimeout(check, 4000);
    };
    void check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Mouse wheel / trackpad zoom. Native listener: React's wheel handler is passive and
  // could not stop the page from scrolling.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setFraming((f) => ({ ...f, zoom: clampZoom(f.zoom * Math.exp(-e.deltaY * 0.0015)) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /** Restarts the gesture from the current state (after a pointer is added or removed). */
  function restartGesture(current: ResolvedPhotoFraming) {
    const pts = [...pointers.current.values()];
    if (pts.length === 0) {
      gesture.current = null;
      return;
    }
    const [a, b] = pts;
    gesture.current = {
      framing: visibleFraming(current, ASPECT),
      x: a!.x,
      y: a!.y,
      dist: b ? Math.hypot(b.x - a!.x, b.y - a!.y) : 0,
    };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    restartGesture(framing);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const start = gesture.current;
    const [a, b] = [...pointers.current.values()];
    if (b && start.dist > 0) {
      const dist = Math.hypot(b.x - a!.x, b.y - a!.y);
      setFraming({ ...start.framing, zoom: clampZoom(start.framing.zoom * (dist / start.dist)) });
    } else if (a) {
      const framePx = e.currentTarget.clientWidth;
      setFraming(panFraming(start.framing, a.x - start.x, a.y - start.y, framePx, ASPECT));
    }
  }

  function onPointerEnd(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(e.pointerId)) return;
    restartGesture(framing);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 5 : 1;
    // Arrow keys move the photo (so the focal point moves the other way), like dragging.
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      setFraming((f) => {
        const v = visibleFraming(f, ASPECT);
        return visibleFraming({ ...v, x: v.x + move[0], y: v.y + move[1] }, ASPECT);
      });
    } else if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_") {
      e.preventDefault();
      const delta = e.key === "+" || e.key === "=" ? 0.05 : -0.05;
      setFraming((f) => ({ ...f, zoom: clampZoom(f.zoom + delta) }));
    }
  }

  async function save() {
    if (!onLocalhost()) {
      setServer("wrong-host");
      setStatus({
        kind: "error",
        message: `The save server only accepts this page from localhost. Open ${localhostUrl()} instead of the Network URL.`,
      });
      return;
    }
    setStatus({ kind: "saving", message: "Saving…" });
    try {
      const res = await fetch(`${SAVE_URL}/photo-framing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visible),
      });
      const body = (await res.json()) as { framing?: ResolvedPhotoFraming; error?: string };
      if (!res.ok || !body.framing) throw new Error(body.error ?? `HTTP ${res.status}`);
      setServer("online");
      setSaved(body.framing);
      setFraming(body.framing);
      setStatus({ kind: "saved", message: "Saved to src/content/photo-framing.json. Open pages update by themselves." });
    } catch (err) {
      const offline = err instanceof TypeError;
      if (offline) setServer("offline");
      setStatus({
        kind: "error",
        message: offline
          ? "Could not reach the save server. Run `npm run admin` in a second terminal, then Save again."
          : `Not saved: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const sizeStyle = { width: framing.size, height: framing.size } as CSSProperties;

  return (
    <div className="dark theme-atlas min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-40 flex h-12 items-stretch border-b border-line bg-background/90 backdrop-blur-md">
        <Link
          href="/"
          className={cn(
            "flex items-center px-5 font-display text-sm font-semibold tracking-[0.08em] uppercase",
            focusRing,
          )}
        >
          Back to site
        </Link>
        <p className={cn(hudLabel, "ml-auto flex items-center px-4 text-muted-foreground")}>Dev only · not exported</p>
        <ThemeToggle />
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="admin-title" className="grid content-start justify-items-center gap-6">
          <div className="justify-self-stretch">
            <h1 id="admin-title" className="font-display text-2xl font-semibold tracking-[-0.01em]">
              Profile photo
            </h1>
            <p id={helpId} className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Drag the photo to position it, zoom with the mouse wheel, a pinch or the slider. With the photo
              focused, arrow keys move it (Shift for bigger steps) and + / − zoom. Shown at the real desktop size;
              on phones the portrait is capped at 70% of the screen width.
            </p>
          </div>

          <div className="relative shrink-0" style={sizeStyle}>
            <PhotoOrbit available={photoAvailable} framing={visible} className="size-full" />
            <div
              ref={surfaceRef}
              role="application"
              aria-roledescription="photo position editor"
              aria-label={`Photo position: ${visible.x}% horizontal, ${visible.y}% vertical, zoom ${visible.zoom}×`}
              aria-describedby={helpId}
              tabIndex={0}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onKeyDown={onKeyDown}
              className={cn(
                "absolute inset-[13%] cursor-grab touch-none rounded-full active:cursor-grabbing",
                focusRing,
              )}
            />
          </div>
          {!photoAvailable ? (
            <p className="text-sm text-muted-foreground">
              public/images/profile.jpg is missing, so the initials avatar is shown.
            </p>
          ) : null}
        </section>

        <section aria-label="Settings" className="grid content-start gap-6 border border-line p-5">
          <Slider
            label="Size"
            unit=" px"
            value={framing.size}
            min={SIZE.min}
            max={SIZE.max}
            step={2}
            onChange={(size) => setFraming((f) => ({ ...f, size }))}
          />
          <Slider
            label="Zoom"
            unit="×"
            value={framing.zoom}
            min={ZOOM.min}
            max={ZOOM.max}
            step={0.01}
            onChange={(zoom) => setFraming((f) => ({ ...f, zoom }))}
          />
          <Slider
            label="Horizontal position"
            unit="%"
            value={visible.x}
            min={Math.ceil(range.x.min * 10) / 10}
            max={Math.floor(range.x.max * 10) / 10}
            step={0.1}
            onChange={(x) => setFraming((f) => ({ ...visibleFraming(f, ASPECT), x }))}
          />
          <Slider
            label="Vertical position"
            unit="%"
            value={visible.y}
            min={Math.ceil(range.y.min * 10) / 10}
            max={Math.floor(range.y.max * 10) / 10}
            step={0.1}
            onChange={(y) => setFraming((f) => ({ ...visibleFraming(f, ASPECT), y }))}
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Positions are the point of the photo shown at the centre of the circle. A position slider is greyed
            out when the photo exactly fits the circle in that direction (for example horizontally at zoom 1× for a
            portrait photo): zoom in to move it there.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={status.kind === "saving" || !dirty}
              className={cn(button, "border-primary bg-primary text-primary-foreground")}
            >
              Save
            </button>
            <button type="button" onClick={() => setFraming(saved)} disabled={!dirty} className={button}>
              Reset
            </button>
          </div>

          <div className="grid gap-1 text-sm">
            <p className="text-muted-foreground">
              Save server:{" "}
              <span className={server === "online" ? "text-primary" : "text-foreground"}>
                {server === "checking"
                  ? "checking…"
                  : server === "online"
                    ? "running"
                    : server === "wrong-host"
                      ? "only reachable from localhost (open the admin at http://localhost)"
                      : "not running (npm run admin)"}
              </span>
            </p>
            <p className="text-muted-foreground">{dirty ? "Unsaved changes." : "Matches the saved file."}</p>
            <p
              role="status"
              aria-live="polite"
              className={cn("min-h-5", status.kind === "error" ? "text-[var(--orbit-1)]" : "text-foreground")}
            >
              {status.message}
            </p>
          </div>
        </section>
      </main>

      <section aria-labelledby="hero-preview-title" className="mx-auto max-w-6xl px-5 pb-16">
        <h2 id="hero-preview-title" className={cn(hudLabel, "mb-3 text-muted-foreground")}>
          Hero preview (half size)
        </h2>
        <div className="overflow-x-auto border border-line">
          {/* Decorative copy of the landing: not focusable, hidden from assistive tech. */}
          <div inert aria-hidden="true" className="pointer-events-none w-[1200px]" style={{ zoom: 0.5 }}>
            <SplitHero photoAvailable={photoAvailable} framing={visible} />
          </div>
        </div>
      </section>
    </div>
  );
}
