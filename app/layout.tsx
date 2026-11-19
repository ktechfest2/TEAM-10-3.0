import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Noto_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

// Noto Sans covers the Hausa, Yorùbá and Igbo letters (latin-ext); Bricolage is used for headlines and figures.
const noto = Noto_Sans({ variable: "--font-noto", subsets: ["latin", "latin-ext"], display: "swap" });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin", "latin-ext"], display: "swap" });
const plex = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tally", template: "%s · Tally" },
  description: "Every election result, witnessed by rival parties and checkable by anyone, from any phone.",
  applicationName: "Tally",
  appleWebApp: { capable: true, title: "Tally", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${noto.variable} ${bricolage.variable} ${plex.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteNav />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
