import { publishedProfile } from "@/lib/directory/profile";

// Decides the 404 before loading.tsx streams the skeleton: once it has, the response is a 200 (Next.js streaming).
export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await publishedProfile((await params).id);
  return children;
}
