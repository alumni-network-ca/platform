import "./globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { SchoolProvider } from "@/components/SchoolProvider";
import { schoolBranding } from "@/lib/school";
import { getSchool } from "@/lib/tenant/server";

export async function generateMetadata(): Promise<Metadata> {
  const school = await getSchool();
  if (!school) return { title: "Alumni Network" };
  const { shortName, networkName } = schoolBranding(school);
  return {
    title: networkName,
    description: `Private professional network for verified ${shortName} alumni.`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const school = await getSchool();
  return (
    <html lang="en">
      <body>
        <SchoolProvider school={school}>
          <LanguageProvider>{children}</LanguageProvider>
        </SchoolProvider>
      </body>
    </html>
  );
}
