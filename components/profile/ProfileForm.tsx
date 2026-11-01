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
  type ReactNode,
} from "react";
import Link from "next/link";
import { format, type Locale, type translations } from "@/lib/i18n";
import type { Errors, FieldError } from "@/lib/profile/fields";
import { useLanguage } from "../LanguageProvider";

export type FormState = { errors: Errors; failed?: "failed" | "forbidden" | "reauth" };
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
  const [state, dispatch, pending] = useActionState(action, { errors: {} });
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
    <p className="onbAlert" role="alert" tabIndex={-1}>
      {failed === "forbidden"
        ? t.errors.forbidden
        : failed === "reauth"
          ? t.errors.reauth
          : t.errors.failed}
    </p>
  ) : null;
}

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
  return (
    <button
      className={danger ? "onbSubmit onbDanger" : "onbSubmit"}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
    >
      {pending ? t.saving : label}
    </button>
  );
}

/** A link out of the form that asks first when there are unsaved changes. */
export function CancelLink({ href, label }: { href: string; label: string }) {
  const { dirty, unsavedWarning } = useForm();
  return (
    <Link
      className="onbBack"
      href={href}
      onClick={(event) => {
        if (dirty && unsavedWarning && !window.confirm(unsavedWarning)) event.preventDefault();
      }}
    >
      {label}
    </Link>
  );
}

/** The error for a field, by the key the parser used ("first_name", "school.2"). */
export function FieldErrorText({ name, id }: { name: string; id: string }) {
  const { errors, t } = useForm();
  const error = errors[name];
  return error ? (
    <span id={id} className="onbError">
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
  type?: "text" | "email" | "tel" | "url";
  inputMode?: "numeric" | "tel" | "email" | "url";
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
  ...input
}: InputProps) {
  const { errors, t } = useForm();
  const id = useId();
  const invalid = Boolean(errors[errorKey]);
  return (
    <div className="onbField">
      <label htmlFor={id} className="onbLabel">
        {label} {optional && <small>{t.optional}</small>}
      </label>
      <input
        id={id}
        name={name}
        className="onbInput"
        defaultValue={defaultValue ?? ""}
        aria-invalid={invalid || undefined}
        aria-describedby={
          [invalid && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined
        }
        {...input}
      />
      {hint && (
        <span id={`${id}-hint`} className="onbHint">
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
    <div className="onbField">
      <label htmlFor={id} className="onbLabel">
        {label} {optional && <small>{t.optional}</small>}
      </label>
      <textarea
        id={id}
        name={name}
        rows={3}
        className="onbInput"
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-count${invalid ? ` ${id}-error` : ""}`}
        onChange={(event) => setCount(event.target.value.length)}
      />
      <span id={`${id}-count`} className="onbHint">
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
    <div className="onbField">
      <label htmlFor={id} className="onbLabel">
        {label}
      </label>
      <select
        id={id}
        name={name}
        className="onbInput"
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
      </select>
      <FieldErrorText name={name} id={`${id}-error`} />
    </div>
  );
}
