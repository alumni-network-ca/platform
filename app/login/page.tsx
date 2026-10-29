import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { SignInForm } from "@/components/SignInForm";
import { schoolBranding } from "@/lib/school";
import { requireSchool } from "@/lib/tenant/server";

// A school's sign-in page (ADR 0014, ADR 0015). The root domain has its own, for the console.
export default async function LoginPage() {
  const { networkName } = schoolBranding(await requireSchool());
  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <Suspense fallback={null}>
            <SignInForm networkName={networkName} audience="school" />
          </Suspense>
        </section>
      </main>
    </>
  );
}
