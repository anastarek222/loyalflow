import { cloneElement, isValidElement } from "react";
import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/components/ui/utils";

const control = "w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-slate-950 shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-slate-500 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-slate-500";

export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const technical = type === "email" || type === "url" || type === "tel" || type === "number" || type === "password";
  return <input {...props} type={type} dir={props.dir ?? (technical ? "ltr" : undefined)} className={cn(control, "min-h-11", className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "min-h-24 py-2.5", className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(control, "min-h-11", className)} />;
}

type CheckableProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label?: ReactNode };

export function Checkbox({ className, label, id, ...props }: CheckableProps) {
  const controlId = id ?? props.name;
  return <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-800" htmlFor={controlId}><input {...props} id={controlId} type="checkbox" className={cn("size-4 rounded border-border-strong text-primary accent-[var(--lf-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lf-focus)] disabled:cursor-not-allowed", className)} />{label}</label>;
}

export function Radio({ className, label, id, ...props }: CheckableProps) {
  const controlId = id ?? props.name;
  return <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-800" htmlFor={controlId}><input {...props} id={controlId} type="radio" className={cn("size-4 border-border-strong text-primary accent-[var(--lf-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lf-focus)] disabled:cursor-not-allowed", className)} />{label}</label>;
}

export function Switch({ label, id, className, ...props }: CheckableProps) {
  const controlId = id ?? props.name;
  return <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-800" htmlFor={controlId}><input {...props} id={controlId} type="checkbox" role="switch" className={cn("peer sr-only", className)} /><span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--lf-focus)] peer-disabled:opacity-50 after:absolute after:inset-y-1 after:start-1 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5" />{label}</label>;
}

export type FieldProps = { label: ReactNode; htmlFor: string; hint?: ReactNode; error?: ReactNode; required?: boolean; children: ReactNode; className?: string; labelProps?: LabelHTMLAttributes<HTMLLabelElement> };

export function Field({ label, htmlFor, hint, error, required, children, className, labelProps }: FieldProps) {
  const descriptionId = error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined;
  const control = isValidElement(children) ? cloneElement(children, { "aria-describedby": descriptionId, "aria-invalid": error ? true : undefined } as never) : children;
  return <div className={cn("grid gap-1.5", className)}><label {...labelProps} htmlFor={htmlFor} className={cn("lf-type-label text-slate-800", labelProps?.className)}>{label}{required && <span aria-hidden="true" className="ms-1 text-danger">*</span>}</label>{control}{error ? <p id={`${htmlFor}-error`} role="alert" className="lf-type-supporting text-danger">{error}</p> : hint ? <p id={`${htmlFor}-hint`} className="lf-type-supporting text-slate-500">{hint}</p> : null}</div>;
}
