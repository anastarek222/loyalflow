import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/components/ui/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "compact" | "default" | "touch" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "border-primary bg-primary text-white hover:bg-primary-hover active:bg-primary-active",
  secondary: "border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200",
  outline: "border-border-strong bg-surface text-slate-800 hover:bg-surface-subtle",
  ghost: "border-transparent bg-transparent text-slate-700 hover:bg-surface-subtle",
  destructive: "border-danger bg-danger text-white hover:bg-red-800 active:bg-red-900",
};

const sizes: Record<ButtonSize, string> = {
  compact: "min-h-8 px-3 text-xs",
  default: "min-h-11 px-4 text-sm",
  touch: "min-h-12 px-5 text-base",
  icon: "size-11 p-0",
};

export function Button({ className, variant = "primary", size = "default", loading = false, disabled, children, ...props }: ButtonProps) {
  return <button {...props} disabled={disabled || loading} aria-disabled={disabled || loading} aria-busy={loading || undefined} className={cn("inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50", variants[variant], sizes[size], className)}>{loading && <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}{children}</button>;
}

export type IconButtonProps = Omit<ButtonProps, "children" | "size"> & { label: string; children: ReactNode };

export function IconButton({ label, children, ...props }: IconButtonProps) {
  return <Button {...props} size="icon" aria-label={label} title={props.title ?? label}>{children}</Button>;
}
