"use client";

import { OrbitControls, useCursor } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, type Mesh, SRGBColorSpace, Vector2, type Vector3 } from "three";

import { site } from "@/content/site";
import { getVisited, type VisitedInfo } from "@/lib/geo";
import {
  countryLabel,
  type CountryLocator,
  createCountryLocator,
  drawGlobeTexture,
  GLOBE_TEXTURE_ROTATION_Y,
  GLOBE_TEXTURE_SIZE,
  latLngToVector3,
  vector3ToLatLng,
} from "@/lib/globe";
import { ATLAS_COLORS, type AtlasTheme } from "@/lib/theme";

/** What the tooltip shows; x/y are relative to the canvas parent. */
export interface GlobeHover {
  name: string;
  visited: boolean;
  x: number;
  y: number;
}

interface GlobeSceneProps {
  theme: AtlasTheme;
  /** false when off-screen: the render loop stops. */
  active: boolean;
  onHover: (hover: GlobeHover | null) => void;
}

// Module constants: R3F rebuilds the camera when these props change identity.
// Distance 3.8 (not 3.2): at 3.2 the sphere spans asin(1/3.2) ≈ 18.2° each side, wider
// than the 17.5° half-fov, so its top and bottom were cut off. 3.8 fills about 86 % of the height.
const CAMERA = { position: latLngToVector3(45, 10, 3.8), fov: 35 };
const GL = { antialias: true, alpha: true, powerPreference: "low-power" } as const;
const DPR: [number, number] = [1, 2];

interface HoverData {
  locate: CountryLocator;
  visitedById: Map<string, VisitedInfo>;
}

// Built once per page, on the first hover (point-in-country lookup for the tooltip).
let hoverCache: HoverData | null = null;

function hoverData(): HoverData {
  if (!hoverCache) {
    const visitedById = new Map<string, VisitedInfo>();
    for (const v of getVisited(site.visitedCountries)) if (v.numericId) visitedById.set(v.numericId, v);
    hoverCache = { locate: createCountryLocator(), visitedById };
  }
  return hoverCache;
}

// One painted map per theme, kept for the page's lifetime so switching back is free.
const textureCanvases = new Map<AtlasTheme, HTMLCanvasElement>();

/** The equirectangular map (ocean, land, visited fills, borders) for a theme, painted once. */
function globeCanvas(theme: AtlasTheme): HTMLCanvasElement {
  let canvas = textureCanvases.get(theme);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = GLOBE_TEXTURE_SIZE.width;
    canvas.height = GLOBE_TEXTURE_SIZE.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const c = ATLAS_COLORS[theme];
      drawGlobeTexture(ctx, {
        ocean: c.globeOcean,
        land: c.globeLand,
        visited: c.accent,
        border: c.globeBorder,
        graticule: c.globeGraticule,
      });
    }
    textureCanvases.set(theme, canvas);
  }
  return canvas;
}

/**
 * Paints the map for a theme ahead of time (AtlasGlobe calls it in idle time once the
 * chunk is warm), so mounting the canvas near the section only uploads the texture.
 */
export function prepareGlobeTexture(theme: AtlasTheme): void {
  globeCanvas(theme);
}

/** [lng, lat] of a point on the sphere, in the argument order of CountryLocator. */
function lngLat(v: Vector3): [number, number] {
  const { lat, lng } = vector3ToLatLng([v.x, v.y, v.z]);
  return [lng, lat];
}

/** Last pointer position over the globe, in client px. */
interface PointerAt {
  clientX: number;
  clientY: number;
}

/** While hovering, the country under a still pointer is re-checked this often (frames). */
const HOVER_RECHECK_FRAMES = 6;

