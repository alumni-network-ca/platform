"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { format, type Locale, type translations } from "@/lib/i18n";
import { leaveTo } from "@/lib/leave";
import type { Errors, FieldError } from "@/lib/profile/fields";
import { cn } from "@/lib/utils";
import { useLanguage } from "../LanguageProvider";

export type FormState = {
  errors: Errors;
  failed?: "failed" | "forbidden" | "reauth";
  next?: string;
};
export type ProfileCopy = (typeof translations)[Locale]["onboarding"];

const FormContext = createContext<{
  errors: Errors;
  failed: FormState["failed"];
  t: ProfileCopy;
  pending: boolean;
  /** Whether a field changed since the page loaded (the unsaved-changes warning). */
  dirty: boolean;
  unsavedWarning?: string;
} | null>(null);

function useForm() {
  const context = useContext(FormContext);
  if (!context) throw new Error("Profile fields must be inside a ProfileForm");
  return context;
}

export function errorText(error: FieldError, t: ProfileCopy) {
  if (error.code === "tooLong") return format(t.errors.tooLong, { max: error.max });
  if (error.code === "platform")
    return format(t.errors.platform, { channel: t.channels[error.channel] });
  return t.errors[error.code];
}

/**
 * A profile form posting to a server action. Values stay in the fields when the action returns errors (it is
 * dispatched by hand, so React does not reset the form), and focus moves to the first invalid field.
 * `syncLocale` switches the page language as well when the form chooses one (the welcome step).
 * `unsavedWarning` asks before leaving with changes that are not saved (PRF-02): the browser's own prompt on
 * reload or close, and this text on the form's Cancel link.
 */
export function ProfileForm({
  action,
  t,
  children,
  className,
  syncLocale = false,
  unsavedWarning,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  t: ProfileCopy;
  children: ReactNode;
  className?: string;
  syncLocale?: boolean;
  unsavedWarning?: string;
}) {
  const [state, dispatch, pending] = useActionState(
    async (previous: FormState, data: FormData) => {
      const result = await action(previous, data);
      if (result.next) return leaveTo(result.next);
      return result;
    },
    { errors: {} },
  );
  const { setLocale } = useLanguage();
  const form = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!unsavedWarning || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!submitting.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, unsavedWarning]);

  useEffect(() => {
    submitting.current = false;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus();
  }, [state]);

  return (
    <FormContext
      value={{ errors: state.errors, failed: state.failed, t, pending, dirty, unsavedWarning }}
    >
      <form
        ref={form}
        className={className}
        action={dispatch}
        noValidate
        onChange={() => setDirty(true)}
        onSubmit={(event) => {
          submitting.current = true;
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const locale = data.get("locale");
          if (syncLocale && (locale === "en" || locale === "fr")) setLocale(locale);
          startTransition(() => dispatch(data));
        }}
      >
        {children}
      </form>
    </FormContext>
  );
}

/** Shown where the page puts it when the save itself failed (not a field error). */
export function FormAlert() {
  const { failed, t } = useForm();
  return failed ? (
    <p
      className="flex items-start gap-2 rounded-md bg-destructive-soft px-3.5 py-3 text-base font-semibold text-destructive-hover outline-none"
      role="alert"
      tabIndex={-1}
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {failed === "forbidden"
        ? t.errors.forbidden
        : failed === "reauth"
          ? t.errors.reauth
          : t.errors.failed}
    </p>
  ) : null;
}

/** A field: its label, the control, then a hint and an error under it. */
export const field = "flex min-w-0 flex-col gap-2";
export const fieldLabel = "text-sm font-semibold";
export const fieldHint = "text-xs text-muted-foreground";

const subscribeNever = () => () => {};

