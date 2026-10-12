import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { site } from "@/content/site";
import { roleLine, shownAvailability } from "@/lib/content";
import { HERO_ENTER_SCRIPT } from "@/lib/hero-enter";
import { REVEAL_SCRIPT } from "@/lib/reveal";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { person } = site;
const description = [`${person.name}: ${roleLine(person)}`, shownAvailability(person)].filter(Boolean).join(". ") + ".";

export const metadata: Metadata = {
  metadataBase: new URL("https://zincalex.github.io"),
  title: {
    default: person.name,
    template: `%s · ${person.name}`,
  },
  description,
  openGraph: {
    type: "profile",
    title: person.name,
    description,
    siteName: person.name,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT / HERO_ENTER_SCRIPT / REVEAL_SCRIPT add
    // data-theme / data-hero / data-reveal before React hydrates.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: HERO_ENTER_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: REVEAL_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
