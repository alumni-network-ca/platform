import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SchoolProvider } from "@/components/SchoolProvider";
import { schoolBranding } from "@/lib/school";
import { getSchool } from "@/lib/tenant/server";
import { schoolTheme } from "@/lib/theme";

// The design's typeface, served from our own domain (no request to Google from the browser). It sets
// --font-inter, which globals.css reads; the fallback is Arial sized to Inter's metrics, so text doesn't jump
// while the font loads.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export async function generateMetadata(): Promise<Metadata> {
  const school = await getSchool();
  if (!school) return { title: "Alumni Network" };
  const { shortName, networkName, favicon } = schoolBranding(school);
  return {
    title: networkName,
    description: `Private professional network for verified ${shortName} alumni.`,
    ...(favicon && { icons: { icon: favicon } }),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const school = await getSchool();
  // The school's colours as CSS variables, rendered here so pages never flash the default theme (ADR 0019).
  // data-scroll-behavior: globals.css scrolls smoothly for in-page links; Next.js 16 then also glides to the top on
  // every navigation unless told to jump.
  return (
    <html
      lang="en"
      className={inter.variable}
      data-scroll-behavior="smooth"
      style={schoolTheme(school?.branding)}
    >
      <body>
        <SchoolProvider school={school}>
          <LanguageProvider>{children}</LanguageProvider>
        </SchoolProvider>
      </body>
    </html>
  );
}
