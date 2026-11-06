"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/**
 * A form's submit button that shows the spinner while the form's server action runs. For forms rendered by server
 * components, which hold no pending state of their own; a client form with useActionState passes `loading` to
 * Button instead.
 */
function SubmitButton(props: Omit<ButtonProps, "loading" | "type" | "asChild">) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} {...props} />;
}

export { SubmitButton };
