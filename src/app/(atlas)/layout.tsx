import { Archivo, Newsreader } from "next/font/google";
import type { ReactNode } from "react";

// Atlas display + serif fonts, scoped to this route group so the (hidden)
// Editorial route does not preload Archivo. The URL stays `/`. Archivo is variable (wdth 62–125,
// wght 100–900); Tailwind's font-display / font-serif read these variables.
const archivo = Archivo({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export default function AtlasLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className={`${archivo.variable} ${newsreader.variable}`}>{children}</div>;
}
