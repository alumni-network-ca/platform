import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";
import { AuthCard, AuthPage } from "@/components/auth/parts";

// Sign-in on the root domain, for the platform console. A session here is separate from every school's (ADR 0002).
export default function ConsoleLoginPage() {
  return (
    <AuthPage>
      <AuthCard>
        <Suspense fallback={null}>
          <SignInForm networkName="Alumni Network" audience="console" />
        </Suspense>
      </AuthCard>
    </AuthPage>
  );
}
