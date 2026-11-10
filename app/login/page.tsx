import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";
import { schoolBranding } from "@/lib/school";
import { requireSchool } from "@/lib/tenant/server";
import { AuthCard, AuthPage } from "@/components/auth/parts";

// A school's sign-in page (ADR 0014, ADR 0015). The root domain has its own, for the console.
export default async function LoginPage() {
  const { networkName } = schoolBranding(await requireSchool());
  return (
    <AuthPage>
      <AuthCard>
        <Suspense fallback={null}>
          <SignInForm networkName={networkName} audience="school" />
        </Suspense>
      </AuthCard>
    </AuthPage>
  );
}
