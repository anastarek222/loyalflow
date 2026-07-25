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
    <main lang="en" dir="ltr" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-foreground px-4 py-12">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-subtle/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-info-subtle/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-[var(--lf-radius-card)] border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[var(--lf-radius-card)] bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl font-black text-white">
            L
          </div>

          <h1 className="text-3xl font-bold text-white">LoyalFlow</h1>

          <p className="mt-2 text-sm text-foreground-subtle">
            Loyalty cards management
          </p>
        </div>

        {hasError && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30/20 bg-danger-subtle/10 px-4 py-4 text-sm text-danger">
            الإيميل أو كلمة المرور غير صحيحة.
          </div>
        )}

        <form action={loginAction} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-white/80"
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
              className="auth-input w-full rounded-[var(--lf-radius-input)] border border-white/10 px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white/80"
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
              className="auth-input w-full rounded-[var(--lf-radius-input)] border border-white/10 px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20/10"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-[var(--lf-radius-input)] bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-4 font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:scale-[1.01] active:scale-[0.99]"
          >
            Sign in
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-foreground-subtle">
          LoyalFlow Agency Management System
        </p>
      </section>
    </main>
  );
}
