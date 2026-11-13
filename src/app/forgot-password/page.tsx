import { RecoveryForm } from "./RecoveryForm";
import { AuthCard, AuthPage } from "@/components/auth/parts";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const expired = (await searchParams).error === "expired";
  return (
    <AuthPage>
      <AuthCard>
        <RecoveryForm expired={expired} />
      </AuthCard>
    </AuthPage>
  );
}
