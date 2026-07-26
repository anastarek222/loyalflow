import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorValue = params.error;

  const hasError =
    errorValue === "invalid" ||
    (Array.isArray(errorValue) && errorValue.includes("invalid"));

  return (
    <main lang="en" dir="ltr" className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary text-lg font-black text-white">L</div>

          <h1 className="text-2xl font-black text-foreground">LoyalFlow</h1>

          <p className="mt-2 text-sm text-foreground-subtle">Sign in to your workspace</p>
        </div>

        {hasError && (
          <div className="mb-5 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-medium text-danger">
            الإيميل أو كلمة المرور غير صحيحة.
          </div>
        )}

        <form action={loginAction} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              placeholder="name@example.com"
              className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="current-password"
              dir="ltr"
              placeholder="Enter your password"
              className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <button
            type="submit"
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground-subtle">
          Secure LoyalFlow workspace
        </p>
      </section>
    </main>
  );
}
