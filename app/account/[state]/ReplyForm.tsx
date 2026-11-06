"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { replyToInfoRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { leaveTo } from "@/lib/leave";

export function ReplyForm({ question }: { question: string | null | undefined }) {
  const { locale } = useLanguage();
  const fr = locale === "fr";
  const [state, action, pending] = useActionState(
    async (_: { error: boolean }, form: FormData) => {
      const result = await replyToInfoRequest(form);
      if (result.next) return leaveTo(result.next);
      return result;
    },
    { error: false },
  );
  return (
    <form action={action} className="authForm">
      {question && <blockquote className="joinNotice">{question}</blockquote>}
      <label>
        {fr ? "Votre réponse" : "Your answer"}
        <Textarea name="reply" rows={4} maxLength={1000} required />
      </label>
      {state.error && (
        <p role="alert" className="notice">
          {fr
            ? "Veuillez écrire une réponse de 1 à 1 000 caractères."
            : "Please enter a reply between 1 and 1,000 characters."}
        </p>
      )}
      <Button size="lg" className="w-full" loading={pending}>
        {pending
          ? fr
            ? "Envoi…"
            : "Sending…"
          : fr
            ? "Envoyer la réponse au réviseur"
            : "Send reply to the reviewer"}
      </Button>
      <Link className="backLink" href="/join/edit">
        {fr ? "Modifier les renseignements de ma demande" : "Edit my request details"}
      </Link>
      <p className="microcopy muted">
        {fr
          ? "La demande retournera en vérification. L'accès reste bloqué jusqu'à l'approbation."
          : "Your request will return to school review. Alumni access stays locked until approval."}
      </p>
    </form>
  );
}
