import { Nav } from "@/components/Nav";
import { RecoveryForm } from "./RecoveryForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const expired = (await searchParams).error === "expired";
  return (
    <>
      <Nav />
      <main className="authPage">
        <section className="authCard joinAuth">
          <RecoveryForm expired={expired} />
        </section>
      </main>
    </>
  );
}
