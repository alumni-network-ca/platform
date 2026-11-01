import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { SignInForm } from "@/components/SignInForm";

// Sign-in on the root domain, for the platform console. A session here is separate from every school's (ADR 0002).
export default function ConsoleLoginPage() {
  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard">
          <Suspense fallback={null}>
            {/* Codes need working email; EMAIL_CODES=on where it does (local Mailpit, CI). */}
            <SignInForm
              networkName="Alumni Network"
              audience="console"
              codes={process.env.EMAIL_CODES === "on"}
            />
          </Suspense>
        </section>
      </main>
    </>
  );
}
