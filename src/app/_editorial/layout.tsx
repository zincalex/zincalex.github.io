import { Inter, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
// Newsreader (variable, optical-size axis, roman + italic) for headings and
// Inter for body text. Tailwind's font-serif / font-sans utilities read
// var(--font-serif) / var(--font-sans), so setting the next/font variables on
// this wrapper scopes both fonts to the route. Palette tokens live in the
// .theme-editorial block of globals.css.
const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});
export default function EditorialLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={`${newsreader.variable} ${inter.variable} theme-editorial min-h-screen bg-background font-sans text-foreground`}>
      {children}
    </div>
  );
}