export function SubmitButton({
  label,
  disabled = false,
  danger = false,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { pending, t } = useForm();
  // Off until React has hydrated: a submission before that is a plain form post, whose page comes back with
  // the saved values and loses what was typed.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  return (
    <Button
      type="submit"
      variant={danger ? "destructive" : "default"}
      // Blocked (the consent is not ticked yet) reads as grey, as on the canvas, rather than as a faded colour.
      className="ml-auto data-blocked:bg-border-strong data-blocked:text-muted-foreground data-blocked:opacity-100 data-blocked:shadow-none"
      data-blocked={disabled || undefined}
      loading={pending}
      disabled={!hydrated || disabled}
    >
      {pending ? t.saving : label}
    </Button>
  );
}

/** A link out of the form that asks first when there are unsaved changes. */
export function CancelLink({ href, label }: { href: string; label: string }) {
  const { dirty, unsavedWarning } = useForm();
  return (
    <Button asChild variant="secondary">
      <Link
        href={href}
        onClick={(event) => {
          if (dirty && unsavedWarning && !window.confirm(unsavedWarning)) event.preventDefault();
        }}
      >
        {label}
      </Link>
    </Button>
  );
}

/** The error for a field, by the key the parser used ("first_name", "school.2"). */
export function FieldErrorText({ name, id }: { name: string; id: string }) {
  const { errors, t } = useForm();
  const error = errors[name];
  return error ? (
    <span id={id} className="text-xs font-semibold text-destructive">
      {errorText(error, t)}
    </span>
  ) : null;
}

type InputProps = {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  /** The key errors use for this field when it differs from name (repeated rows). */
  errorKey?: string;
  hint?: string;
  optional?: boolean;
  maxLength?: number;
  required?: boolean;
  type?: "text" | "email" | "tel" | "url" | "month";
  inputMode?: "numeric" | "tel" | "email" | "url";
  /** Keeps only digits as they are typed (years). */
  digits?: boolean;
  placeholder?: string;
  autoComplete?: string;
  list?: string;
};

export function TextInput({
  name,
  label,
  defaultValue,
  errorKey = name,
  hint,
  optional,
  digits,
  ...input
}: InputProps) {
  const { errors, t } = useForm();
  const id = useId();
  const invalid = Boolean(errors[errorKey]);
  return (
    <div className={field}>
      <label htmlFor={id} className={fieldLabel}>
        {label}{" "}
        {optional && <span className="font-normal text-muted-foreground">{t.optional}</span>}
      </label>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={invalid || undefined}
        aria-describedby={
          [invalid && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined
        }
        onInput={
          digits
            ? (event) => {
                event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "");
              }
            : undefined
        }
        {...input}
      />
      {hint && (
        <span id={`${id}-hint`} className={fieldHint}>
          {hint}
        </span>
      )}
      <FieldErrorText name={errorKey} id={`${id}-error`} />
    </div>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  maxLength,
  optional,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  maxLength: number;
  optional?: boolean;
}) {
  const { errors, t } = useForm();
  const id = useId();
  const [count, setCount] = useState((defaultValue ?? "").length);
  const invalid = Boolean(errors[name]);
  return (
    <div className={field}>
      <label htmlFor={id} className={fieldLabel}>
        {label}{" "}
        {optional && <span className="font-normal text-muted-foreground">{t.optional}</span>}
      </label>
      <Textarea
        id={id}
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-count${invalid ? ` ${id}-error` : ""}`}
        onChange={(event) => setCount(event.target.value.length)}
      />
      <span id={`${id}-count`} className={cn(fieldHint, "tabular-nums")}>
        {format(t.characters, { count, max: maxLength })}
      </span>
      <FieldErrorText name={name} id={`${id}-error`} />
    </div>
  );
}

export function SelectInput({
  name,
  label,
  defaultValue,
  options,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const { errors } = useForm();
  const id = useId();
  const invalid = Boolean(errors[name]);
  return (
    <div className={field}>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <NativeSelect
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      <FieldErrorText name={name} id={`${id}-error`} />
    </div>
  );
}
