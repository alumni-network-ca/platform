import Link from "next/link";
import { Nav } from "@/components/Nav";
import { requireAccess } from "@/lib/auth/account";
import { getServerLocale } from "@/lib/i18n-server";
import { JoinForm } from "../JoinForm";
import { BackArrow } from "@/components/icons";

export default async function EditRequestPage() {
  const { school, supabase, user } = await requireAccess("/join/edit");
  const fr = (await getServerLocale()) === "fr";
  const { data, error } = await supabase
    .from("access_requests")
    .select("first_name, last_name, maiden_name, grad_year, school_student_id, note")
    .eq("institution_id", school.id)
    .eq("user_id", user.id)
    .in("status", ["pending", "needs_info"])
    .single();
  if (error) throw new Error(`Could not load the request: ${error.message}`);
  return (
    <>
      <Nav />
      <main className="joinPage">
        <section className="joinCard joinCentered">
          <Link className="backLink" href="/auth/home">
            <BackArrow />
            {fr ? "Ma demande" : "My request"}
          </Link>
          <h1>{fr ? "Modifiez votre demande" : "Edit your request"}</h1>
          <p className="muted">
            {fr
              ? "Corrigez vos renseignements pendant la vérification par l'école. Votre compte reste le même."
              : "Correct your details while your request is awaiting a school decision. Your sign-in account stays the same."}
          </p>
          <JoinForm initial={data} />
        </section>
      </main>
    </>
  );
}
