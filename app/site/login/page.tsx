"use client";

import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";

// Sign-in on the root domain, for the platform console. A session here is separate from every school's (ADR 0002).
export default function ConsoleLoginPage() {
  return (
    <main className="authPage">
      <section className="authCard">
        <Suspense fallback={null}>
          <SignInForm networkName="Alumni Network" audience="console" />
        </Suspense>
      </section>
    </main>
  );
}
