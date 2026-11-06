import "./globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SchoolProvider } from "@/components/SchoolProvider";
import { schoolBranding } from "@/lib/school";
import { getSchool } from "@/lib/tenant/server";
import { schoolTheme } from "@/lib/theme";

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
    <html lang="en" data-scroll-behavior="smooth" style={schoolTheme(school?.branding)}>
      <body>
        <SchoolProvider school={school}>
          <LanguageProvider>{children}</LanguageProvider>
        </SchoolProvider>
      </body>
    </html>
  );
}