/** The textured sphere; also the hover raycast target. */
function Earth({
  theme,
  onHover,
  onHovering,
}: {
  theme: AtlasTheme;
  onHover: GlobeSceneProps["onHover"];
  onHovering: (hovering: boolean) => void;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const raycaster = useThree((s) => s.raycaster);
  const mesh = useRef<Mesh>(null);
  const pointer = useRef<PointerAt | null>(null);
  const moved = useRef(false);
  const frames = useRef(0);
  const lastName = useRef<string | null>(null);

  // A new texture per theme (the painted canvases are cached); the old one is freed.
  const texture = useMemo(() => {
    const t = new CanvasTexture(globeCanvas(theme));
    t.colorSpace = SRGBColorSpace;
    // Sharper land near the rim, where the texture is seen at a grazing angle.
    t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    return t;
  }, [theme, gl]);
  useEffect(() => () => texture.dispose(), [texture]);

  // The globe keeps turning under a still pointer, so the country is resolved from the
  // last pointer position: on every move (at most once per frame) and every few frames.
  useFrame(() => {
    const p = pointer.current;
    const sphere = mesh.current;
    if (!p || !sphere) return;
    frames.current += 1;
    if (!moved.current && frames.current < HOVER_RECHECK_FRAMES) return;
    moved.current = false;
    frames.current = 0;
    const host = gl.domElement.parentElement ?? gl.domElement;
    const rect = host.getBoundingClientRect();
    const ndc = new Vector2(((p.clientX - rect.left) / rect.width) * 2 - 1, -((p.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(sphere, false)[0];
    const { locate, visitedById } = hoverData();
    const feature = hit ? locate(...lngLat(hit.point)) : null;
    if (!feature) {
      if (lastName.current !== null) onHover(null);
      lastName.current = null;
      return;
    }
    lastName.current = String(feature.id);
    onHover({
      name: countryLabel(feature, visitedById),
      visited: visitedById.has(String(feature.id)),
      x: p.clientX - rect.left,
      y: p.clientY - rect.top,
    });
  });

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointer.current = { clientX: e.nativeEvent.clientX, clientY: e.nativeEvent.clientY };
    moved.current = true;
    onHovering(true);
  };
  const onPointerOut = () => {
    pointer.current = null;
    lastName.current = null;
    onHovering(false);
    onHover(null);
  };

  return (
    <mesh
      ref={mesh}
      rotation-y={GLOBE_TEXTURE_ROTATION_Y}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[1, 96, 64]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/** Vertical swipes keep scrolling the page; only horizontal drags reach the globe. */
function allowVerticalScroll(...elements: (HTMLElement | null | undefined)[]) {
  for (const el of elements) if (el) el.style.touchAction = "pan-y";
}

function Controls() {
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as { domElement?: HTMLElement } | null;
  // OrbitControls.connect() sets touch-action: none on its element (the canvas wrapper),
  // so restore pan-y once the controls are connected.
  useEffect(() => {
    if (controls) allowVerticalScroll(gl.domElement, controls.domElement);
  }, [controls, gl]);
  return (
    <OrbitControls
      makeDefault
      enableZoom={false}
      enablePan={false}
      enableDamping
      rotateSpeed={0.5}
      // Always turning, hover included; OrbitControls pauses it only while a drag is in progress.
      autoRotate
      autoRotateSpeed={0.35}
      minPolarAngle={Math.PI * 0.2}
      maxPolarAngle={Math.PI * 0.8}
    />
  );
}

/**
 * Textured globe: countries filled from the world-atlas shapes, visited ones in the accent.
 * The globe stays put and the camera orbits it, starting over Europe (lat 45, lng 10).
 * Loaded lazily by AtlasGlobe (ssr: false).
 */
export default function GlobeScene({ theme, active, onHover }: GlobeSceneProps) {
  const [hovering, setHovering] = useState(false);
  // "grab": the globe is dragged, not clicked.
  useCursor(hovering, "grab");
  return (
    <Canvas
      flat
      dpr={DPR}
      frameloop={active ? "always" : "never"}
      camera={CAMERA}
      gl={GL}
      onCreated={({ gl }) => allowVerticalScroll(gl.domElement)}
    >
      <Earth theme={theme} onHover={onHover} onHovering={setHovering} />
      <Controls />
    </Canvas>
  );
}
